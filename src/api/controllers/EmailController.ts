import type { IncomingMessage, ServerResponse } from 'node:http';

import { extractApiKey, readJsonBody, sendJson } from '@src/api/http';
import type { EmailRequestService } from '@src/services/EmailRequestService';
import { StatusCodes } from 'http-status-codes';

export class EmailController {
  private readonly emailRequestService: EmailRequestService;
  private readonly maxBodyBytes: number;

  constructor(emailRequestService: EmailRequestService, maxBodyBytes: number) {
    this.emailRequestService = emailRequestService;
    this.maxBodyBytes = maxBodyBytes;
  }

  public send = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const rateLimit = this.emailRequestService.authorize(extractApiKey(request));
    response.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));

    const body = await readJsonBody(request, this.maxBodyBytes);
    const queuedEmail = await this.emailRequestService.queueEmail(body);

    sendJson(response, StatusCodes.ACCEPTED, queuedEmail);
  };
}
