import { Providers } from '@src/enums/providers';
import type { EmailProvider } from '@src/interface/types';
import { NodemailerProvider } from '@src/providers/NodemailerProvider';
import { SendGridProvider } from '@src/providers/SendGridProvider';

const sendGrid = new SendGridProvider();
const nodemailer = new NodemailerProvider();

export const emailProviderRegistryMap: Map<Providers, EmailProvider> = new Map<
  Providers,
  EmailProvider
>([
  [Providers.SENDGRID, sendGrid],
  [Providers.NODEMAILER, nodemailer],
]);
