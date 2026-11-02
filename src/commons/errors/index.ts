export class PermanentError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PermanentError';
  }
}

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly details: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Invalid or missing API key') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitExceededError extends Error {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitExceededError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ValidationError extends PermanentError {
  public readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid payload: ${issues.join('; ')}`);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export const isRetryableError = (error: unknown): boolean => {
  return !(error instanceof PermanentError);
};
