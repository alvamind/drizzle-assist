import type { Config } from 'drizzle-kit';

export type LogLevel = 'verbose' | 'info' | 'warn' | 'error' | 'silent';

export interface DrizzleAssistOptions {
  configPath?: string;
  logLevel?: LogLevel;
  // Allow overriding specific config values if needed in the future
  // connectionString?: string;
  // schemaPath?: string;
}

export interface ResetDatabaseOptions extends DrizzleAssistOptions {
  skipSchemaRecreation?: boolean;
}

export interface ResolvedDbConfig {
  connectionString: string;
  schemaPath: string; // Absolute path to user's schema.ts
  drizzleConfig: Config; // The loaded drizzle.config.ts content
  drizzleConfigFilePath: string; // Absolute path to the drizzle.config.ts file itself
  projectRoot: string; // Root of the project where drizzle.config.ts was found
}