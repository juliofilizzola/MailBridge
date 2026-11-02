import type { SQSClient } from '@aws-sdk/client-sqs';
import { Providers } from '@src/enums/providers';
import type { SQSMessagePayload } from '@src/interface/SQS';

export interface SentCommand {
  name: string;
  input: Record<string, unknown>;
}

type CommandHandler = (command: SentCommand) => unknown;

export const createFakeSqsClient = (handler: CommandHandler = () => ({})) => {
  const commands: SentCommand[] = [];
  const client = {
    send: async (command: { constructor: { name: string }; input: Record<string, unknown> }) => {
      const sent = { name: command.constructor.name, input: command.input };
      commands.push(sent);
      return handler(sent);
    },
  };

  return { client: client as unknown as SQSClient, commands };
};

export const buildValidPayload = (
  overrides: Partial<SQSMessagePayload['emailData']> = {},
): SQSMessagePayload => ({
  targetProvider: Providers.SENDGRID,
  emailData: {
    senderAddress: 'no-reply@mailbridge.dev',
    recipientAddress: 'user@example.com',
    subject: 'Welcome',
    body: 'Hello!',
    ...overrides,
  },
});
