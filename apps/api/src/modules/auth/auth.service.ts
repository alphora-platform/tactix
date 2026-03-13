import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  puuid: string;
  gameName: string;
  tagLine: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  signToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token);
  }
}
