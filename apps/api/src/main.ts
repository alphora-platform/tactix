import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { corsConfig } from './common/config/cors.config';
import { ConfigService } from '@nestjs/config';
import AppDataSource from './modules/database/data-source';
import cookieParser from 'cookie-parser';
import { LogBufferService } from './modules/logs/log-buffer.service';
import { Player } from './database/entities';

async function bootstrap() {
  const appMode = process.env.APP_MODE || 'api';

  if (appMode === 'migrate') {
    await AppDataSource.initialize();
    const migrations = await AppDataSource.runMigrations();
    Logger.log(`Ran ${migrations.length} migration(s) successfully`);
    await AppDataSource.destroy();
    process.exit(0);
  }

  if (appMode === 'seed-pbe') {
    const rawPuuids = process.env.SEED_PBE_PUUIDS ?? '';
    const puuids = rawPuuids
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (puuids.length === 0) {
      Logger.error('SEED_PBE_PUUIDS env var is required (comma-separated PUUIDs)');
      process.exit(1);
    }
    await AppDataSource.initialize();
    await AppDataSource.getRepository(Player)
      .createQueryBuilder()
      .insert()
      .into(Player)
      .values(
        puuids.map((puuid) => ({
          puuid,
          region: 'PBE',
          summonerName: puuid,
          tier: 'PBE_TESTER',
          lp: 0,
          wins: 0,
          losses: 0,
        }))
      )
      .orIgnore()
      .execute();
    Logger.log(`[PBE] Seeded ${puuids.length} player(s)`);
    await AppDataSource.destroy();
    process.exit(0);
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(LogBufferService));

  if (appMode === 'worker') {
    // In worker mode, we don't need to listen for incoming HTTP requests.
    // Just initialize the app to start the cron jobs and BullMQ processors.
    await app.init();
    Logger.log(`🚀 Worker process is running (No HTTP server)`);
    return;
  }

  // API or mixed mode behavior
  const configService = app.get(ConfigService);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;

  // Health check — raw Express middleware, bypasses NestJS routing/guards
  // so it works regardless of module registration or DI state.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use('/api/health', (_req: any, res: any) => res.status(200).json({ status: 'ok' }));

  // Cookie parser — required for HttpOnly JWT cookie auth
  app.use(cookieParser());

  // Global validation — enforces all DTO decorators across every endpoint
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Enable CORS
  const corsOptions = corsConfig.useFactory(configService);
  app.enableCors(corsOptions);

  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 Application API is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
