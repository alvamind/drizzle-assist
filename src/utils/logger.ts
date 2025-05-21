import type { LogLevel } from '@/types';

class Logger {
  private currentLevel: LogLevel = 'info';
  private levelMap: Record<LogLevel, number> = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    verbose: 4,
  };

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private log(level: LogLevel, ...messages: unknown[]): void {
    if (this.levelMap[level] <= this.levelMap[this.currentLevel]) {
      const prefix = `[drizzle-assist] [${level.toUpperCase()}]`;
      if (level === 'error') {
        console.error(prefix, ...messages);
      } else if (level === 'warn') {
        console.warn(prefix, ...messages);
      } else {
        console.log(prefix, ...messages);
      }
    }
  }

  verbose(...messages: unknown[]): void {
    this.log('verbose', ...messages);
  }

  info(...messages: unknown[]): void {
    this.log('info', ...messages);
  }

  warn(...messages: unknown[]): void {
    this.log('warn', ...messages);
  }

  error(...messages: unknown[]): void {
    this.log('error', ...messages);
  }
}

export const logger = new Logger();