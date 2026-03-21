import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Simple API key guard for admin endpoints.
 * Checks the `X-Admin-Key` header against the `ADMIN_API_KEY` env var.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const headerKey = request.headers['x-admin-key'];
    const expectedKey = this.config.get<string>('ADMIN_API_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException('ADMIN_API_KEY is not configured');
    }

    if (headerKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing X-Admin-Key header');
    }

    return true;
  }
}
