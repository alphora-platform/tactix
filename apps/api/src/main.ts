import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { corsConfig } from './common/config/cors.config';
import { ConfigService } from '@nestjs/config';
import AppDataSource from './modules/database/data-source';

async function bootstrap() {
  const appMode = process.env.APP_MODE || 'api';

  if (appMode === 'migrate') {
    await AppDataSource.initialize();
    const migrations = await AppDataSource.runMigrations();
    Logger.log(`Ran ${migrations.length} migration(s) successfully`);
    await AppDataSource.destroy();
    process.exit(0);
  }

  const app = await NestFactory.create(AppModule);

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

  // Enable CORS
  const corsOptions = corsConfig.useFactory(configService);
  app.enableCors(corsOptions);

  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 Application API is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
