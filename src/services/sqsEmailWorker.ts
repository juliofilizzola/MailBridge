import {
  DeleteMessageCommand,
  type Message,
  ReceiveMessageCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import { MAX_NUMBER_MESSAGE, WAIT_TIME_MESSAGE } from '@src/commons/constants';
import type { SQSMessagePayload } from '@src/interface/SQS';
import type { MailDispatcherService } from '@src/services/MailDispatcherService';

export class SqsEmailWorker {
  private sqsClient: SQSClient;
  private readonly queueUrl: string;
  private mailDispatcher: MailDispatcherService;
  private isPollingActive: boolean;

  constructor(sqsClient: SQSClient, queueUrl: string, mailDispatcher: MailDispatcherService) {
    this.sqsClient = sqsClient;
    this.queueUrl = queueUrl;
    this.mailDispatcher = mailDispatcher;
    this.isPollingActive = false;
  }

  public async startPolling(): Promise<void> {
    this.isPollingActive = true;

    while (this.isPollingActive) {
      await this.processQueue();
    }
  }

  public stopPolling(): void {
    this.isPollingActive = false;
  }

  public async processQueue(): Promise<void> {
    try {
      const receiveMessageCommand = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: MAX_NUMBER_MESSAGE,
        WaitTimeSeconds: WAIT_TIME_MESSAGE,
      });

      const response = await this.sqsClient.send(receiveMessageCommand);

      if (!response.Messages) {
        return;
      }

      for (const message of response.Messages) {
        await this.processMessage(message);
      }
    } catch (error) {
      console.error('Error processing SQS queue:', error);
    }
  }

  private async processMessage(message: Message): Promise<void> {
    try {
      if (!message.Body) {
        await this.deleteMessage(message.ReceiptHandle);
        return;
      }

      const parseMessage: SQSMessagePayload = JSON.parse(message.Body);
      await this.mailDispatcher.dispatchEmail(parseMessage);
      await this.deleteMessage(message.ReceiptHandle);
    } catch (error) {
      console.error('Error processing SQS message:', error);
    }
  }

  private async deleteMessage(messageRecipeHandle: string | undefined): Promise<void> {
    if (!messageRecipeHandle) {
      return;
    }

    const deleteMessageCommand = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: messageRecipeHandle,
    });

    await this.sqsClient.send(deleteMessageCommand);
  }
}
