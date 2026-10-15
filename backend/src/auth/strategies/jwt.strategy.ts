import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticatedAdminUser,
  JwtPayload,
} from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const secret =
      configService.get<string>('JWT_SECRET') ||
      'cream_treat_dev_secret_key_2026_qr_ordering';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedAdminUser> {
    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (payload.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Access denied: Administrator privileges required',
      );
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
