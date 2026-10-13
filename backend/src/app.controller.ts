import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService, type HealthCheckResult } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return this.appService.getRoot();
  }

  @Get('health')
  getHealth(@Res({ passthrough: true }) res: Response): HealthCheckResult {
    const { isHealthy, result } = this.appService.getHealth();
    if (!isHealthy) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
