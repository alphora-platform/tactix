import { Module } from '@nestjs/common';
import { AppConfigModule } from './modules/config/config.module';
import { DatabaseModule } from './modules/database/database.module';
import { RiotApiModule } from './modules/riot-api/riot-api.module';
import { DataCollectorModule } from './modules/data-collector/data-collector.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, RiotApiModule, DataCollectorModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
