import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { pathToFileURL } from 'node:url';
import type { DrizzleAssistOptions, ResolvedDbConfig } from '@/types';
import { loadAndResolveConfig } from '@/config';
import { logger } from '@/utils/logger';

type PostgresAction<T> = (
  pgClient: postgres.Sql, 
  config: ResolvedDbConfig
) => Promise<T>;

type DrizzleAction<T> = (
  db: PostgresJsDatabase<Record<string, any>>,
  schema: Record<string, any>,
  config: ResolvedDbConfig
) => Promise<T>;

const createPostgresClient = (connectionString: string): postgres.Sql => 
  postgres(connectionString, {
    onnotice: (notice) => logger.verbose(`Postgres notice: ${notice['message']}`), 
  });

const loadUserSchema = async (schemaPath: string): Promise<Record<string, any>> => {
  logger.verbose(`Loading user schema from: ${schemaPath}`);
  const schemaFileUrl = pathToFileURL(schemaPath).href;
  const userSchemaModule = await import(schemaFileUrl);

  const schemaObject = userSchemaModule.default || userSchemaModule.schema || userSchemaModule;
  
  if (!schemaObject || typeof schemaObject !== 'object' || Object.keys(schemaObject).length === 0) {
    logger.error(`Could not load a valid schema object from ${schemaPath}. Ensure it exports the schema correctly (e.g., export default schema_object; or export * from './tables';).`);
    throw new Error(`Could not load a valid schema object from ${schemaPath}`);
  }
  
  logger.verbose('User schema loaded successfully.');
  return schemaObject;
};

const createDrizzleInstance = (
  pgClient: postgres.Sql, 
  schema: Record<string, any>,
  verbose: boolean
): PostgresJsDatabase<Record<string, any>> => {
  logger.verbose('Initializing Drizzle ORM instance...');
  return drizzle(pgClient, { 
    schema, 
    logger: !!verbose
  });
};

// HOF for actions needing only a raw postgres client
export const executeWithPostgresClient = async <T>(
  options: DrizzleAssistOptions | undefined,
  action: PostgresAction<T>
): Promise<T> => {
  const resolvedConfig = await loadAndResolveConfig(options);
  logger.verbose('Creating postgres client...');
  
  const pgClient = createPostgresClient(resolvedConfig.connectionString);

  try {
    logger.verbose('Executing action with postgres client.');
    return await action(pgClient, resolvedConfig);
  } finally {
    logger.verbose('Closing postgres client connection.');
    await pgClient.end();
  }
};

// HOF for actions needing Drizzle ORM instance and schema
export const executeWithDrizzle = async <T>(
  options: DrizzleAssistOptions | undefined,
  action: DrizzleAction<T>
): Promise<T> => {
  const resolvedConfig = await loadAndResolveConfig(options);
  const schemaObject = await loadUserSchema(resolvedConfig.schemaPath);
  
  logger.verbose('Creating postgres client for Drizzle...');
  const pgClient = createPostgresClient(resolvedConfig.connectionString);
  
  const db = createDrizzleInstance(
    pgClient, 
    schemaObject, 
    !!resolvedConfig.drizzleConfig.verbose
  );

  try {
    logger.verbose('Executing action with Drizzle instance.');
    return await action(db, schemaObject, resolvedConfig);
  } finally {
    logger.verbose('Closing postgres client connection for Drizzle.');
    await pgClient.end();
  }
};