import type { IncomingMessage, ServerResponse } from 'node:http';

import { HttpError } from '@src/commons/errors';
import { StatusCodes } from 'http-status-codes';

export const sendJson = (response: ServerResponse, statusCode: number, body: unknown): void => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
};

export const extractApiKey = (request: IncomingMessage): string | undefined => {
  const headerKey = request.headers['x-api-key'];
  if (typeof headerKey === 'string') {
    return headerKey;
  }

  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }
  return undefined;
};

export const readJsonBody = async (
  request: IncomingMessage,
  maxBodyBytes: number,
): Promise<unknown> => {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    throw new HttpError(
      StatusCodes.UNSUPPORTED_MEDIA_TYPE,
      'Content-Type must be application/json',
    );
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  for await (const chunk of request) {
    receivedBytes += (chunk as Buffer).length;
    if (receivedBytes > maxBodyBytes) {
      throw new HttpError(StatusCodes.REQUEST_TOO_LONG, `Body exceeds ${maxBodyBytes} bytes`);
    }
    chunks.push(chunk as Buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Body is not valid JSON');
  }
};
