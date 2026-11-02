import sendGridClient from '@sendgrid/mail';
import { optional } from '@src/commons/validations';
import { Providers } from '@src/enums/providers';
import type { EmailProvider } from '@src/interface/types';
import { NodemailerProvider } from '@src/providers/NodemailerProvider';
import { SendGridProvider } from '@src/providers/SendGridProvider';
import nodemailer, { type Transporter } from 'nodemailer';

const createGmailTransporter = (env: NodeJS.ProcessEnv): Transporter | undefined => {
  const user = optional(env.GMAIL_USER);
  if (!user) {
    return undefined;
  }

  const clientId = optional(env.GMAIL_CLIENT_ID);
  const clientSecret = optional(env.GMAIL_CLIENT_SECRET);
  const refreshToken = optional(env.GMAIL_REFRESH_TOKEN);
  if (clientId && clientSecret && refreshToken) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { type: 'OAuth2', user, clientId, clientSecret, refreshToken },
    });
  }

  const appPassword = optional(env.GMAIL_APP_PASSWORD);
  if (appPassword) {
    return nodemailer.createTransport({ service: 'gmail', auth: { user, pass: appPassword } });
  }
  return undefined;
};

export const buildEmailProviderRegistry = (
  env: NodeJS.ProcessEnv = process.env,
): Map<Providers, EmailProvider> => {
  const registry = new Map<Providers, EmailProvider>();

  const sendGridApiKey = optional(env.SENDGRID_API_KEY);
  if (sendGridApiKey) {
    registry.set(Providers.SENDGRID, new SendGridProvider(sendGridApiKey, sendGridClient));
  }

  const smtpServer = optional(env.SMTP_SERVER);
  if (smtpServer) {
    const port = parseInt(env.SMTP_PORT || '', 10) || 587;
    const smtpTransporter = nodemailer.createTransport({
      host: smtpServer,
      port,
      secure: port === 465,
      auth: {
        user: env.SMTP_USER || '',
        pass: env.SMTP_PASSWORD || '',
      },
    });
    registry.set(Providers.NODEMAILER, new NodemailerProvider(smtpTransporter));
  }

  const gmailTransporter = createGmailTransporter(env);
  if (gmailTransporter) {
    registry.set(Providers.GMAIL, new NodemailerProvider(gmailTransporter));
  }

  return registry;
};
