import {
  API_PORT_DEFAULT,
  MAX_RECEIVE_ATTEMPTS_DEFAULT,
  RATE_LIMIT_MAX_REQUESTS_DEFAULT,
  RATE_LIMIT_WINDOW_SECONDS_DEFAULT,
  REGION_DEFAULT,
  RETRY_BASE_DELAY_SECONDS_DEFAULT,
  RETRY_MAX_DELAY_SECONDS_DEFAULT,
} from '@src/commons/constants';
import { optional } from '@src/commons/validations';
import { AppConfig } from '@src/interface/types';

export type AppRole = 'api' | 'worker' | 'all';

const APP_ROLES: AppRole[] = ['api', 'worker', 'all'];

const positiveInt = (name: string, value: string | undefined, fallback: number): number => {
  if (optional(value) === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const role = (optional(env.APP_ROLE) ?? 'all') as AppRole;

  if (!APP_ROLES.includes(role)) {
    throw new Error(`APP_ROLE must be one of: ${APP_ROLES.join(', ')}`);
  }

  const queueUrl = optional(env.SQS_QUEUE_URL);

  if (!queueUrl) {
    throw new Error('SQS_QUEUE_URL is required');
  }

  const apiKeys = (env.API_KEYS ?? '')
    .split(',')
    .map((apiKey) => apiKey.trim())
    .filter((apiKey) => Boolean(apiKey.length));

  if (role !== 'worker' && !apiKeys.length) {
    throw new Error('API_KEYS is required when the API is enabled');
  }

  return {
    role,
    aws: {
      region: optional(env.AWS_REGION) ?? REGION_DEFAULT,
      endpoint: optional(env.AWS_ENDPOINT_URL),
    },
    sqs: {
      queueUrl,
      deadLetterQueueUrl: optional(env.SQS_DLQ_URL),
    },
    retry: {
      maxReceiveAttempts: positiveInt(
        'MAX_RECEIVE_ATTEMPTS',
        env.MAX_RECEIVE_ATTEMPTS,
        MAX_RECEIVE_ATTEMPTS_DEFAULT,
      ),
      baseDelaySeconds: positiveInt(
        'RETRY_BASE_DELAY_SECONDS',
        env.RETRY_BASE_DELAY_SECONDS,
        RETRY_BASE_DELAY_SECONDS_DEFAULT,
      ),
      maxDelaySeconds: positiveInt(
        'RETRY_MAX_DELAY_SECONDS',
        env.RETRY_MAX_DELAY_SECONDS,
        RETRY_MAX_DELAY_SECONDS_DEFAULT,
      ),
    },
    api: {
      port: positiveInt('API_PORT', env.API_PORT, API_PORT_DEFAULT),
      apiKeys,
      rateLimitMaxRequests: positiveInt(
        'RATE_LIMIT_MAX_REQUESTS',
        env.RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_MAX_REQUESTS_DEFAULT,
      ),
      rateLimitWindowSeconds: positiveInt(
        'RATE_LIMIT_WINDOW_SECONDS',
        env.RATE_LIMIT_WINDOW_SECONDS,
        RATE_LIMIT_WINDOW_SECONDS_DEFAULT,
      ),
    },
  };
};
