/**
 * CORS module configuration using NestJS ConfigService.
 *
 * This configuration provides flexible CORS setup based on environment variables,
 * with different behaviors for development and production environments.
 *
 * Features:
 * - Environment-based allowed origins from CORS_ORIGINS config
 * - Development mode auto-allows localhost origins
 * - Configurable credentials support via CORS_CREDENTIALS
 * - Preflight request caching for performance
 * - Standard security headers support
 *
 * Environment Variables:
 * - CORS_ORIGINS: Comma-separated list of allowed origins
 * - CORS_CREDENTIALS: Enable/disable credentials (default: true)
 * - NODE_ENV: Environment mode (development/staging/production)
 *
 * @type {CorsModuleAsyncOptions}
 */
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigModule, ConfigService } from '@nestjs/config';

export interface CorsModuleAsyncOptions {
  imports: ReadonlyArray<unknown>;
  inject: ReadonlyArray<unknown>;
  useFactory: (configService: ConfigService) => CorsOptions;
}

export const corsConfig: CorsModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService): CorsOptions => {
    const getAllowedOrigins = (): string[] => {
      const origins = configService.get<string>('CORS_ORIGINS', '');

      return origins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    };

    const isDevelopment = (): boolean => {
      return configService.get<string>('NODE_ENV') === 'development';
    };

    const allowedOrigins = getAllowedOrigins();

    return {
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
      ) => {
        // Always allow requests without Origin header
        // (curl, server-to-server, health checks — CORS is browser-only)
        if (!origin) {
          return callback(null, true);
        }

        if (isDevelopment() && origin.startsWith('http://localhost')) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        const errorMessage = `CORS: Origin ${origin} not allowed by CORS policy`;
        callback(new Error(errorMessage), false);
      },

      // HTTP methods allowed for CORS requests
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],

      // Headers allowed in CORS requests
      allowedHeaders: [
        'Content-Type',
        'Accept',
        'Authorization',
        'Accept-Time-Zone',
        'Accept-Language',
        'X-Requested-With',
        'X-HTTP-Method-Override',
        'Cache-Control',
        'Pragma',
        'X-Admin-Key',
      ],

      // Headers exposed to the client
      exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Per-Page', 'X-Current-Page'],

      // Enable credentials (cookies, authorization headers, TLS client certificates)
      credentials: configService.get<string>('CORS_CREDENTIALS', 'true') === 'true',

      // Status code for successful OPTIONS requests
      optionsSuccessStatus: 200,

      // Preflight cache duration (24 hours)
      maxAge: configService.get<number>('CORS_MAX_AGE', 86400),

      // Enable preflight for all routes
      preflightContinue: false,
    };
  },
};
