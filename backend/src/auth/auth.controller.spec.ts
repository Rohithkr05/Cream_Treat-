import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LoginAdminDto } from './dto/login-admin.dto.js';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: vi.fn(),
    getProfile: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/admin/login', () => {
    it('should delegate login to AuthService', async () => {
      const mockResponse = {
        accessToken: 'mock.token',
        admin: {
          id: '670c00000000000000000001',
          name: 'Cream Treat Admin',
          email: 'admin@creamtreat.local',
        },
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      const dto: LoginAdminDto = {
        email: 'admin@creamtreat.local',
        password: 'Admin@CreamTreat2026!',
      };

      const result = await controller.login(dto);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should validate and pass for valid LoginAdminDto', async () => {
      const validationPipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      const payload = {
        email: '  Admin@CreamTreat.LOCAL  ',
        password: 'Password123!',
      };

      const transformed = await validationPipe.transform(payload, {
        type: 'body',
        metatype: LoginAdminDto,
      });

      expect(transformed).toBeDefined();
      expect(transformed.email).toBe('admin@creamtreat.local');
    });

    it('should reject invalid email or missing password in LoginAdminDto', async () => {
      const validationPipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        validationPipe.transform(
          { email: 'not-an-email', password: 'pass' },
          { type: 'body', metatype: LoginAdminDto },
        ),
      ).rejects.toThrow();

      await expect(
        validationPipe.transform(
          { email: 'admin@example.com' },
          { type: 'body', metatype: LoginAdminDto },
        ),
      ).rejects.toThrow();
    });
  });

  describe('GET /auth/admin/me', () => {
    it('should delegate profile retrieval to AuthService with request user id', async () => {
      const mockProfile = {
        id: '670c00000000000000000001',
        name: 'Cream Treat Admin',
        email: 'admin@creamtreat.local',
        role: 'ADMIN',
      };

      mockAuthService.getProfile.mockResolvedValue(mockProfile);

      const mockReq = {
        user: {
          id: '670c00000000000000000001',
          email: 'admin@creamtreat.local',
          role: 'ADMIN',
        },
      };

      const result = await controller.getProfile(mockReq);
      expect(mockAuthService.getProfile).toHaveBeenCalledWith(
        '670c00000000000000000001',
      );
      expect(result).toEqual(mockProfile);
    });
  });

  describe('POST /auth/admin/logout', () => {
    it('should return successful logout message', async () => {
      const result = await controller.logout();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
