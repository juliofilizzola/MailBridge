import type {SQS} from "@aws-sdk/client-sqs";
import type {MailDispatcherService} from "@src/services/MailDispatcherService";

export class SqsEmailWorker {
  private sqsClient: SQS
  private queueUrl: string;
  private mailDispatcher: MailDispatcherService;
  constructor(sqsClient: SQS, queueUrl: string, mailDispatcher: MailDispatcherService) {
    this.sqsClient = sqsClient;
    this.queueUrl = queueUrl;
    this.mailDispatcher = mailDispatcher;
  }
}
