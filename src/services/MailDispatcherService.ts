import { PermanentError } from '@src/commons/errors';
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
      throw new PermanentError(`Provider "${payload.targetProvider}" is not configured`);
    }

    await selectProviderInstance.sendEmail(payload.emailData);
  }
}
