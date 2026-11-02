import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiKeyAuthenticator } from '@src/api/middleware/ApiKeyAuthenticator';
import { loadConfig } from '@src/config/env';
import { FixedWindowRateLimiter } from '@src/services/RateLimiter';

describe('ApiKeyAuthenticator', () => {
  const authenticator = new ApiKeyAuthenticator(['key-a', 'key-b', '']);

  it('returns a stable id that does not expose the key', () => {
    const id = authenticator.authenticate('key-a');

    assert.ok(id);
    assert.equal(id, authenticator.authenticate('key-a'));
    assert.notEqual(id, authenticator.authenticate('key-b'));
    assert.ok(!id.includes('key-a'));
  });

  it('rejects unknown, empty and missing keys', () => {
    assert.equal(authenticator.authenticate('key-c'), null);
    assert.equal(authenticator.authenticate(''), null);
    assert.equal(authenticator.authenticate(undefined), null);
  });
});

describe('FixedWindowRateLimiter', () => {
  it('limits per key and resets after the window', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(2, 10, () => now);

    assert.equal(limiter.consume('a').allowed, true);
    assert.equal(limiter.consume('a').remaining, 0);
    const blocked = limiter.consume('a');
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 10);
    assert.equal(limiter.consume('b').allowed, true);

    now = 10_000;
    assert.equal(limiter.consume('a').allowed, true);
  });
});

describe('loadConfig', () => {
  const baseEnv = { SQS_QUEUE_URL: 'https://sqs.local/q', API_KEYS: 'a, b ,' };

  it('applies defaults and parses API keys', () => {
    const config = loadConfig(baseEnv);

    assert.equal(config.role, 'all');
    assert.deepEqual(config.api.apiKeys, ['a', 'b']);
    assert.equal(config.retry.maxReceiveAttempts, 5);
    assert.equal(config.aws.endpoint, undefined);
  });

  it('requires SQS_QUEUE_URL and API_KEYS (unless worker only)', () => {
    assert.throws(() => loadConfig({ API_KEYS: 'a' }), /SQS_QUEUE_URL/);
    assert.throws(() => loadConfig({ SQS_QUEUE_URL: 'q' }), /API_KEYS/);
    assert.doesNotThrow(() => loadConfig({ SQS_QUEUE_URL: 'q', APP_ROLE: 'worker' }));
  });

  it('rejects invalid numbers and roles', () => {
    assert.throws(() => loadConfig({ ...baseEnv, MAX_RECEIVE_ATTEMPTS: '0' }), /positive integer/);
    assert.throws(() => loadConfig({ ...baseEnv, APP_ROLE: 'cron' }), /APP_ROLE/);
  });
});
