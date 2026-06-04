import type {EmailPayload, EmailProvider, NodemailerConfig} from '@src/interface/types';
import nodemailer from 'nodemailer';

export class NodemailerProvider implements EmailProvider {
  private mailTransporter: nodemailer.Transporter;

  constructor({host, port, auth: { user, pass }}: NodemailerConfig) {
    this.mailTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  }

  public async sendEmail(payload: EmailPayload): Promise<void> {
    const mailOptions = {
      from: payload.senderAddress,
      to: payload.recipientAddress,
      subject: payload.subject,
      text: payload.body,
    };

    await this.mailTransporter.sendMail(mailOptions);
  }
}
