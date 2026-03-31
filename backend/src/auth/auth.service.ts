import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string;
    email: string;
    name: string;
    language: string;
    isVerified: boolean;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
      },
    });

    const tokens = await this.generateTokens({ sub: user.id, email: user.email });
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User registered: ${user.email}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        language: user.language,
        isVerified: user.isVerified,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens({ sub: user.id, email: user.email });
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        language: user.language,
        isVerified: user.isVerified,
      },
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens({
      sub: stored.user.id,
      email: stored.user.email,
    });
    await this.saveRefreshToken(stored.user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async googleAuth(idToken: string): Promise<AuthResponse> {
    // Verify Google ID token
    const googlePayload = await this.verifyGoogleToken(idToken);
    if (!googlePayload || !googlePayload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { googleId: googlePayload.sub },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: googlePayload.email },
      });

      if (user) {
        // Link Google to existing account
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: googlePayload.sub, isVerified: true },
        });
      } else {
        // Create new user from Google
        user = await this.prisma.user.create({
          data: {
            email: googlePayload.email,
            name: googlePayload.name || googlePayload.email.split('@')[0],
            passwordHash: '', // No password for Google users
            googleId: googlePayload.sub,
            avatarUrl: googlePayload.picture,
            isVerified: true,
          },
        });
      }
    }

    const tokens = await this.generateTokens({ sub: user.id, email: user.email });
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        language: user.language,
        isVerified: user.isVerified,
      },
    };
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...payload }, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRY', '15m') as SignOptions['expiresIn'],
      }),
      this.jwt.signAsync({ ...payload }, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRY', '30d') as SignOptions['expiresIn'],
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        token,
        userId,
        expiresAt,
      },
    });
  }

  private async verifyGoogleToken(
    idToken: string,
  ): Promise<{ sub: string; email: string; name?: string; picture?: string } | null> {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      if (!response.ok) return null;

      const payload = await response.json();
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');

      if (clientId && payload.aud !== clientId) return null;

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    } catch {
      return null;
    }
  }
}
