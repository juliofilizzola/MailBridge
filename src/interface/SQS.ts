import { Providers } from '@src/enums/providers';
import type { EmailPayload } from '@src/interface/types';

export interface SQSMessagePayload {
  targetProvider: Providers;
  emailData: EmailPayload;
}
