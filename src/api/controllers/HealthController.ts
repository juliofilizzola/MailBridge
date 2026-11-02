import type { IncomingMessage, ServerResponse } from 'node:http';

import { sendJson } from '@src/api/http';
import { StatusCodes } from 'http-status-codes';

export class HealthController {
  public check = async (_request: IncomingMessage, response: ServerResponse): Promise<void> => {
    sendJson(response, StatusCodes.OK, { status: 'ok' });
  };
}
