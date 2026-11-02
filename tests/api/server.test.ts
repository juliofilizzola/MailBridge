import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { ApiKeyAuthenticator } from '@src/api/middleware/ApiKeyAuthenticator';
import { createApiServer } from '@src/api/server';
import type { SQSMessagePayload } from '@src/interface/SQS';
import type { ApiServerDependencies } from '@src/interface/types';
import { EmailRequestService } from '@src/services/EmailRequestService';
import { FixedWindowRateLimiter } from '@src/services/RateLimiter';
import { StatusCodes } from 'http-status-codes';

import { buildValidPayload } from '../helpers/fakes';

const API_KEY = 'test-api-key';

describe('API server', () => {
  const published: SQSMessagePayload[] = [];
  let baseUrl: string;
  let server: ReturnType<typeof createApiServer>;
  const publisher = {
    publish: async (payload: SQSMessagePayload) => {
      published.push(payload);
      return 'sqs-message-id';
    },
  };
  beforeEach(async () => {
    published.length = 0;
    const dependencies: ApiServerDependencies = {
      emailRequestService: new EmailRequestService(
        new ApiKeyAuthenticator([API_KEY]),
        new FixedWindowRateLimiter(3, 60),
        publisher,
      ),
      maxBodyBytes: 1024,
    };
    server = createApiServer(dependencies);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const postEmail = (body: unknown, headers: Record<string, string> = { 'x-api-key': API_KEY }) =>
    fetch(`${baseUrl}/v1/emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  it('GET /health returns ok', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, StatusCodes.OK);
  });

  it('rejects missing or wrong API key with 401', async () => {
    assert.equal((await postEmail(buildValidPayload(), {})).status, StatusCodes.UNAUTHORIZED);
    assert.equal(
      (await postEmail(buildValidPayload(), { 'x-api-key': 'wrong' })).status,
      StatusCodes.UNAUTHORIZED,
    );
    assert.equal(published.length, 0);
  });

  it('returns 422 with issues for invalid payload', async () => {
    const response = await postEmail({ targetProvider: 'sendgrid', emailData: {} });

    assert.equal(response.status, StatusCodes.UNPROCESSABLE_ENTITY);
    const body = (await response.json()) as { issues: string[] };
    assert.ok(body.issues.includes('emailData.senderAddress is required'));
    assert.equal(published.length, 0);
  });

  it('returns 400 for malformed JSON and 413 for oversized body', async () => {
    assert.equal((await postEmail('{oops')).status, StatusCodes.BAD_REQUEST);
    assert.equal((await postEmail('x'.repeat(2048))).status, StatusCodes.REQUEST_TOO_LONG);
  });

  it('returns 404 and 405 for unknown routes and methods', async () => {
    assert.equal((await fetch(`${baseUrl}/nope`)).status, StatusCodes.NOT_FOUND);
    assert.equal((await fetch(`${baseUrl}/v1/emails`)).status, StatusCodes.METHOD_NOT_ALLOWED);
  });

  it('queues a valid request (Bearer auth) and enforces the rate limit', async () => {
    const response = await postEmail(buildValidPayload(), { authorization: `Bearer ${API_KEY}` });
    assert.equal(response.status, StatusCodes.ACCEPTED);
    assert.deepEqual(await response.json(), { messageId: 'sqs-message-id', status: 'queued' });
    assert.deepEqual(published, [buildValidPayload()]);

    let lastResponse = response;
    for (let i = 0; i < 3; i += 1) {
      lastResponse = await postEmail(buildValidPayload());
    }
    assert.equal(lastResponse.status, StatusCodes.TOO_MANY_REQUESTS);
    assert.ok(Number(lastResponse.headers.get('retry-after')) > 0);
  });
});
