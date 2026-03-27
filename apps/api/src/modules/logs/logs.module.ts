import { Global, Module } from '@nestjs/common';
import { LogBufferService } from './log-buffer.service';
import { LogsController } from './logs.controller';
import { RedisLogBridgeService } from './redis-log-bridge.service';

@Global()
@Module({
  controllers: [LogsController],
  providers: [LogBufferService, RedisLogBridgeService],
  exports: [LogBufferService],
})
export class LogsModule {}
