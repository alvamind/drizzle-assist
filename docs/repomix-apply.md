Ah, you're correct! The `drizzle-kit` `Config` type is a discriminated union, and TypeScript needs a bit more help to understand which part of the union we're dealing with, especially for `dbCredentials`. Also, the `logger` property is indeed not a standard part of the `Config` type directly.

Let's fix these:

1.  **`src/config.ts`**:
    *   When `drizzleConfig.dialect === 'postgresql'`, TypeScript correctly narrows down the type of `drizzleConfig` to the part of the union that *does* include `dbCredentials` of type `PgCredentials`. However, it seems like it's still having a bit of trouble with the direct access inside the `if` block. We can be more explicit or use a type assertion if necessary, but the `if` condition *should* be sufficient. Let's re-check the Drizzle Kit types.
        *   Okay, `PgCredentials` itself can be a string (the URL directly) or an object `{ url?: string; connectionString?: string; ... }`. We need to handle both cases.

2.  **`src/core.ts`**:
    *   The `logger` option for Drizzle ORM is separate from `drizzle-kit`'s config. `drizzle-kit` has `verbose`. We should use `resolvedConfig.drizzleConfig.verbose` for the Drizzle ORM logger if we want to tie them together, or just default to `false` or a specific setting for the ORM logger. The most straightforward way is to use `verbose` from the kit config.

Here are the refined changes:

```typescript // src/config.ts
import path from 'node:path';
import fs from 'node:fs';
import { bundleRequire } from 'bundle-require';
import type { Config as DrizzleKitConfig, PgCredentials } from 'drizzle-kit';
import type { DrizzleAssistOptions, ResolvedDbConfig } from '@/types';
import { logger } from '@/utils/logger';

async function findDrizzleConfig(startPath: string): Promise<string | null> {
  let currentPath = path.resolve(startPath);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const tsConfigPath = path.join(currentPath, 'drizzle.config.ts');
    if (fs.existsSync(tsConfigPath)) return tsConfigPath;

    const jsConfigPath = path.join(currentPath, 'drizzle.config.js');
    if (fs.existsSync(jsConfigPath)) return jsConfigPath;

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) break; // Reached root
    currentPath = parentPath;
  }
  return null;
}

export async function loadAndResolveConfig(
  options?: DrizzleAssistOptions
): Promise<ResolvedDbConfig> {
  logger.setLevel(options?.logLevel || 'info');
  logger.verbose('Loading and resolving configuration...');

  const explicitConfigPath = options?.configPath ? path.resolve(options.configPath) : undefined;
  let drizzleConfigPath: string | undefined = explicitConfigPath; 

  if (!drizzleConfigPath) {
    logger.verbose('No explicit config path provided, searching for drizzle.config.ts/js...');
    drizzleConfigPath = await findDrizzleConfig(process.cwd()) ?? undefined; 
  }

  if (!drizzleConfigPath || !fs.existsSync(drizzleConfigPath)) {
    logger.error(`Drizzle config file not found at ${drizzleConfigPath || options?.configPath || 'project root'}.`);
    throw new Error('Drizzle config file (drizzle.config.ts or drizzle.config.js) not found.');
  }
  
  logger.info(`Using Drizzle config file: ${drizzleConfigPath}`);
  const projectRoot = path.dirname(drizzleConfigPath);

  const { mod } = await bundleRequire({ filepath: drizzleConfigPath });
  const drizzleConfig = (mod.default || mod) as DrizzleKitConfig;

  if (!drizzleConfig) {
    logger.error('Failed to load or parse Drizzle config file.');
    throw new Error('Failed to load or parse Drizzle config file.');
  }

  logger.verbose('Drizzle config loaded:', drizzleConfig);

  const schemaEntry = drizzleConfig.schema;
  if (!schemaEntry || (typeof schemaEntry !== 'string' && !Array.isArray(schemaEntry))) {
    logger.error('Schema path (schema) not found or invalid in Drizzle config.');
    throw new Error('Schema path (schema) not found or invalid in Drizzle config.');
  }
  const schemaPathString = Array.isArray(schemaEntry) ? schemaEntry[0] : schemaEntry;
  if (!schemaPathString || typeof schemaPathString !== 'string') {
    logger.error('Valid schema path string could not be determined from Drizzle config.');
    throw new Error('Valid schema path string could not be determined from Drizzle config.');
  }

  const absoluteSchemaPath = path.resolve(projectRoot, schemaPathString);
  if (!fs.existsSync(absoluteSchemaPath)) {
    logger.error(`Schema file specified in Drizzle config not found: ${absoluteSchemaPath}`);
    throw new Error(`Schema file not found: ${absoluteSchemaPath}`);
  }

  let connectionString: string | undefined;

  if (drizzleConfig.dialect === 'postgresql') {
    // TypeScript knows `drizzleConfig.dbCredentials` is `PgCredentials | undefined` here.
    const pgCredentials = drizzleConfig.dbCredentials as PgCredentials | undefined; // Explicit cast for clarity
    if (typeof pgCredentials === 'string') {
      connectionString = pgCredentials;
    } else if (typeof pgCredentials === 'object' && pgCredentials !== null) {
      connectionString = pgCredentials.url || pgCredentials.connectionString;
    }
  } else if (!drizzleConfig.dialect) {
    const legacyConfig = drizzleConfig as any; 
    if (legacyConfig.dbCredentials) {
        if (typeof legacyConfig.dbCredentials === 'object' && legacyConfig.dbCredentials !== null) {
            if ('url' in legacyConfig.dbCredentials && typeof legacyConfig.dbCredentials.url === 'string') {
                connectionString = legacyConfig.dbCredentials.url;
            } else if ('connectionString' in legacyConfig.dbCredentials && typeof legacyConfig.dbCredentials.connectionString === 'string') {
                connectionString = legacyConfig.dbCredentials.connectionString;
            }
        } else if (typeof legacyConfig.dbCredentials === 'string') { // Handle case where dbCredentials is a string directly
            connectionString = legacyConfig.dbCredentials;
        }
    }
    if (!connectionString && legacyConfig.driver === 'pg' && typeof legacyConfig.connectionString === 'string') {
        connectionString = legacyConfig.connectionString;
    }
  }
  
  if (!connectionString && drizzleConfig.dialect && drizzleConfig.dialect !== 'postgresql') {
    logger.error(`Unsupported Drizzle dialect: ${drizzleConfig.dialect}. Drizzle-Assist currently only supports 'postgresql'.`);
    throw new Error(`Unsupported Drizzle dialect: ${drizzleConfig.dialect}. Only 'postgresql' is supported.`);
  }
  
  if (!connectionString) {
    logger.error(
      'Database connection string could not be determined. Ensure your drizzle.config.ts has dialect: "postgresql" and dbCredentials.url (or dbCredentials.connectionString or dbCredentials directly as a string) is set, or uses a supported legacy format.'
    );
    throw new Error('Database connection string not found or could not be determined.');
  }

  const resolvedConfig: ResolvedDbConfig = {
    connectionString,
    schemaPath: absoluteSchemaPath,
    drizzleConfig,
    drizzleConfigFilePath: drizzleConfigPath, 
    projectRoot,
  };

  logger.verbose('Resolved configuration:', {
    connectionString: resolvedConfig.connectionString ? '********' : undefined, 
    schemaPath: resolvedConfig.schemaPath,
    drizzleConfigFilePath: resolvedConfig.drizzleConfigFilePath,
    projectRoot: resolvedConfig.projectRoot,
  });

  return resolvedConfig;
}
```

