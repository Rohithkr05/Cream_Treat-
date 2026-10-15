import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginAdminDto } from './dto/login-admin.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthenticatedAdminUser } from './interfaces/jwt-payload.interface.js';

interface RequestWithAdmin {
  user: AuthenticatedAdminUser;
}

@Controller('auth/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Public administrator login endpoint.
   * Accepts email and password, verifies credentials, and issues an access token.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginAdminDto: LoginAdminDto) {
    return this.authService.login(loginAdminDto);
  }

  /**
   * Protected administrator profile endpoint.
   * Returns authenticated admin session information.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: RequestWithAdmin) {
    return this.authService.getProfile(req.user.id);
  }

  /**
   * Administrator logout endpoint.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { message: 'Logged out successfully' };
  }
}
