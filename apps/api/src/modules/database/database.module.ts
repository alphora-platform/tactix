import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { datasourceOption } from './data-source';
import { MaterializedViewSyncService } from '../../database/materialized-view-sync.service';

@Module({
  imports: [TypeOrmModule.forRoot(datasourceOption)],
  providers: [MaterializedViewSyncService],
  exports: [MaterializedViewSyncService],
})
export class DatabaseModule {}
