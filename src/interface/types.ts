export interface EmailPayload {
  senderAddress: string;
  recipientAddress: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  sendEmail(payload: EmailPayload): Promise<void>;
}
