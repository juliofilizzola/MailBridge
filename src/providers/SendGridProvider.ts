import type { MailDataRequired } from '@sendgrid/mail';
import { RETRYABLE_CLIENT_STATUS } from '@src/commons/constants';
import { PermanentError } from '@src/commons/errors';
import type { EmailPayload, EmailProvider } from '@src/interface/types';
import { StatusCodes } from 'http-status-codes';

export interface SendGridClient {
  setApiKey(apiKey: string): void;
  send(data: MailDataRequired): Promise<unknown>;
}

export class SendGridProvider implements EmailProvider {
  private readonly client: SendGridClient;

  constructor(apiKey: string, client: SendGridClient) {
    this.client = client;
    this.client.setApiKey(apiKey);
  }

  public async sendEmail(payload: EmailPayload): Promise<void> {
    const sendGridMessage: MailDataRequired = {
      from: payload.senderAddress,
      to: payload.recipientAddress,
      subject: payload.subject,
      text: payload.body,
      ...(payload.html ? { html: payload.html } : {}),
    };

    try {
      await this.client.send(sendGridMessage);
    } catch (error) {
      const status = (error as { code?: unknown }).code;
      if (
        typeof status === 'number' &&
        status >= StatusCodes.BAD_REQUEST &&
        status < StatusCodes.INTERNAL_SERVER_ERROR &&
        !RETRYABLE_CLIENT_STATUS.has(status)
      ) {
        throw new PermanentError(`SendGrid rejected the message (${status})`, { cause: error });
      }
      throw error;
    }
  }
}
