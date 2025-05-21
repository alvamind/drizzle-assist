import type { LogLevel } from '@/types';

type LoggerState = {
  readonly currentLevel: LogLevel;
};

const initialState: LoggerState = {
  currentLevel: 'info'
};

let state = initialState;

const levelMap: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  verbose: 4,
};

const setLevel = (level: LogLevel): void => {
  state = { ...state, currentLevel: level };
};

const shouldLog = (level: LogLevel): boolean => 
  levelMap[level] <= levelMap[state.currentLevel];

const formatPrefix = (level: LogLevel): string => 
  `[drizzle-assist] [${level.toUpperCase()}]`;

const log = (level: LogLevel, ...messages: unknown[]): void => {
  if (shouldLog(level)) {
    const prefix = formatPrefix(level);
    if (level === 'error') {
      console.error(prefix, ...messages);
    } else if (level === 'warn') {
      console.warn(prefix, ...messages);
    } else {
      console.log(prefix, ...messages);
    }
  }
};

const verbose = (...messages: unknown[]): void => log('verbose', ...messages);
const info = (...messages: unknown[]): void => log('info', ...messages);
const warn = (...messages: unknown[]): void => log('warn', ...messages);
const error = (...messages: unknown[]): void => log('error', ...messages);

export const logger = {
  setLevel,
  verbose,
  info,
  warn,
  error
};