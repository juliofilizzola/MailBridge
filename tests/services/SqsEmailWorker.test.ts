import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Message } from '@aws-sdk/client-sqs';
import { PermanentError } from '@src/commons/errors';
import type { SQSMessagePayload } from '@src/interface/SQS';
import type { MailDispatcherService } from '@src/services/MailDispatcherService';
import { SqsEmailWorker, type SqsEmailWorkerOptions } from '@src/services/SqsEmailWorker';

import { buildValidPayload, createFakeSqsClient, type SentCommand } from '../helpers/fakes';

const QUEUE_URL = 'https://sqs.local/queue';
const DLQ_URL = 'https://sqs.local/queue-dlq';

const defaultOptions: SqsEmailWorkerOptions = {
  queueUrl: QUEUE_URL,
  deadLetterQueueUrl: DLQ_URL,
  maxReceiveAttempts: 3,
  retryBaseDelaySeconds: 10,
  retryMaxDelaySeconds: 60,
  pollErrorDelayMs: 0,
};

const buildMessage = (body: string | undefined, receiveCount = 1): Message => ({
  MessageId: 'msg-1',
  ReceiptHandle: 'receipt-1',
  Body: body,
  Attributes: { ApproximateReceiveCount: String(receiveCount) },
});

const setup = (
  messages: Message[],
  dispatch: (payload: SQSMessagePayload) => Promise<void> = async () => {},
  options: Partial<SqsEmailWorkerOptions> = {},
) => {
  const dispatched: SQSMessagePayload[] = [];
  const { client, commands } = createFakeSqsClient((command) =>
    command.name === 'ReceiveMessageCommand' ? { Messages: messages } : {},
  );
  const dispatcher = {
    dispatchEmail: async (payload: SQSMessagePayload) => {
      dispatched.push(payload);
      await dispatch(payload);
    },
  } as unknown as MailDispatcherService;

  const worker = new SqsEmailWorker(client, dispatcher, { ...defaultOptions, ...options });
  const after = (name: string): SentCommand[] => commands.filter((c) => c.name === name);
  return { worker, commands, dispatched, after };
};

describe('SqsEmailWorker', () => {
  it('requests ApproximateReceiveCount with long polling', async () => {
    const { worker, commands } = setup([]);

    await worker.processQueue();

    assert.equal(commands[0]?.name, 'ReceiveMessageCommand');
    assert.deepEqual(commands[0]?.input.MessageSystemAttributeNames, ['ApproximateReceiveCount']);
    assert.equal(commands[0]?.input.WaitTimeSeconds, 20);
  });

  it('dispatches and deletes a valid message', async () => {
    const payload = buildValidPayload();
    const { worker, dispatched, after } = setup([buildMessage(JSON.stringify(payload))]);

    await worker.processQueue();

    assert.deepEqual(dispatched, [payload]);
    assert.deepEqual(after('DeleteMessageCommand')[0]?.input, {
      QueueUrl: QUEUE_URL,
      ReceiptHandle: 'receipt-1',
    });
    assert.equal(after('ChangeMessageVisibilityCommand').length, 0);
  });

  it('schedules a retry with exponential backoff on transient failure', async () => {
    const { worker, after } = setup(
      [buildMessage(JSON.stringify(buildValidPayload()), 2)],
      async () => {
        throw new Error('ECONNRESET');
      },
    );

    await worker.processQueue();

    assert.equal(after('DeleteMessageCommand').length, 0);
    assert.equal(after('SendMessageCommand').length, 0);
    assert.deepEqual(after('ChangeMessageVisibilityCommand')[0]?.input, {
      QueueUrl: QUEUE_URL,
      ReceiptHandle: 'receipt-1',
      VisibilityTimeout: 20,
    });
  });

  it('moves to DLQ when max attempts is reached', async () => {
    const body = JSON.stringify(buildValidPayload());
    const { worker, after } = setup([buildMessage(body, 3)], async () => {
      throw new Error('SMTP timeout');
    });

    await worker.processQueue();

    const dlqMessage = after('SendMessageCommand')[0]?.input;
    assert.equal(dlqMessage?.QueueUrl, DLQ_URL);
    assert.equal(dlqMessage?.MessageBody, body);
    assert.deepEqual((dlqMessage?.MessageAttributes as Record<string, unknown>).failureReason, {
      DataType: 'String',
      StringValue: 'max attempts reached',
    });
    assert.equal(after('DeleteMessageCommand').length, 1);
    assert.equal(after('ChangeMessageVisibilityCommand').length, 0);
  });

  it('moves permanent errors to DLQ on the first attempt', async () => {
    const { worker, after } = setup(
      [buildMessage(JSON.stringify(buildValidPayload()))],
      async () => {
        throw new PermanentError('recipient rejected');
      },
    );

    await worker.processQueue();

    assert.equal(after('SendMessageCommand').length, 1);
    assert.equal(after('DeleteMessageCommand').length, 1);
    assert.equal(after('ChangeMessageVisibilityCommand').length, 0);
  });

  it('does not dispatch invalid messages and sends them to DLQ', async () => {
    const { worker, dispatched, after } = setup([
      buildMessage('{not json'),
      buildMessage(undefined),
    ]);

    await worker.processQueue();

    assert.equal(dispatched.length, 0);
    assert.equal(after('SendMessageCommand').length, 2);
    assert.equal(after('DeleteMessageCommand').length, 2);
  });

  it('deletes poison message when no DLQ is configured', async () => {
    const { worker, after } = setup([buildMessage('{not json')], undefined, {
      deadLetterQueueUrl: undefined,
    });

    await worker.processQueue();

    assert.equal(after('SendMessageCommand').length, 0);
    assert.equal(after('DeleteMessageCommand').length, 1);
  });

  it('keeps processing the batch when one message fails', async () => {
    let calls = 0;
    const { worker, after } = setup(
      [
        buildMessage(JSON.stringify(buildValidPayload())),
        buildMessage(JSON.stringify(buildValidPayload())),
      ],
      async () => {
        calls += 1;
        if (calls === 1) throw new Error('boom');
      },
    );

    await worker.processQueue();

    assert.equal(calls, 2);
    assert.equal(after('ChangeMessageVisibilityCommand').length, 1);
    assert.equal(after('DeleteMessageCommand').length, 1);
  });

  it('returns false when SQS receive fails', async () => {
    const { client } = createFakeSqsClient(() => {
      throw new Error('SQS down');
    });
    const worker = new SqsEmailWorker(client, {} as MailDispatcherService, defaultOptions);

    assert.equal(await worker.processQueue(), false);
  });

  it('caps the backoff delay', () => {
    const { worker } = setup([]);

    assert.equal(worker.getRetryDelaySeconds(1), 10);
    assert.equal(worker.getRetryDelaySeconds(2), 20);
    assert.equal(worker.getRetryDelaySeconds(3), 40);
    assert.equal(worker.getRetryDelaySeconds(10), 60);
  });

  it('stops polling after stopPolling is called', async () => {
    const { worker } = setup([]);
    let rounds = 0;
    const originalProcessQueue = worker.processQueue.bind(worker);
    worker.processQueue = async () => {
      rounds += 1;
      if (rounds === 3) worker.stopPolling();
      return originalProcessQueue();
    };

    await worker.startPolling();

    assert.equal(rounds, 3);
  });
});
