import { Providers } from '@src/enuns/providers';
import type { EmailPayload } from '@src/interface/types';

export interface SQSMessagePayload {
  targetProvider: Providers;
  emailData: EmailPayload;
}
