import { SQSClient } from '@aws-sdk/client-sqs';
import { REGION_DEFAULT } from '@src/commons/constants';
import { NodemailerProvider } from '@src/providers/NodemailerProvider';
import { MailDispatcherService } from '@src/services/MailDispatcherService';
import { SqsEmailWorker } from '@src/services/sqsEmailWorker';

const awsRegion = process.env.AWS_REGION || REGION_DEFAULT;
const smtpServer = process.env.SMTP_SERVER || '';
const smtpPort = parseInt(process.env.SMTP_PORT || '', 10) || 587;
const smtpUser = process.env.SMTP_USER || '';
const smtpPassword = process.env.SMTP_PASSWORD || '';
const sqsQueueUrl = process.env.SQS_QUEUE_URL || '';

const awsSqsClientInstance = new SQSClient({
  region: awsRegion,
});

const defaultEmailProvider = new NodemailerProvider({
  host: smtpServer,
  port: smtpPort,
  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },
});

const mailDispatcherServiceInstance = new MailDispatcherService(defaultEmailProvider);
const emailWorker = new SqsEmailWorker(
  awsSqsClientInstance,
  sqsQueueUrl,
  mailDispatcherServiceInstance,
);

export const worker = async () => {
  await emailWorker.startPolling();
};
