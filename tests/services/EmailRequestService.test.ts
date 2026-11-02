import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiKeyAuthenticator } from '@src/api/middleware/ApiKeyAuthenticator';
import { RateLimitExceededError, UnauthorizedError, ValidationError } from '@src/commons/errors';
import type { SQSMessagePayload } from '@src/interface/SQS';
import { EmailRequestService } from '@src/services/EmailRequestService';
import { FixedWindowRateLimiter } from '@src/services/RateLimiter';

import { buildValidPayload } from '../helpers/fakes';

const setup = (maxRequests = 2) => {
  const published: SQSMessagePayload[] = [];
  const service = new EmailRequestService(
    new ApiKeyAuthenticator(['key']),
    new FixedWindowRateLimiter(maxRequests, 60),
    {
      publish: async (payload) => {
        published.push(payload);
        return 'message-id';
      },
    },
  );
  return { service, published };
};

describe('EmailRequestService', () => {
  it('authorizes a valid key and returns the remaining quota', () => {
    const { service } = setup();

    assert.equal(service.authorize('key').remaining, 1);
  });

  it('throws UnauthorizedError for invalid or missing key', () => {
    const { service } = setup();

    assert.throws(() => service.authorize('wrong'), UnauthorizedError);
    assert.throws(() => service.authorize(undefined), UnauthorizedError);
  });

  it('throws RateLimitExceededError with retryAfterSeconds when quota is over', () => {
    const { service } = setup(1);
    service.authorize('key');

    assert.throws(
      () => service.authorize('key'),
      (error) => error instanceof RateLimitExceededError && error.retryAfterSeconds === 60,
    );
  });

  it('validates and publishes the email', async () => {
    const { service, published } = setup();

    const result = await service.queueEmail(buildValidPayload());

    assert.deepEqual(result, { messageId: 'message-id', status: 'queued' });
    assert.deepEqual(published, [buildValidPayload()]);
  });

  it('does not publish invalid payloads', async () => {
    const { service, published } = setup();

    await assert.rejects(service.queueEmail({ targetProvider: 'x' }), ValidationError);
    assert.equal(published.length, 0);
  });
});
