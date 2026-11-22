import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import type { Request, Response } from 'express';
import { sanitizeMongoUri } from '../../database/database.module.js';

const DB_ERROR_NAME_PATTERNS = [
  'MongoServerSelectionError',
  'MongooseServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
  'MongoWaitQueueTimeoutError',
  'MongoExpiredSessionError',
];

const DB_ERROR_MESSAGE_PATTERNS = [
  'econnrefused',
  'client must be connected',
  'buffering timed out',
  'topology is closed',
  'server selection timed out',
  'connection timed out',
];

/**
 * Determines whether an unhandled exception indicates MongoDB is unreachable or disconnected.
 */
export function isDatabaseConnectivityError(exception: unknown): boolean {
  if (!exception || exception instanceof HttpException) {
    return false;
  }

  const visited = new Set<unknown>();
  let current: unknown = exception;

  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current);
    const errObj = current as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      cause?: unknown;
      reason?: unknown;
    };

    const name = typeof errObj.name === 'string' ? errObj.name : '';
    const message =
      typeof errObj.message === 'string' ? errObj.message.toLowerCase() : '';
    const code = typeof errObj.code === 'string' ? errObj.code.toLowerCase() : '';

    if (DB_ERROR_NAME_PATTERNS.some((pattern) => name.includes(pattern))) {
      return true;
    }

    if (
      code === 'econnrefused' ||
      DB_ERROR_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern))
    ) {
      return true;
    }

    current = errObj.cause ?? errObj.reason;
  }

  return false;
}

@Catch()
export class DatabaseExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  constructor(
    @Optional()
    @Inject(HttpAdapterHost)
    httpAdapterHost?: HttpAdapterHost,
  ) {
    super(httpAdapterHost?.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() === 'http' && isDatabaseConnectivityError(exception)) {
      const ctx = host.switchToHttp();
      const request = ctx.getRequest<Request>();
      const response = ctx.getResponse<Response>();
      const details = sanitizeMongoUri(
        exception instanceof Error ? exception.message : String(exception),
      );

      this.logger.error(
        `Database unavailable during ${request?.method ?? 'HTTP'} ${request?.url ?? ''}: ${details}`,
      );

      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        message:
          'Database service is temporarily unavailable. Please ensure MongoDB is running and try again.',
      });
      return;
    }

    if (host.getType() === 'http' && !(exception instanceof HttpException)) {
      const ctx = host.switchToHttp();
      const request = ctx.getRequest<Request>();
      const details = sanitizeMongoUri(
        exception instanceof Error ? exception.message : String(exception),
      );
      this.logger.error(
        `Unhandled error during ${request?.method ?? 'HTTP'} ${request?.url ?? ''}: ${details}`,
      );
    }

    super.catch(exception, host);
  }
}

