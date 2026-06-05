import { Providers } from '@src/enums/providers';
import type { SQSMessagePayload } from '@src/interface/SQS';
import type { EmailProvider } from '@src/interface/types';

export class MailDispatcherService {
  private readonly providerRegistry: Map<Providers, EmailProvider>;

  constructor(providerRegistry: Map<Providers, EmailProvider>) {
    this.providerRegistry = providerRegistry;
  }

  public async dispatchEmail(payload: SQSMessagePayload): Promise<void> {
    const selectProviderInstance = this.providerRegistry.get(payload.targetProvider);
    if (!selectProviderInstance) {
      throw new Error('Provider not found');
    }

    await selectProviderInstance.sendEmail(payload.emailData);
  }
}
