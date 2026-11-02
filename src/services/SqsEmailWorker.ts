import { setTimeout as sleep } from 'node:timers/promises';

import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  type Message,
  ReceiveMessageCommand,
  SendMessageCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import {
  MAX_NUMBER_MESSAGE,
  POLL_ERROR_DELAY_MS,
  SQS_MAX_VISIBILITY_TIMEOUT_SECONDS,
  WAIT_TIME_MESSAGE,
} from '@src/commons/constants';
import { isRetryableError } from '@src/commons/errors';
import type { MailDispatcherService } from '@src/services/MailDispatcherService';
import { parseEmailRequest } from '@src/validators/emailRequestValidator';

export interface SqsEmailWorkerOptions {
  queueUrl: string;
  deadLetterQueueUrl?: string | undefined;
  maxReceiveAttempts: number;
  retryBaseDelaySeconds: number;
  retryMaxDelaySeconds: number;
  pollErrorDelayMs?: number;
}

const MAX_ERROR_ATTRIBUTE_LENGTH = 1000;

export class SqsEmailWorker {
  private readonly sqsClient: SQSClient;
  private readonly mailDispatcher: MailDispatcherService;
  private readonly options: SqsEmailWorkerOptions;
  private isPollingActive: boolean;

  constructor(
    sqsClient: SQSClient,
    mailDispatcher: MailDispatcherService,
    options: SqsEmailWorkerOptions,
  ) {
    this.sqsClient = sqsClient;
    this.mailDispatcher = mailDispatcher;
    this.options = options;
    this.isPollingActive = false;
  }

  public async startPolling(): Promise<void> {
    this.isPollingActive = true;

    while (this.isPollingActive) {
      const succeeded = await this.processQueue();
      if (!succeeded && this.isPollingActive) {
        await sleep(this.options.pollErrorDelayMs ?? POLL_ERROR_DELAY_MS);
      }
    }
  }

  public stopPolling(): void {
    this.isPollingActive = false;
  }

  public async processQueue(): Promise<boolean> {
    let messages: Message[];
    try {
      const response = await this.sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: this.options.queueUrl,
          MaxNumberOfMessages: MAX_NUMBER_MESSAGE,
          WaitTimeSeconds: WAIT_TIME_MESSAGE,
          MessageSystemAttributeNames: ['ApproximateReceiveCount'],
        }),
      );
      messages = response.Messages ?? [];
    } catch (error) {
      console.error('Error receiving messages from SQS:', error);
      return false;
    }

    for (const message of messages) {
      await this.processMessage(message);
    }
    return true;
  }

  private async processMessage(message: Message): Promise<void> {
    try {
      const payload = parseEmailRequest(message.Body);
      await this.mailDispatcher.dispatchEmail(payload);
      await this.deleteMessage(message.ReceiptHandle);
      console.info(`Email sent (messageId=${message.MessageId})`);
    } catch (error) {
      try {
        await this.handleFailure(message, error);
      } catch (handlingError) {
        console.error(`Error handling failure (messageId=${message.MessageId}):`, handlingError);
      }
    }
  }

  private async handleFailure(message: Message, error: unknown): Promise<void> {
    const attempt = this.getReceiveCount(message);
    const retryable = isRetryableError(error);

    if (retryable && attempt < this.options.maxReceiveAttempts) {
      const delaySeconds = this.getRetryDelaySeconds(attempt);
      console.warn(
        `Email failed, retrying in ${delaySeconds}s ` +
          `(messageId=${message.MessageId}, attempt=${attempt}/${this.options.maxReceiveAttempts}):`,
        error,
      );
      await this.changeVisibility(message.ReceiptHandle, delaySeconds);
      return;
    }

    const reason = retryable ? 'max attempts reached' : 'permanent error';
    await this.moveToDeadLetterQueue(message, error, attempt, reason);
  }

  public getRetryDelaySeconds(attempt: number): number {
    const exponentialDelay = this.options.retryBaseDelaySeconds * 2 ** (attempt - 1);
    return Math.min(
      exponentialDelay,
      this.options.retryMaxDelaySeconds,
      SQS_MAX_VISIBILITY_TIMEOUT_SECONDS,
    );
  }

  private getReceiveCount(message: Message): number {
    const receiveCount = Number(message.Attributes?.ApproximateReceiveCount);
    return Number.isInteger(receiveCount) && receiveCount > 0 ? receiveCount : 1;
  }

  private async moveToDeadLetterQueue(
    message: Message,
    error: unknown,
    attempt: number,
    reason: string,
  ): Promise<void> {
    const errorMessage = (error instanceof Error ? error.message : String(error)).slice(
      0,
      MAX_ERROR_ATTRIBUTE_LENGTH,
    );

    if (!this.options.deadLetterQueueUrl) {
      console.error(
        `Email discarded, ${reason} and no DLQ configured ` +
          `(messageId=${message.MessageId}, attempt=${attempt}): ${errorMessage}`,
      );
      await this.deleteMessage(message.ReceiptHandle);
      return;
    }

    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.options.deadLetterQueueUrl,
        MessageBody: message.Body ?? '',
        MessageAttributes: {
          errorMessage: { DataType: 'String', StringValue: errorMessage || 'unknown error' },
          failureReason: { DataType: 'String', StringValue: reason },
          attempts: { DataType: 'Number', StringValue: String(attempt) },
          originalMessageId: { DataType: 'String', StringValue: message.MessageId ?? 'unknown' },
        },
      }),
    );
    await this.deleteMessage(message.ReceiptHandle);
    console.error(
      `Email moved to DLQ, ${reason} (messageId=${message.MessageId}, attempt=${attempt}): ${errorMessage}`,
    );
  }

  private async changeVisibility(
    receiptHandle: string | undefined,
    visibilityTimeout: number,
  ): Promise<void> {
    if (!receiptHandle) {
      return;
    }

    await this.sqsClient.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: this.options.queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeout,
      }),
    );
  }

  private async deleteMessage(receiptHandle: string | undefined): Promise<void> {
    if (!receiptHandle) {
      return;
    }

    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: this.options.queueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
  }
}
