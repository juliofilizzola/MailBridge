import { PermanentError } from '@src/commons/errors';
import type { EmailPayload, EmailProvider } from '@src/interface/types';
import type { SendMailOptions } from 'nodemailer';

export interface MailTransporter {
  sendMail(mailOptions: SendMailOptions): Promise<unknown>;
}

const PERMANENT_SMTP_CODES = new Set([550, 551, 552, 553]);

export class NodemailerProvider implements EmailProvider {
  private readonly mailTransporter: MailTransporter;

  constructor(mailTransporter: MailTransporter) {
    this.mailTransporter = mailTransporter;
  }

  public async sendEmail(payload: EmailPayload): Promise<void> {
    const mailOptions: SendMailOptions = {
      from: payload.senderAddress,
      to: payload.recipientAddress,
      subject: payload.subject,
      text: payload.body,
    };
    if (payload.html) {
      mailOptions.html = payload.html;
    }

    try {
      await this.mailTransporter.sendMail(mailOptions);
    } catch (error) {
      const responseCode = (error as { responseCode?: unknown }).responseCode;
      if (typeof responseCode === 'number' && PERMANENT_SMTP_CODES.has(responseCode)) {
        throw new PermanentError(`SMTP rejected the message (${responseCode})`, { cause: error });
      }
      throw error;
    }
  }
}
