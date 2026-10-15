import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { Admin, AdminDocument } from './schemas/admin.schema.js';
import { LoginAdminDto } from './dto/login-admin.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';

export interface AdminAuthResponse {
  accessToken: string;
  admin: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AdminProfileResponse {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Admin.name)
    private readonly adminModel: Model<AdminDocument>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticates administrator credentials and returns a signed JWT.
   * Uses email normalization and constant-time-like generic rejection
   * to prevent account enumeration attacks.
   */
  async login(loginAdminDto: LoginAdminDto): Promise<AdminAuthResponse> {
    const normalizedEmail = loginAdminDto.email.trim().toLowerCase();

    // Must explicitly select passwordHash because schema defines select: false
    const admin = await this.adminModel
      .findOne({ email: normalizedEmail })
      .select('+passwordHash')
      .exec();

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginAdminDto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload: JwtPayload = {
      sub: admin._id.toString(),
      email: admin.email,
      role: 'ADMIN',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      admin: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
      },
    };
  }

  /**
   * Retrieves sanitized profile of currently authenticated administrator.
   * Strips all internal metadata and password hash.
   */
  async getProfile(adminId: string): Promise<AdminProfileResponse> {
    const admin = await this.adminModel.findById(adminId).exec();
    if (!admin) {
      throw new NotFoundException('Admin account not found');
    }

    return {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: 'ADMIN',
    };
  }
}
