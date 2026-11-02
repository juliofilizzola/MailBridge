import type { ApiKeyAuthenticator } from '@src/api/middleware/ApiKeyAuthenticator';
import { RateLimitExceededError, UnauthorizedError } from '@src/commons/errors';
import type { QueuedEmail, RateLimitResult } from '@src/interface/types';
import type { FixedWindowRateLimiter } from '@src/services/RateLimiter';
import type { EmailRequestPublisher } from '@src/services/SqsEmailPublisher';
import { validateEmailRequest } from '@src/validators/emailRequestValidator';

export class EmailRequestService {
  private readonly authenticator: ApiKeyAuthenticator;
  private readonly rateLimiter: FixedWindowRateLimiter;
  private readonly publisher: EmailRequestPublisher;

  constructor(
    authenticator: ApiKeyAuthenticator,
    rateLimiter: FixedWindowRateLimiter,
    publisher: EmailRequestPublisher,
  ) {
    this.authenticator = authenticator;
    this.rateLimiter = rateLimiter;
    this.publisher = publisher;
  }

  public authorize(apiKey: string | undefined): RateLimitResult {
    const apiKeyId = this.authenticator.authenticate(apiKey);
    if (!apiKeyId) {
      throw new UnauthorizedError();
    }

    const rateLimit = this.rateLimiter.consume(apiKeyId);
    if (!rateLimit.allowed) {
      throw new RateLimitExceededError(rateLimit.retryAfterSeconds);
    }
    return rateLimit;
  }

  public async queueEmail(body: unknown): Promise<QueuedEmail> {
    const payload = validateEmailRequest(body);
    const messageId = await this.publisher.publish(payload);
    return { messageId, status: 'queued' };
  }
}
