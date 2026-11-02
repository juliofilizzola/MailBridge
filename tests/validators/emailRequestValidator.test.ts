import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ValidationError } from '@src/commons/errors';
import { Providers } from '@src/enums/providers';
import { parseEmailRequest, validateEmailRequest } from '@src/validators/emailRequestValidator';

import { buildValidPayload } from '../helpers/fakes';

const issuesOf = (fn: () => unknown): string[] => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ValidationError);
    return error.issues;
  }
  assert.fail('expected ValidationError');
};

describe('validateEmailRequest', () => {
  it('accepts a valid payload and keeps only known fields', () => {
    const input = { ...buildValidPayload({ html: '<p>Hello</p>' }), extra: 'ignored' };

    const result = validateEmailRequest(input);

    assert.deepEqual(result, buildValidPayload({ html: '<p>Hello</p>' }));
  });

  it('accepts every registered provider', () => {
    for (const provider of Object.values(Providers)) {
      const result = validateEmailRequest({ ...buildValidPayload(), targetProvider: provider });
      assert.equal(result.targetProvider, provider);
    }
  });

  it('rejects non-object payloads', () => {
    assert.deepEqual(
      issuesOf(() => validateEmailRequest([])),
      ['payload must be a JSON object'],
    );
    assert.deepEqual(
      issuesOf(() => validateEmailRequest(null)),
      ['payload must be a JSON object'],
    );
  });

  it('rejects unknown provider', () => {
    const issues = issuesOf(() =>
      validateEmailRequest({ ...buildValidPayload(), targetProvider: 'mailgun' }),
    );
    assert.match(issues[0] ?? '', /targetProvider must be one of/);
  });

  it('reports every invalid field at once', () => {
    const issues = issuesOf(() =>
      validateEmailRequest({
        targetProvider: Providers.GMAIL,
        emailData: { senderAddress: 'not-an-email', recipientAddress: '', subject: ' ', body: 1 },
      }),
    );

    assert.deepEqual(issues, [
      'emailData.senderAddress must be a valid email address',
      'emailData.recipientAddress is required',
      'emailData.subject is required',
      'emailData.body is required',
    ]);
  });

  it('rejects line breaks in subject (header injection)', () => {
    const issues = issuesOf(() =>
      validateEmailRequest(buildValidPayload({ subject: 'Hi\r\nBcc: attacker@evil.com' })),
    );
    assert.deepEqual(issues, ['emailData.subject must not contain line breaks']);
  });

  it('rejects missing emailData', () => {
    const issues = issuesOf(() => validateEmailRequest({ targetProvider: Providers.SENDGRID }));
    assert.deepEqual(issues, ['emailData must be an object']);
  });
});

describe('parseEmailRequest', () => {
  it('parses a JSON string', () => {
    assert.deepEqual(parseEmailRequest(JSON.stringify(buildValidPayload())), buildValidPayload());
  });

  it('rejects empty body and invalid JSON', () => {
    assert.deepEqual(
      issuesOf(() => parseEmailRequest(undefined)),
      ['message body is empty'],
    );
    assert.deepEqual(
      issuesOf(() => parseEmailRequest('{oops')),
      ['message body is not valid JSON'],
    );
  });
});
