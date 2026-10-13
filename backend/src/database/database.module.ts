import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import type { Connection } from 'mongoose';

/**
 * Sanitizes a MongoDB connection string for safe logging by masking credentials.
 */
export function sanitizeMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  } catch {
    return '[Protected Connection String]';
  }
}

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri =
          configService.get<string>('DATABASE_URL') ||
          'mongodb://localhost:27017/cream-treat';
        const logger = new Logger('DatabaseModule');

        const sanitized = sanitizeMongoUri(uri);
        logger.log(`Configuring MongoDB connection target: ${sanitized}`);

        return {
          uri,
          serverSelectionTimeoutMS: 5000,
          lazyConnection: true,
          connectionFactory: (connection: Connection) => {
            connection.on('connected', () => {
              logger.log('MongoDB connected successfully');
            });
            connection.on('error', (err: Error) => {
              logger.error(
                `MongoDB connection error: ${err.message || 'Unknown database error'}`,
              );
            });
            connection.on('disconnected', () => {
              logger.warn('MongoDB disconnected');
            });
            return connection;
          },
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
