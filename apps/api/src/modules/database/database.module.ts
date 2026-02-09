import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { datasourceOption } from './data-source';

@Module({
  imports: [TypeOrmModule.forRoot(datasourceOption)],
})
export class DatabaseModule {}
