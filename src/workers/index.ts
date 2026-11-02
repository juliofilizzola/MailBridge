import type { Server } from 'node:http';

import { SQSClient } from '@aws-sdk/client-sqs';
import { ApiKeyAuthenticator } from '@src/api/middleware/ApiKeyAuthenticator';
import { createApiServer } from '@src/api/server';
import { AppConfig, RunningApplication } from '@src/interface/types';
import { EmailRequestService } from '@src/services/EmailRequestService';
import { MailDispatcherService } from '@src/services/MailDispatcherService';
import { FixedWindowRateLimiter } from '@src/services/RateLimiter';
import { SqsEmailPublisher } from '@src/services/SqsEmailPublisher';
import { SqsEmailWorker } from '@src/services/SqsEmailWorker';
import { buildEmailProviderRegistry } from '@src/workers/emailProviderRegistryMap';

export const startApplication = (config: AppConfig): RunningApplication => {
  const sqsClient = new SQSClient({
    region: config.aws.region,
    ...(config.aws.endpoint ? { endpoint: config.aws.endpoint } : {}),
  });

  let emailWorker: SqsEmailWorker | undefined;
  let workerDone: Promise<void> | undefined;
  let apiServer: Server | undefined;

  if (config.role !== 'api') {
    const providerRegistry = buildEmailProviderRegistry();
    if (providerRegistry.size === 0) {
      console.warn('No email provider configured; every message will fail permanently.');
    }

    emailWorker = new SqsEmailWorker(sqsClient, new MailDispatcherService(providerRegistry), {
      queueUrl: config.sqs.queueUrl,
      deadLetterQueueUrl: config.sqs.deadLetterQueueUrl,
      maxReceiveAttempts: config.retry.maxReceiveAttempts,
      retryBaseDelaySeconds: config.retry.baseDelaySeconds,
      retryMaxDelaySeconds: config.retry.maxDelaySeconds,
    });
    workerDone = emailWorker.startPolling();
    console.info(`Email worker polling ${config.sqs.queueUrl}`);
  }

  if (config.role !== 'worker') {
    const emailRequestService = new EmailRequestService(
      new ApiKeyAuthenticator(config.api.apiKeys),
      new FixedWindowRateLimiter(
        config.api.rateLimitMaxRequests,
        config.api.rateLimitWindowSeconds,
      ),
      new SqsEmailPublisher(sqsClient, config.sqs.queueUrl),
    );
    apiServer = createApiServer({ emailRequestService });
    apiServer.listen(config.api.port, () => {
      console.info(`API listening on port ${config.api.port}`);
    });
  }

  return {
    workerDone,
    shutdown: async () => {
      emailWorker?.stopPolling();
      if (apiServer) {
        const server = apiServer;
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      await workerDone;
    },
  };
};
