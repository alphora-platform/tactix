import { Module } from '@nestjs/common';
import { AppConfigModule } from './modules/config/config.module';
import { DatabaseModule } from './modules/database/database.module';

@Module({
  imports: [AppConfigModule, DatabaseModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
