import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'debug' | 'verbose';
  context: string;
  message: string;
  source?: 'api' | 'worker';
}

const MAX_BUFFER_SIZE = 500;

@Injectable()
export class LogBufferService implements LoggerService {
  private buffer: LogEntry[] = [];
  private nextId = 1;
  readonly emitter = new EventEmitter();

  private push(
    level: LogEntry['level'],
    message: unknown,
    context?: string,
    source?: LogEntry['source']
  ) {
    const appMode = process.env.APP_MODE || 'api';
    const entry: LogEntry = {
      id: this.nextId++,
      timestamp: new Date().toISOString(),
      level,
      context: context || '',
      message:
        typeof message === 'string'
          ? message
          : message instanceof Error
          ? message.message
          : JSON.stringify(message),
      source: source ?? (appMode === 'worker' ? 'worker' : 'api'),
    };

    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
    this.buffer.push(entry);
    this.emitter.emit('log.entry', entry);

    // Also write to stdout so logs are still visible in the terminal
    const tag = `[${entry.level.toUpperCase()}]`;
    const ctx = entry.context ? `[${entry.context}] ` : '';
    process.stdout.write(`${entry.timestamp} ${tag} ${ctx}${entry.message}\n`);
  }

  /** Inject an already-formed entry from another process (e.g. worker via Redis). */
  pushExternal(entry: Omit<LogEntry, 'id'>) {
    const stored: LogEntry = { ...entry, id: this.nextId++ };
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
    this.buffer.push(stored);
    this.emitter.emit('log.entry', stored);
  }

  log(message: unknown, context?: string) {
    this.push('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.push('error', message, context);
    const stack = trace ?? (message instanceof Error ? message.stack : undefined);
    if (stack) {
      process.stderr.write(`${stack}\n`);
    }
  }

  warn(message: unknown, context?: string) {
    this.push('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.push('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.push('verbose', message, context);
  }

  setLogLevels?(levels: LogLevel[]) {
    // No-op; all levels are always captured in the buffer
  }

  getRecent(limit = 100, level?: string, context?: string): LogEntry[] {
    let entries = this.buffer;

    if (level) {
      entries = entries.filter((e) => e.level === level);
    }
    if (context) {
      entries = entries.filter((e) => e.context.toLowerCase().includes(context.toLowerCase()));
    }

    return entries.slice(-limit);
  }
}
