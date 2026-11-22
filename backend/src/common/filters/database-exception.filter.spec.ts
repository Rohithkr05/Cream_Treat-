import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import {
  DatabaseExceptionFilter,
  isDatabaseConnectivityError,
} from './database-exception.filter.js';

describe('DatabaseExceptionFilter', () => {
  it('identifies Mongoose/MongoDB connection failures accurately', () => {
    const serverSelectionErr = new Error(
      'connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017',
    );
    serverSelectionErr.name = 'MongooseServerSelectionError';

    const bufferingErr = new Error(
      'Operation `fooditems.find()` buffering timed out after 10000ms',
    );
    bufferingErr.name = 'MongooseError';

    expect(isDatabaseConnectivityError(serverSelectionErr)).toBe(true);
    expect(isDatabaseConnectivityError(bufferingErr)).toBe(true);
    expect(isDatabaseConnectivityError(new BadRequestException('Invalid item'))).toBe(
      false,
    );
    expect(isDatabaseConnectivityError(new Error('Some generic bug'))).toBe(false);
  });

  it('responds with 503 Service Unavailable and sanitized message when database is disconnected', () => {
    const filter = new DatabaseExceptionFilter({
      httpAdapter: {
        reply: vi.fn(),
        isHeadersSent: vi.fn().mockReturnValue(false),
      },
    } as unknown as HttpAdapterHost);

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/orders' }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    const dbErr = new Error(
      'connect ECONNREFUSED 127.0.0.1:27017 with secret mongodb+srv://user:pass@host',
    );
    dbErr.name = 'MongooseServerSelectionError';

    filter.catch(dbErr, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      error: 'Service Unavailable',
      message:
        'Database service is temporarily unavailable. Please ensure MongoDB is running and try again.',
    });
  });
});