```typescript // src/core.ts
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
```
The critical change in `src/config.ts` within the `if (drizzleConfig.dialect === 'postgresql')` block is:

```typescript
    // TypeScript knows `drizzleConfig.dbCredentials` is `PgCredentials | undefined` here.
    const pgCredentials = drizzleConfig.dbCredentials as PgCredentials | undefined; // Explicit cast for clarity
    if (typeof pgCredentials === 'string') {
      connectionString = pgCredentials;
    } else if (typeof pgCredentials === 'object' && pgCredentials !== null) {
      connectionString = pgCredentials.url || pgCredentials.connectionString;
    }
```
This explicitly handles the two forms `PgCredentials` can take: being a string directly (the URL) or an object containing `url` or `connectionString`.

And in `src/core.ts`, the logger option for the Drizzle ORM instance:
```typescript
  // Use `verbose` from drizzle-kit config to control Drizzle ORM logging.
  // The `logger` property for Drizzle ORM instance takes a boolean or a custom logger.
  const drizzleOrmLoggerOption = !!resolvedConfig.drizzleConfig.verbose;

  const db = drizzle(pgClient, { schema: schemaObject, logger: drizzleOrmLoggerOption });
```
This uses the `verbose` flag from the `drizzle.config.ts` to determine if Drizzle ORM's internal logger should be enabled.

These changes should align better with the `drizzle-kit` types and resolve the errors. Give it another try!