import * as path from 'path';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configValidationSchema } from './config.schema';

// Resolve .env relative to the apps/api directory, not the process CWD.
const ENV_FILE = path.resolve(__dirname, '../../../../.env');

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      envFilePath: [ENV_FILE],
    }),
  ],
})
export class AppConfigModule {}
