import sgMail from '@sendgrid/mail';
import type { EmailPayload, EmailProvider } from '@src/interface/types';

export class sendGridProvider implements EmailProvider {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  public async sendEmail(payload: EmailPayload): Promise<void> {
    const sendGridMessage = {
      from: payload.senderAddress,
      to: payload.recipientAddress,
      subject: payload.subject,
      html: payload.body,
      textContent: payload.body,
    };

    await sgMail.send(sendGridMessage);
  }
}
