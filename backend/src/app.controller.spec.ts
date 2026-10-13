import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { sanitizeMongoUri } from './database/database.module.js';
import { validateEnv } from './common/config/env.validation.js';

describe('AppController & Phase 2 Foundation', () => {
  let appController: AppController;
  let mockConnection: { readyState: number };

  beforeEach(async () => {
    mockConnection = { readyState: 1 };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  describe('GET /', () => {
    it('should return API information and running status', () => {
      const response = appController.getRoot();
      expect(response).toEqual({
        message: 'Cream Treat QR Ordering API',
        status: 'running',
      });
    });
  });

  describe('GET /health', () => {
    it('should return status ok and database connected when readyState is 1', () => {
      mockConnection.readyState = 1;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const health = appController.getHealth(mockRes);

      expect(health.status).toBe('ok');
      expect(health.service).toBe('cream-treat-backend');
      expect(health.database).toBe('connected');
      expect(health.timestamp).toBeDefined();
      expect(mockRes.status).not.toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should return status error and set HTTP 503 when database is disconnected', () => {
      mockConnection.readyState = 0;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const health = appController.getHealth(mockRes);

      expect(health.status).toBe('error');
      expect(health.service).toBe('cream-treat-backend');
      expect(health.database).toBe('disconnected');
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe('Security & Sanitization', () => {
    it('should sanitize credentials from MongoDB URIs in logs', () => {
      const sensitiveUri =
        'mongodb+srv://admin_user:secretPassword123@cluster0.mongodb.net/cream-treat?retryWrites=true&w=majority';
      const sanitized = sanitizeMongoUri(sensitiveUri);

      expect(sanitized).not.toContain('secretPassword123');
      expect(sanitized).not.toContain('admin_user');
      expect(sanitized).toContain('***:***@cluster0.mongodb.net');
    });

    it('should preserve standard URIs without credentials', () => {
      const standardUri = 'mongodb://localhost:27017/cream-treat';
      const sanitized = sanitizeMongoUri(standardUri);

      expect(sanitized).toBe('mongodb://localhost:27017/cream-treat');
    });
  });

  describe('Environment Validation', () => {
    it('should validate complete environment configurations', () => {
      const validConfig = {
        PORT: 3001,
        DATABASE_URL: 'mongodb://localhost:27017/cream-treat',
        JWT_SECRET: 'test-secret-key',
        FRONTEND_URL: 'http://localhost:3000',
      };

      const result = validateEnv(validConfig);
      expect(result.PORT).toBe(3001);
      expect(result.DATABASE_URL).toBe('mongodb://localhost:27017/cream-treat');
    });

    it('should throw an error if DATABASE_URL or JWT_SECRET is missing', () => {
      const invalidConfig = {
        PORT: 3001,
      };

      expect(() => validateEnv(invalidConfig)).toThrow(
        /Environment validation failed/,
      );
    });
  });
});
