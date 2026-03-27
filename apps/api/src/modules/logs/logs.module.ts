import { Global, Module } from '@nestjs/common';
import { LogBufferService } from './log-buffer.service';
import { LogsController } from './logs.controller';

@Global()
@Module({
  controllers: [LogsController],
  providers: [LogBufferService],
  exports: [LogBufferService],
})
export class LogsModule {}
