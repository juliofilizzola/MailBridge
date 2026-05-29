import type {EmailPayload, EmailProvider} from "@src/interface/types";
import sgMail from '@sendgrid/mail';

export class sendGridProvider implements  EmailProvider {
  constructor(apiKey: string) {
    sgMail.setApiKey(
      apiKey
    );
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
