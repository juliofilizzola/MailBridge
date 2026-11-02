import { StatusCodes } from 'http-status-codes';

export const MAX_NUMBER_MESSAGE = 10;
export const WAIT_TIME_MESSAGE = 20;
export const REGION_DEFAULT = 'us-east-1';
export const RETRYABLE_CLIENT_STATUS = new Set<number>([
  StatusCodes.REQUEST_TIMEOUT,
  StatusCodes.TOO_MANY_REQUESTS,
]);

export const MAX_RECEIVE_ATTEMPTS_DEFAULT = 5;
export const RETRY_BASE_DELAY_SECONDS_DEFAULT = 30;
export const RETRY_MAX_DELAY_SECONDS_DEFAULT = 900;
export const SQS_MAX_VISIBILITY_TIMEOUT_SECONDS = 43200;
export const POLL_ERROR_DELAY_MS = 5000;

export const API_PORT_DEFAULT = 3000;
export const RATE_LIMIT_MAX_REQUESTS_DEFAULT = 60;
export const RATE_LIMIT_WINDOW_SECONDS_DEFAULT = 60;
export const MAX_REQUEST_BODY_BYTES = 256 * 1024;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LINE_BREAK_REGEX = /[\r\n]/;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_SUBJECT_LENGTH = 998;
