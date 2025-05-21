import type { Config } from 'drizzle-kit';

export type LogLevel = 'verbose' | 'info' | 'warn' | 'error' | 'silent';

export type DrizzleAssistOptions = {
  readonly configPath?: string;
  readonly logLevel?: LogLevel;
  // Allow overriding specific config values if needed in the future
  // connectionString?: string;
  // schemaPath?: string;
};

export type ResetDatabaseOptions = DrizzleAssistOptions & {
  readonly skipSchemaRecreation?: boolean;
};

export type ResolvedDbConfig = {
  readonly connectionString: string;
  readonly schemaPath: string; 
  readonly drizzleConfig: Config;
  readonly drizzleConfigFilePath: string;
  readonly projectRoot: string;
};