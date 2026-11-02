import { createServer, type Server } from 'node:http';

import { EmailController } from '@src/api/controllers/EmailController';
import { HealthController } from '@src/api/controllers/HealthController';
import { handleError } from '@src/api/errorHandler';
import { Router } from '@src/api/Router';
import { MAX_REQUEST_BODY_BYTES } from '@src/commons/constants';
import type { ApiServerDependencies } from '@src/interface/types';

export const createApiServer = (dependencies: ApiServerDependencies): Server => {
  const healthController = new HealthController();
  const emailController = new EmailController(
    dependencies.emailRequestService,
    dependencies.maxBodyBytes ?? MAX_REQUEST_BODY_BYTES,
  );

  const router = new Router()
    .get('/health', healthController.check)
    .post('/v1/emails', emailController.send);

  return createServer((request, response) => {
    router.handle(request, response).catch((error: unknown) => {
      handleError(error, response);
    });
  });
};
