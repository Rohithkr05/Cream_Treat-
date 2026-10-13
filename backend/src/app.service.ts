import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  service: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

@Injectable()
export class AppService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  getRoot() {
    return {
      message: 'Cream Treat QR Ordering API',
      status: 'running',
    };
  }

  getHealth(): { isHealthy: boolean; result: HealthCheckResult } {
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const isConnected = this.connection?.readyState === 1;

    return {
      isHealthy: isConnected,
      result: {
        status: isConnected ? 'ok' : 'error',
        service: 'cream-treat-backend',
        database: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
