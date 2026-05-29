import type { EmailPayload, EmailProvider } from "@src/interface/types";


export class MailDispatcherService {
  private activeEmailProvider: EmailProvider;

  constructor(emailProvider: EmailProvider) {
    this.activeEmailProvider = emailProvider;
  }

  public async dispatchEmail(payload: EmailPayload): Promise<void> {
    await this.activeEmailProvider.sendEmail(payload);
  }
}
