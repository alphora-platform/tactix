import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(@Req() req: express.Request): AuthResponseDto {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const payload = this.authService.verifyToken(token);
      return {
        puuid: payload.puuid,
        gameName: payload.gameName,
        tagLine: payload.tagLine,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
