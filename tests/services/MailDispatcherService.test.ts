import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PermanentError } from '@src/commons/errors';
import { Providers } from '@src/enums/providers';
import type { EmailPayload, EmailProvider } from '@src/interface/types';
import { MailDispatcherService } from '@src/services/MailDispatcherService';

import { buildValidPayload } from '../helpers/fakes';

describe('MailDispatcherService', () => {
  it('routes the email to the selected provider', async () => {
    const sent: EmailPayload[] = [];
    const sendGrid: EmailProvider = { sendEmail: async (payload) => void sent.push(payload) };
    const gmail: EmailProvider = {
      sendEmail: async () => assert.fail('gmail should not be called'),
    };
    const dispatcher = new MailDispatcherService(
      new Map([
        [Providers.SENDGRID, sendGrid],
        [Providers.GMAIL, gmail],
      ]),
    );

    await dispatcher.dispatchEmail(buildValidPayload());

    assert.deepEqual(sent, [buildValidPayload().emailData]);
  });

  it('throws PermanentError when provider is not configured', async () => {
    const dispatcher = new MailDispatcherService(new Map());

    await assert.rejects(dispatcher.dispatchEmail(buildValidPayload()), PermanentError);
  });

  it('propagates provider errors', async () => {
    const failing: EmailProvider = {
      sendEmail: async () => {
        throw new Error('network');
      },
    };
    const dispatcher = new MailDispatcherService(new Map([[Providers.SENDGRID, failing]]));

    await assert.rejects(dispatcher.dispatchEmail(buildValidPayload()), /network/);
  });
});
