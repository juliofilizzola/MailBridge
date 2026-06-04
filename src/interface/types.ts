export interface EmailPayload {
  senderAddress: string;
  recipientAddress: string;
  subject: string;
  body: string;
}

export interface NodemailerConfig {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailProvider {
  sendEmail(payload: EmailPayload): Promise<void>;
}
