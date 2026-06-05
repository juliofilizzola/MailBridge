import sendGridClient from '@sendgrid/mail';
import type { EmailPayload, EmailProvider } from '@src/interface/types';

export class SendGridProvider implements EmailProvider {
  private readonly client = sendGridClient;
  constructor() {
    this.client.setApiKey(process.env.SENDGRID_API_KEY || '');
  }

  public async sendEmail(payload: EmailPayload): Promise<void> {
    const sendGridMessage = {
      from: payload.senderAddress,
      to: payload.recipientAddress,
      subject: payload.subject,
      html: payload.body,
      textContent: payload.body,
    };

    await this.client.send(sendGridMessage);
  }
}
