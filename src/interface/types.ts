import type { IncomingMessage, ServerResponse } from 'node:http';

import { AppRole } from '@src/config/env';
import type { EmailRequestService } from '@src/services/EmailRequestService';

export interface EmailPayload {
  senderAddress: string;
  recipientAddress: string;
  subject: string;
  body: string;
  html?: string;
}

export interface EmailProvider {
  sendEmail(payload: EmailPayload): Promise<void>;
}

export interface ApiServerDependencies {
  emailRequestService: EmailRequestService;
  maxBodyBytes?: number;
}

export type RouteHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;

export interface QueuedEmail {
  messageId: string;
  status: 'queued';
}

export interface RunningApplication {
  workerDone: Promise<void> | undefined;
  shutdown(): Promise<void>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface WindowState {
  windowStartMs: number;
  count: number;
}

export interface AppConfig {
  role: AppRole;
  aws: {
    region: string;
    endpoint: string | undefined;
  };
  sqs: {
    queueUrl: string;
    deadLetterQueueUrl: string | undefined;
  };
  retry: {
    maxReceiveAttempts: number;
    baseDelaySeconds: number;
    maxDelaySeconds: number;
  };
  api: {
    port: number;
    apiKeys: string[];
    rateLimitMaxRequests: number;
    rateLimitWindowSeconds: number;
  };
}
