import {
  EMAIL_REGEX,
  LINE_BREAK_REGEX,
  MAX_EMAIL_LENGTH,
  MAX_SUBJECT_LENGTH,
} from '@src/commons/constants';
import { ValidationError } from '@src/commons/errors';
import { Providers } from '@src/enums/providers';
import type { SQSMessagePayload } from '@src/interface/SQS';
import type { EmailPayload } from '@src/interface/types';

const providerValues = Object.values(Providers) as string[];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const validateEmailAddress = (field: string, value: unknown, issues: string[]): void => {
  if (typeof value !== 'string' || value.length === 0) {
    issues.push(`${field} is required`);
    return;
  }
  if (value.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(value)) {
    issues.push(`${field} must be a valid email address`);
  }
};

const validateText = (field: string, value: unknown, issues: string[]): void => {
  if (typeof value !== 'string' || !value.trim().length) {
    issues.push(`${field} is required`);
  }
};

export const validateEmailRequest = (input: unknown): SQSMessagePayload => {
  const issues: string[] = [];

  if (!isRecord(input)) {
    throw new ValidationError(['payload must be a JSON object']);
  }

  if (typeof input.targetProvider !== 'string' || !providerValues.includes(input.targetProvider)) {
    issues.push(`targetProvider must be one of: ${providerValues.join(', ')}`);
  }

  const emailData = input.emailData;
  if (!isRecord(emailData)) {
    issues.push('emailData must be an object');
    throw new ValidationError(issues);
  }

  validateEmailAddress('emailData.senderAddress', emailData.senderAddress, issues);
  validateEmailAddress('emailData.recipientAddress', emailData.recipientAddress, issues);
  validateText('emailData.subject', emailData.subject, issues);
  validateText('emailData.body', emailData.body, issues);

  if (typeof emailData.subject === 'string') {
    if (emailData.subject.length > MAX_SUBJECT_LENGTH) {
      issues.push(`emailData.subject must have at most ${MAX_SUBJECT_LENGTH} characters`);
    }
    if (LINE_BREAK_REGEX.test(emailData.subject)) {
      issues.push('emailData.subject must not contain line breaks');
    }
  }

  if (emailData.html !== undefined && typeof emailData.html !== 'string') {
    issues.push('emailData.html must be a string');
  }

  if (issues.length > 0) {
    throw new ValidationError(issues);
  }

  const validatedEmail: EmailPayload = {
    senderAddress: emailData.senderAddress as string,
    recipientAddress: emailData.recipientAddress as string,
    subject: emailData.subject as string,
    body: emailData.body as string,
  };
  if (typeof emailData.html === 'string') {
    validatedEmail.html = emailData.html;
  }

  return {
    targetProvider: input.targetProvider as Providers,
    emailData: validatedEmail,
  };
};

export const parseEmailRequest = (rawBody: string | undefined): SQSMessagePayload => {
  if (!rawBody) {
    throw new ValidationError(['message body is empty']);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new ValidationError(['message body is not valid JSON']);
  }

  return validateEmailRequest(parsed);
};
