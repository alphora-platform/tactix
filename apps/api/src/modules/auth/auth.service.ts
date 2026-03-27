import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { User } from '../../database/entities';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const COOKIE_NAME = 'access_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  async signUp(dto: SignUpDto, res: Response): Promise<AuthResponseDto> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ email: dto.email, username: dto.username, passwordHash });
    const saved = await this.userRepo.save(user);

    this.setAuthCookie(res, saved);
    return this.toDto(saved);
  }

  async signIn(dto: SignInDto, res: Response): Promise<AuthResponseDto> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    this.setAuthCookie(res, user);
    return this.toDto(user);
  }

  signOut(res: Response): void {
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }

  private setAuthCookie(res: Response, user: User): void {
    const payload: JwtPayload = { sub: user.id, email: user.email, username: user.username };
    const token = this.jwtService.sign(payload);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  }

  private toDto(user: User): AuthResponseDto {
    return { id: user.id, email: user.email, username: user.username };
  }
}
