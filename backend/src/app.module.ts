import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { validateEnv } from './common/config/env.validation.js';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter.js';
import { AuthModule } from './auth/auth.module.js';
import { MenuModule } from './menu/menu.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    MenuModule,
    OrdersModule,
    AnalyticsModule,
    InvoicesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: DatabaseExceptionFilter,
    },
  ],
})
export class AppModule {}
