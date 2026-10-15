import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (err) {
      throw err;
    }
    if (!user) {
      throw new UnauthorizedException(
        info?.message || 'Unauthorized: Missing or invalid token',
      );
    }
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Forbidden: Administrator privileges required',
      );
    }
    return user;
  }
}
