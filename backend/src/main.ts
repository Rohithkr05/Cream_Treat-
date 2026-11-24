import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global Request Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Cross-Origin Resource Sharing (CORS)
  const configuredFrontendUrl =
    configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (mobile native apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // In development, allow localhost, 127.0.0.1, and private LAN IP addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (nodeEnv !== 'production') {
        const isLocalOrLanOrTunnel =
          /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|[a-zA-Z0-9-]+\.trycloudflare\.com|[a-zA-Z0-9-]+\.ngrok(-free)?\.app)(:\d+)?$/.test(
            origin,
          );
        if (isLocalOrLanOrTunnel) {
          return callback(null, true);
        }
      }

      // Check configured FRONTEND_URL or comma-separated list
      const allowedOrigins = configuredFrontendUrl
        .split(',')
        .map((u) => u.trim().replace(/\/+$/, ''));
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`Cream Treat backend running on http://0.0.0.0:${port}`);
  logger.log(
    `Allowed CORS origin: ${configuredFrontendUrl} (plus local LAN in dev)`,
  );
}

await bootstrap();
