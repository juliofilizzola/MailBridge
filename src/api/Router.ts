import type { IncomingMessage, ServerResponse } from 'node:http';

import { HttpError } from '@src/commons/errors';
import type { RouteHandler } from '@src/interface/types';
import { StatusCodes } from 'http-status-codes';

export class Router {
  private readonly routes = new Map<string, Map<string, RouteHandler>>();

  public get(path: string, handler: RouteHandler): this {
    return this.register('GET', path, handler);
  }

  public post(path: string, handler: RouteHandler): this {
    return this.register('POST', path, handler);
  }

  public async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    const handlersByMethod = this.routes.get(path);
    if (!handlersByMethod) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Not found');
    }

    const handler = handlersByMethod.get(request.method ?? '');
    if (!handler) {
      response.setHeader('Allow', [...handlersByMethod.keys()].join(', '));
      throw new HttpError(StatusCodes.METHOD_NOT_ALLOWED, 'Method not allowed');
    }

    await handler(request, response);
  }

  private register(method: string, path: string, handler: RouteHandler): this {
    const handlersByMethod = this.routes.get(path) ?? new Map<string, RouteHandler>();
    handlersByMethod.set(method, handler);
    this.routes.set(path, handlersByMethod);
    return this;
  }
}
