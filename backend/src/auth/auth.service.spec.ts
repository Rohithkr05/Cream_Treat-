import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { Admin } from './schemas/admin.schema.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

describe('AuthService & Auth Security', () => {
  let authService: AuthService;
  let jwtStrategy: JwtStrategy;

  const mockAdminId = new Types.ObjectId('670c00000000000000000001');
  const mockPasswordHash = bcrypt.hashSync('Admin@CreamTreat2026!', 10);

  const mockAdminRecord = {
    _id: mockAdminId,
    name: 'Cream Treat Admin',
    email: 'admin@creamtreat.local',
    passwordHash: mockPasswordHash,
  };

  const mockAdminModel = {
    findOne: vi.fn(),
    findById: vi.fn(),
  };

  const mockJwtService = {
    signAsync: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test_jwt_secret_key';
      if (key === 'JWT_EXPIRES_IN') return '1d';
      return null;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtStrategy,
        {
          provide: getModelToken(Admin.name),
          useValue: mockAdminModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('Admin Login', () => {
    it('1. should succeed with valid credentials and return accessToken and sanitized admin', async () => {
      mockAdminModel.findOne.mockReturnValue({
        select: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockAdminRecord),
        }),
      });

      mockJwtService.signAsync.mockResolvedValue('signed.jwt.token');

      const result = await authService.login({
        email: 'admin@creamtreat.local',
        password: 'Admin@CreamTreat2026!',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.admin).toEqual({
        id: mockAdminId.toString(),
        name: 'Cream Treat Admin',
        email: 'admin@creamtreat.local',
      });
      // 6. Ensure passwordHash is never returned
      expect((result as any).passwordHash).toBeUndefined();
      expect((result.admin as any).passwordHash).toBeUndefined();
    });

    it('2. should reject wrong password with 401 Unauthorized', async () => {
      mockAdminModel.findOne.mockReturnValue({
        select: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockAdminRecord),
        }),
      });

      await expect(
        authService.login({
          email: 'admin@creamtreat.local',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('3. should reject unknown email with generic 401 Unauthorized', async () => {
      mockAdminModel.findOne.mockReturnValue({
        select: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        authService.login({
          email: 'unknown@example.com',
          password: 'AnyPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('4. should normalize email by trimming and converting to lowercase', async () => {
      mockAdminModel.findOne.mockReturnValue({
        select: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockAdminRecord),
        }),
      });
      mockJwtService.signAsync.mockResolvedValue('signed.jwt.token');

      await authService.login({
        email: '   Admin@CreamTreat.LOCAL   ',
        password: 'Admin@CreamTreat2026!',
      });

      expect(mockAdminModel.findOne).toHaveBeenCalledWith({
        email: 'admin@creamtreat.local',
      });
    });

    it('5. should sign JWT with correct payload (sub, email, role: ADMIN)', async () => {
      mockAdminModel.findOne.mockReturnValue({
        select: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockAdminRecord),
        }),
      });
      mockJwtService.signAsync.mockResolvedValue('signed.jwt.token');

      await authService.login({
        email: 'admin@creamtreat.local',
        password: 'Admin@CreamTreat2026!',
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockAdminId.toString(),
        email: 'admin@creamtreat.local',
        role: 'ADMIN',
      });
    });
  });

  describe('Profile & Sanitization', () => {
    it('should return sanitized profile for existing admin and throw NotFoundException otherwise', async () => {
      mockAdminModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockAdminRecord),
      });

      const profile = await authService.getProfile(mockAdminId.toString());
      expect(profile).toEqual({
        id: mockAdminId.toString(),
        name: 'Cream Treat Admin',
        email: 'admin@creamtreat.local',
        role: 'ADMIN',
      });
      expect((profile as any).passwordHash).toBeUndefined();

      mockAdminModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        authService.getProfile(new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('JwtStrategy & Role Validation', () => {
    it('7. should accept valid token payload with ADMIN role', async () => {
      const user = await jwtStrategy.validate({
        sub: mockAdminId.toString(),
        email: 'admin@creamtreat.local',
        role: 'ADMIN',
      });

      expect(user).toEqual({
        id: mockAdminId.toString(),
        email: 'admin@creamtreat.local',
        role: 'ADMIN',
      });
    });

    it('8. should reject token payload missing sub or email', async () => {
      await expect(
        jwtStrategy.validate({
          sub: '',
          email: '',
          role: 'ADMIN',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('9 & 10. should reject non-admin role with 403 Forbidden', async () => {
      await expect(
        jwtStrategy.validate({
          sub: mockAdminId.toString(),
          email: 'user@example.com',
          role: 'CUSTOMER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('JwtAuthGuard', () => {
    const guard = new JwtAuthGuard();

    it('should allow valid admin user through guard', () => {
      const user = { id: '1', email: 'admin@example.com', role: 'ADMIN' };
      expect(guard.handleRequest(null, user, null, {} as any)).toBe(user);
    });

    it('should throw UnauthorizedException when no user is provided', () => {
      expect(() =>
        guard.handleRequest(null, null, { message: 'jwt expired' }, {} as any),
      ).toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user has non-admin role', () => {
      const user = { id: '1', email: 'guest@example.com', role: 'GUEST' };
      expect(() => guard.handleRequest(null, user, null, {} as any)).toThrow(
        ForbiddenException,
      );
    });
  });
});
