import type { ServerResponse } from 'node:http';

import { sendJson } from '@src/api/http';
import {
  HttpError,
  RateLimitExceededError,
  UnauthorizedError,
  ValidationError,
} from '@src/commons/errors';
import { StatusCodes } from 'http-status-codes';

export const handleError = (error: unknown, response: ServerResponse): void => {
  if (error instanceof ValidationError) {
    sendJson(response, StatusCodes.UNPROCESSABLE_ENTITY, {
      error: 'Validation failed',
      issues: error.issues,
    });
    return;
  }

  if (error instanceof UnauthorizedError) {
    sendJson(response, StatusCodes.UNAUTHORIZED, { error: error.message });
    return;
  }

  if (error instanceof RateLimitExceededError) {
    response.setHeader('X-RateLimit-Remaining', '0');
    response.setHeader('Retry-After', String(error.retryAfterSeconds));
    sendJson(response, StatusCodes.TOO_MANY_REQUESTS, { error: error.message });
    return;
  }

  if (error instanceof HttpError) {
    if (error.statusCode === StatusCodes.REQUEST_TOO_LONG) {
      response.setHeader('Connection', 'close');
    }
    sendJson(response, error.statusCode, { error: error.message });
    return;
  }

  console.error('Unexpected API error:', error);
  sendJson(response, StatusCodes.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
};
