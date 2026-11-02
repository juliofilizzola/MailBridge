import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MailDataRequired } from '@sendgrid/mail';
import { PermanentError } from '@src/commons/errors';
import { NodemailerProvider } from '@src/providers/NodemailerProvider';
import { SendGridProvider } from '@src/providers/SendGridProvider';
import { StatusCodes } from 'http-status-codes';
import type { SendMailOptions } from 'nodemailer';

import { buildValidPayload } from '../helpers/fakes';

const withCode = (props: Record<string, unknown>): Error =>
  Object.assign(new Error('provider error'), props);

describe('SendGridProvider', () => {
  const createClient = (onSend: (data: MailDataRequired) => Promise<unknown> = async () => {}) => {
    const state: { apiKey?: string; sent: MailDataRequired[] } = { sent: [] };
    const client = {
      setApiKey: (apiKey: string) => {
        state.apiKey = apiKey;
      },
      send: async (data: MailDataRequired) => {
        state.sent.push(data);
        return onSend(data);
      },
    };
    return { client, state };
  };

  it('configures the API key and maps the payload', async () => {
    const { client, state } = createClient();
    const provider = new SendGridProvider('SG.key', client);

    await provider.sendEmail(buildValidPayload({ html: '<b>Hello!</b>' }).emailData);

    assert.equal(state.apiKey, 'SG.key');
    assert.deepEqual(state.sent[0], {
      from: 'no-reply@mailbridge.dev',
      to: 'user@example.com',
      subject: 'Welcome',
      text: 'Hello!',
      html: '<b>Hello!</b>',
    });
  });

  it('marks 4xx responses as permanent', async () => {
    const { client } = createClient(async () => {
      throw withCode({ code: StatusCodes.BAD_REQUEST });
    });

    await assert.rejects(
      new SendGridProvider('k', client).sendEmail(buildValidPayload().emailData),
      PermanentError,
    );
  });

  for (const code of [
    StatusCodes.TOO_MANY_REQUESTS,
    StatusCodes.REQUEST_TIMEOUT,
    StatusCodes.INTERNAL_SERVER_ERROR,
    StatusCodes.SERVICE_UNAVAILABLE,
  ]) {
    it(`keeps ${code} retryable`, async () => {
      const { client } = createClient(async () => {
        throw withCode({ code });
      });

      await assert.rejects(
        new SendGridProvider('k', client).sendEmail(buildValidPayload().emailData),
        (error) => !(error instanceof PermanentError),
      );
    });
  }
});

describe('NodemailerProvider', () => {
  it('maps the payload to text (and html when present)', async () => {
    const sent: SendMailOptions[] = [];
    const provider = new NodemailerProvider({ sendMail: async (options) => sent.push(options) });

    await provider.sendEmail(buildValidPayload().emailData);

    assert.deepEqual(sent[0], {
      from: 'no-reply@mailbridge.dev',
      to: 'user@example.com',
      subject: 'Welcome',
      text: 'Hello!',
    });
  });

  it('marks SMTP 550 as permanent and 421 as retryable', async () => {
    const failWith = (responseCode: number) =>
      new NodemailerProvider({
        sendMail: async () => {
          throw withCode({ responseCode });
        },
      });

    await assert.rejects(failWith(550).sendEmail(buildValidPayload().emailData), PermanentError);
    await assert.rejects(
      failWith(421).sendEmail(buildValidPayload().emailData),
      (error) => !(error instanceof PermanentError),
    );
  });
});
