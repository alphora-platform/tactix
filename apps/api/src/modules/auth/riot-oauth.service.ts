import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

interface OAuthState {
  codeVerifier: string;
  redirectUri: string;
  expires: number;
}

interface RiotTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface RiotAccountInfo {
  puuid: string;
  gameName: string;
  tagLine: string;
}

@Injectable()
export class RiotOAuthService {
  private readonly logger = new Logger(RiotOAuthService.name);
  private readonly stateMap = new Map<string, OAuthState>();

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly riotRedirectUri: string;

  private static readonly STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('RIOT_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('RIOT_CLIENT_SECRET', '');
    this.riotRedirectUri = this.configService.get<string>('RIOT_REDIRECT_URI', '');

    // Periodically clean expired states
    setInterval(() => this.cleanExpiredStates(), RiotOAuthService.CLEANUP_INTERVAL_MS);
  }

  generateAuthorizationUrl(frontendRedirectUri: string): string {
    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    this.stateMap.set(state, {
      codeVerifier,
      redirectUri: frontendRedirectUri,
      expires: Date.now() + RiotOAuthService.STATE_TTL_MS,
    });

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.riotRedirectUri,
      response_type: 'code',
      scope: 'openid',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://auth.riotgames.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForAccount(
    code: string,
    state: string,
  ): Promise<{ account: RiotAccountInfo; frontendRedirectUri: string }> {
    const stored = this.stateMap.get(state);
    if (!stored) {
      throw new UnauthorizedException('Invalid or expired state parameter');
    }

    if (Date.now() > stored.expires) {
      this.stateMap.delete(state);
      throw new UnauthorizedException('State parameter has expired');
    }

    // Remove state after use (one-time use)
    this.stateMap.delete(state);

    // Exchange code for tokens
    const tokenData = await this.exchangeCode(code, stored.codeVerifier);

    // Fetch account info using access_token
    const account = await this.fetchAccountInfo(tokenData.access_token);

    return { account, frontendRedirectUri: stored.redirectUri };
  }

  private async exchangeCode(code: string, codeVerifier: string): Promise<RiotTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.riotRedirectUri,
      code_verifier: codeVerifier,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<RiotTokenResponse>(
          'https://auth.riotgames.com/token',
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            auth: {
              username: this.clientId,
              password: this.clientSecret,
            },
            timeout: 10_000,
          },
        ),
      );

      return (response as { data: RiotTokenResponse }).data;
    } catch (error) {
      const msg = (error as { message?: string })?.message ?? 'Unknown error';
      this.logger.error(`Failed to exchange code for tokens: ${msg}`);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  private async fetchAccountInfo(accessToken: string): Promise<RiotAccountInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<RiotAccountInfo>(
          'https://americas.api.riotgames.com/riot/account/v1/accounts/me',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 10_000,
          },
        ),
      );

      return (response as { data: RiotAccountInfo }).data;
    } catch (error) {
      const msg = (error as { message?: string })?.message ?? 'Unknown error';
      this.logger.error(`Failed to fetch Riot account info: ${msg}`);
      throw new UnauthorizedException('Failed to fetch account information');
    }
  }

  private cleanExpiredStates(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of this.stateMap) {
      if (now > value.expires) {
        this.stateMap.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired OAuth states`);
    }
  }
}
