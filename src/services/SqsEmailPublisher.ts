import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import type { SQSMessagePayload } from '@src/interface/SQS';

export interface EmailRequestPublisher {
  publish(payload: SQSMessagePayload): Promise<string>;
}

export class SqsEmailPublisher implements EmailRequestPublisher {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(sqsClient: SQSClient, queueUrl: string) {
    this.sqsClient = sqsClient;
    this.queueUrl = queueUrl;
  }

  public async publish(payload: SQSMessagePayload): Promise<string> {
    const response = await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(payload),
      }),
    );

    if (!response.MessageId) {
      throw new Error('SQS did not return a MessageId');
    }
    return response.MessageId;
  }
}
