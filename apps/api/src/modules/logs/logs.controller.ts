import { Controller, Get, Query, Sse } from '@nestjs/common';
import { Observable, fromEvent, map } from 'rxjs';
import { LogBufferService, LogEntry } from './log-buffer.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('logs')
export class LogsController {
  constructor(private readonly logBuffer: LogBufferService) {}

  @Public()
  @Get('recent')
  getRecent(
    @Query('limit') limit?: string,
    @Query('level') level?: string,
    @Query('context') context?: string
  ): LogEntry[] {
    return this.logBuffer.getRecent(
      limit ? parseInt(limit, 10) : 100,
      level || undefined,
      context || undefined
    );
  }

  @Public()
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return fromEvent<LogEntry>(this.logBuffer.emitter, 'log.entry').pipe(
      map((entry) => ({ data: entry } as MessageEvent))
    );
  }
}
