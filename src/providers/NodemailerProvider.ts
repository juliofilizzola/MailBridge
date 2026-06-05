import type { EmailPayload, EmailProvider } from '@src/interface/types';
import nodemailer from 'nodemailer';

export class NodemailerProvider implements EmailProvider {
  private mailTransporter: nodemailer.Transporter;

  constructor() {
    const port = parseInt(process.env.SMTP_PORT || '', 10) || 587;
    this.mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_SERVER || '',
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SQS_QUEUE_URL || '',
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
