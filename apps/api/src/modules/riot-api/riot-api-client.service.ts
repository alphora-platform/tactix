import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RateLimiterService } from './rate-limiter.service';
import {
  RiotApiNotFoundException,
  RiotApiRateLimitException,
  RiotApiServiceUnavailableException,
} from './exceptions/riot-api.exceptions';

@Injectable()
export class RiotApiClientService {
  private readonly logger = new Logger(RiotApiClientService.name);
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rateLimiter: RateLimiterService
  ) {
    this.apiKey = this.configService.get<string>('RIOT_API_KEY', '');
  }

  async get<T>(baseUrl: string, path: string, params?: Record<string, unknown>): Promise<T> {
    await this.rateLimiter.acquire();

    const url = `${baseUrl}${path}`;
    this.logger.debug(`GET ${url}`);

    try {
      const response = (await firstValueFrom(
        this.httpService.get<T>(url, {
          headers: { 'X-Riot-Token': this.apiKey },
          params,
          timeout: 10_000,
        })
      )) as { data: T };

      return response.data;
    } catch (error) {
      return this.handleApiError(error, url);
    }
  }

  private async handleApiError(error: unknown, url: string): Promise<never> {
    const axiosError = error as {
      response?: { status?: number; headers?: Record<string, string> };
      message?: string;
    };

    const status = axiosError?.response?.status;
    const responseHeaders = axiosError?.response?.headers ?? {};

    switch (status) {
      case 404:
        throw new RiotApiNotFoundException(url);

      case 429: {
        // Extract Retry-After and propagate to Redis so all workers pause.
        const retryAfter = parseInt(responseHeaders['retry-after'] ?? '60', 10) || 60;
        await this.rateLimiter.setGlobalPause(retryAfter);
        throw new RiotApiRateLimitException(retryAfter);
      }

      case 403:
        // Invalid / expired API key — treat as "not found" so processors skip without retrying.
        this.logger.error(`Riot API 403 on ${url} — key invalid or expired. Skipping.`);
        throw new RiotApiNotFoundException(url);

      case 500:
      case 502:
      case 503:
        throw new RiotApiServiceUnavailableException();

      default:
        this.logger.error(`Riot API error: ${axiosError?.message ?? 'Unknown error'} (${url})`);
        throw new HttpException(
          `Riot API error: ${axiosError?.message ?? 'Unknown error'}`,
          status || 500
        );
    }
  }
}
