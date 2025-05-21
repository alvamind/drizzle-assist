import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { pathToFileURL } from 'node:url';
import type { DrizzleAssistOptions, ResolvedDbConfig } from '@/types';
import { loadAndResolveConfig } from '@/config';
import { logger } from '@/utils/logger';

// HOF for actions needing only a raw postgres client
export async function executeWithPostgresClient<T>(
  options: DrizzleAssistOptions | undefined,
  action: (pgClient: postgres.Sql, config: ResolvedDbConfig) => Promise<T>
): Promise<T> {
  const resolvedConfig = await loadAndResolveConfig(options);
  logger.verbose('Creating postgres client...');
  const pgClient = postgres(resolvedConfig.connectionString, {
    // max: 1, 
    onnotice: (notice) => logger.verbose(`Postgres notice: ${notice['message']}`), 
  });

  try {
    logger.verbose('Executing action with postgres client.');
    return await action(pgClient, resolvedConfig);
  } finally {
    logger.verbose('Closing postgres client connection.');
    await pgClient.end();
  }
}

// HOF for actions needing Drizzle ORM instance and schema
export async function executeWithDrizzle<T>(
  options: DrizzleAssistOptions | undefined,
  action: (
    db: PostgresJsDatabase<Record<string, any>>,
    schema: Record<string, any>,
    config: ResolvedDbConfig
  ) => Promise<T>
): Promise<T> {
  const resolvedConfig = await loadAndResolveConfig(options);
  
  logger.verbose(`Loading user schema from: ${resolvedConfig.schemaPath}`);
  const schemaFileUrl = pathToFileURL(resolvedConfig.schemaPath).href;
  const userSchemaModule = await import(schemaFileUrl);

  const schemaObject = userSchemaModule.default || userSchemaModule.schema || userSchemaModule;
  if (!schemaObject || typeof schemaObject !== 'object' || Object.keys(schemaObject).length === 0) {
    logger.error(`Could not load a valid schema object from ${resolvedConfig.schemaPath}. Ensure it exports the schema correctly (e.g., export default schema_object; or export * from './tables';).`);
    throw new Error(`Could not load a valid schema object from ${resolvedConfig.schemaPath}`);
  }
  logger.verbose('User schema loaded successfully.');

  logger.verbose('Creating postgres client for Drizzle...');
  const pgClient = postgres(resolvedConfig.connectionString, {
    // max: 1,
    onnotice: (notice) => logger.verbose(`Postgres notice: ${notice['message']}`), 
  });
  
  logger.verbose('Initializing Drizzle ORM instance...');
  // Use `verbose` from drizzle-kit config to control Drizzle ORM logging.
  // The `logger` property for Drizzle ORM instance takes a boolean or a custom logger.
  const drizzleOrmLoggerOption = !!resolvedConfig.drizzleConfig.verbose;

  const db = drizzle(pgClient, { schema: schemaObject, logger: drizzleOrmLoggerOption });


  try {
    logger.verbose('Executing action with Drizzle instance.');
    return await action(db, schemaObject, resolvedConfig);
  } finally {
    logger.verbose('Closing postgres client connection for Drizzle.');
    await pgClient.end();
  }
}