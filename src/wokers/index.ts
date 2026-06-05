import { SQSClient } from '@aws-sdk/client-sqs';
import { REGION_DEFAULT } from '@src/commons/constants';
import { MailDispatcherService } from '@src/services/MailDispatcherService';
import { SqsEmailWorker } from '@src/services/sqsEmailWorker';
import { emailProviderRegistryMap } from '@src/wokers/emailProviderRegistryMap';

const awsRegion = process.env.AWS_REGION || REGION_DEFAULT;
const sqsQueueUrl = process.env.SQS_QUEUE_URL || '';

const awsSqsClientInstance = new SQSClient({
  region: awsRegion,
});

const mailDispatcherServiceInstance = new MailDispatcherService(emailProviderRegistryMap);

const emailWorker = new SqsEmailWorker(
  awsSqsClientInstance,
  sqsQueueUrl,
  mailDispatcherServiceInstance,
);

export const worker = async (): Promise<void> => {
  await emailWorker.startPolling();
};

const handleApplicationShutdownSignal = (): void => {
  emailWorker.stopPolling();
};

export const registerGracefulShutdownListeners = (): void => {
  process.on('SIGTERM', handleApplicationShutdownSignal);
  process.on('SIGINT', handleApplicationShutdownSignal);
};
