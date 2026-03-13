import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { RiotOAuthService } from './riot-oauth.service';
import { AuthService, JwtPayload } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly riotOAuthService: RiotOAuthService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', '');
  }

  @Get('riot/login')
  login(@Query('redirect_uri') redirectUri: string, @Res() res: express.Response): void {
    if (redirectUri && !redirectUri.startsWith(this.frontendUrl)) {
      throw new BadRequestException('Invalid redirect_uri');
    }
    const frontendCallback = redirectUri || `${this.frontendUrl}/auth/callback`;
    const authUrl = this.riotOAuthService.generateAuthorizationUrl(frontendCallback);
    res.redirect(authUrl);
  }

  @Get('riot/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: express.Response
  ): Promise<void> {
    try {
      if (!code || !state) {
        throw new UnauthorizedException('Missing code or state parameter');
      }

      const { account, frontendRedirectUri } = await this.riotOAuthService.exchangeCodeForAccount(
        code,
        state
      );

      const payload: JwtPayload = {
        puuid: account.puuid,
        gameName: account.gameName,
        tagLine: account.tagLine,
      };

      const token = this.authService.signToken(payload);

      res.redirect(`${frontendRedirectUri}#token=${token}`);
    } catch (error) {
      const msg = (error as { message?: string })?.message ?? 'Authentication failed';
      this.logger.error(`OAuth callback error: ${msg}`);

      const fallbackUri = this.frontendUrl;
      res.redirect(`${fallbackUri}/auth/callback?error=${encodeURIComponent(msg)}`);
    }
  }

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
