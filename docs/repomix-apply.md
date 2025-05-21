Okay, this is an exciting project! We'll build `Drizzle-Assist`, a CLI and programmatic library for managing your Drizzle ORM setup, focusing on `reset`, `clear`, and `check` operations. It will be Bun-first and use your existing `drizzle.config.ts`.

Here's the plan:

1.  **Set up the project structure** for `drizzle-assist`.
2.  **Configuration Handling**: Implement logic to load and parse the user's `drizzle.config.ts` file. We'll use `bundle-require` for this to robustly handle TypeScript configurations.
3.  **Core Wrappers (HOFs)**: Create Higher-Order Functions to manage database connections (both raw `postgres` and Drizzle ORM instances) and configuration context for our actions.
4.  **Actions**: Refactor your existing scripts (`check.db.ts`, `clear.db.ts`, `reset.db.ts`) into modular action functions (`checkDb`, `clearDb`, `resetDb`).
5.  **CLI Interface**: Build the CLI using `commander` to expose `drizzle-assist check`, `drizzle-assist clear`, and `drizzle-assist reset` commands.
6.  **Programmatic API**: Expose the actions as functions for use in other JavaScript/TypeScript projects.
7.  **README**: Write a comprehensive `README.md` with installation, configuration, and usage instructions.

Let's start with the file structure and `package.json`.

```typescript // package.json
{
  "name": "drizzle-assist",
  "version": "0.1.0",
  "description": "CLI and programmatic toolkit for Drizzle ORM database operations: reset, clear, check.",
  "keywords": [
    "drizzle",
    "drizzle-orm",
    "database",
    "toolkit",
    "cli",
    "reset",
    "clear",
    "check",
    "postgres"
  ],
  "license": "MIT",
  "author": "Your Name <you@example.com>",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "drizzle-assist": "./dist/cli.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bunchee",
    "dev": "bunchee --watch",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write .",
    "prepublishOnly": "bun run build",
    "test": "echo \"Error: no test specified\" && exit 1",
    "da": "bun run ./src/cli.ts"
  },
  "dependencies": {
    "bundle-require": "^4.0.2", // To load drizzle.config.ts robustly
    "commander": "^12.0.0",
    "drizzle-orm": "latest", // User will have their version, but good for types
    "drizzle-seed": "^0.3.0", // For the clear command
    "postgres": "^3.4.3"
  },
  "devDependencies": {
    "@types/node": "^20.11.20",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "bunchee": "^4.6.0",
    "dotenv": "^16.4.5", // For examples/testing
    "drizzle-kit": "latest", // Expected to be in user's project for reset
    "eslint": "^8.56.0",
    "prettier": "^3.2.5",
    "typescript": "^5.3.3"
  },
  "peerDependencies": {
    "drizzle-kit": ">=0.20.0" // For reset command's schema push functionality
  },
  "engines": {
    "node": ">=18.0.0",
    "bun": ">=1.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

```typescript // tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler", // or "NodeNext"
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

```typescript // README.md
# Drizzle-Assist

[![npm version](https://badge.fury.io/js/drizzle-assist.svg)](https://badge.fury.io/js/drizzle-assist)

Drizzle-Assist is a CLI and programmatic toolkit designed to simplify common database operations for projects using [Drizzle ORM](https://orm.drizzle.team/). It helps you `check` your database's current state, `clear` all data from your tables, and `reset` your database schema.

Built with a Bun-first approach but compatible with Node.js.

## Features

-   **Check Database**: List all tables in your public schema.
-   **Clear Database**: Truncate all data from tables defined in your Drizzle schema (uses `drizzle-seed`).
-   **Reset Database**: Drop all tables in your public schema and then re-apply your schema using `drizzle-kit push`.
-   **Configuration-Driven**: Reads your existing `drizzle.config.ts` for database connection and schema path.
-   **CLI & Programmatic API**: Use it from your terminal or integrate it into your scripts.

## Prerequisites

-   Node.js (>=18.0.0) or Bun (>=1.0.0)
-   Drizzle ORM and Drizzle Kit set up in your project.
-   A `drizzle.config.ts` (or `.js`) file in your project root.

## Installation

```bash
# Using npm
npm install drizzle-assist
npm install -D drizzle-kit # If not already installed

# Using yarn
yarn add drizzle-assist
yarn add -D drizzle-kit # If not already installed

# Using pnpm
pnpm add drizzle-assist
pnpm add -D drizzle-kit # If not already installed

# Using bun
bun add drizzle-assist
bun add -D drizzle-kit # If not already installed
```

Drizzle-Assist relies on `drizzle-kit` being available in your project for the `reset` command (to push schema changes).

## Configuration

Drizzle-Assist automatically looks for a `drizzle.config.ts` (or `.js`) file in the root of your project. Ensure this file correctly specifies your `schema` path and `dbCredentials` (or `dialect: 'postgresql'` and `dbCredentials` for newer Drizzle Kit versions).

Example `drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/db/schema.ts', // Path to your Drizzle schema file
  out: './drizzle',             // Output directory for migrations
  dialect: 'postgresql',        // Specify 'postgresql'
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Your database connection string
  },
} satisfies Config;
```

Make sure your `DATABASE_URL` environment variable is set.

## CLI Usage

You can run Drizzle-Assist commands using `npx drizzle-assist <command>` or `bunx drizzle-assist <command>`.

### `check`

Displays a list of tables in the public schema of your database.

```bash
npx drizzle-assist check
```

### `clear`

Clears all data from the tables defined in your Drizzle schema. This operation uses `drizzle-seed`'s `reset` functionality under the hood, which typically truncates tables.

```bash
npx drizzle-assist clear
```

**Caution**: This command will remove all data from your tables.

### `reset`

Performs a hard reset of your database. It will:
1. Drop all tables in the `public` schema.
2. Recreate the schema by running `drizzle-kit push`.

```bash
npx drizzle-assist reset
```

Options:
  `-s, --skip-schema-recreation`: Skip the `drizzle-kit push` step after dropping tables.
  `--config <path>`: Specify a custom path to your `drizzle.config.ts` file.

```bash
npx drizzle-assist reset -s
npx drizzle-assist reset --config ./path/to/my.drizzle.config.ts
```

**Caution**: This command is destructive and will result in data loss.

## Programmatic API Usage

You can import and use Drizzle-Assist functions in your Node.js or Bun scripts.

```typescript
import { checkDatabase, clearDatabase, resetDatabase } from 'drizzle-assist';

// Optional: Define options if your config isn't at the default location
// or if you need to override something.
const options = {
  configPath: './custom-drizzle.config.ts',
};

async function main() {
  try {
    console.log('Checking database...');
    await checkDatabase(options);

    console.log('Clearing database...');
    await clearDatabase(options);

    console.log('Resetting database...');
    await resetDatabase({
      ...options,
      skipSchemaRecreation: false,
    });

    console.log('All operations completed successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();
```

### API Functions

- `checkDatabase(options?: DrizzleAssistOptions): Promise<void>`
- `clearDatabase(options?: DrizzleAssistOptions): Promise<void>`
- `resetDatabase(options?: ResetDatabaseOptions): Promise<void>`

Where `DrizzleAssistOptions` is:
```typescript
interface DrizzleAssistOptions {
  configPath?: string; // Path to drizzle.config.ts (defaults to project root)
  logLevel?: 'verbose' | 'info' | 'warn' | 'error' | 'silent'; // Default: 'info'
}

interface ResetDatabaseOptions extends DrizzleAssistOptions {
  skipSchemaRecreation?: boolean; // Default: false
}
```

## Logging
Drizzle-Assist uses a simple console logger. You can control the verbosity via the `logLevel` option in the programmatic API or potentially via a CLI flag in future versions.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## License
MIT
```

Now, let's create the source files.

```typescript // src/types.ts
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
  projectRoot: string; // Root of the project where drizzle.config.ts was found
}
```

```typescript // src/utils/logger.ts
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
```

```typescript // src/utils/exec.ts
import { spawn } from 'child_process';
import { logger } from './logger';

export function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; logPrefix?: string }
): Promise<void> {
  logger.verbose(`Executing command: ${command} ${args.join(' ')} ${options?.cwd ? `in ${options.cwd}` : ''}`);
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'pipe', // 'inherit' will show output directly, 'pipe' allows us to prefix
      shell: true, // Important for commands like 'npx' on Windows
      cwd: options?.cwd,
    });

    const prefix = options?.logPrefix || `[${command}]`;

    process.stdout?.on('data', (data) => {
      logger.info(`${prefix}: ${data.toString().trim()}`);
    });

    process.stderr?.on('data', (data) => {
      logger.error(`${prefix} (stderr): ${data.toString().trim()}`);
    });

    process.on('close', (code) => {
      if (code === 0) {
        logger.verbose(`Command "${command} ${args.join(' ')}" executed successfully.`);
        resolve();
      } else {
        logger.error(`Command "${command} ${args.join(' ')}" failed with code ${code}.`);
        reject(new Error(`${command} exited with code ${code}`));
      }
    });

    process.on('error', (err) => {
      logger.error(`Failed to start command "${command}":`, err);
      reject(err);
    });
  });
}

export async function runDrizzleKitPush(configPath?: string, projectRoot?: string): Promise<void> {
  const args = ['drizzle-kit', 'push'];
  if (configPath) {
    // drizzle-kit expects config path relative to CWD or absolute
    args.push('--config', configPath);
  }
  // npx should handle finding drizzle-kit from local node_modules or globally
  // We run it from projectRoot to ensure it picks up local drizzle-kit and config correctly
  await runCommand('npx', args, { cwd: projectRoot, logPrefix: '[drizzle-kit push]' });
}
```

```typescript // src/config.ts
import path from 'node:path';
import fs from 'node:fs';
import { bundleRequire } from 'bundle-require';
import type { Config as DrizzleKitConfig } from 'drizzle-kit';
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
  let drizzleConfigPath: string | null = explicitConfigPath;

  if (!drizzleConfigPath) {
    logger.verbose('No explicit config path provided, searching for drizzle.config.ts/js...');
    drizzleConfigPath = await findDrizzleConfig(process.cwd());
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

  const schemaPath = drizzleConfig.schema;
  if (!schemaPath || typeof schemaPath !== 'string') {
    logger.error('Schema path (schema) not found or invalid in Drizzle config.');
    throw new Error('Schema path (schema) not found or invalid in Drizzle config.');
  }
  const absoluteSchemaPath = path.resolve(projectRoot, schemaPath);
  if (!fs.existsSync(absoluteSchemaPath)) {
    logger.error(`Schema file specified in Drizzle config not found: ${absoluteSchemaPath}`);
    throw new Error(`Schema file not found: ${absoluteSchemaPath}`);
  }

  // Extract connection string
  let connectionString: string | undefined;
  if (drizzleConfig.dbCredentials && 'url' in drizzleConfig.dbCredentials) {
    connectionString = drizzleConfig.dbCredentials.url;
  } else if (drizzleConfig.dbCredentials && 'connectionString' in drizzleConfig.dbCredentials) {
    // older format or custom
    connectionString = drizzleConfig.dbCredentials.connectionString;
  }
  // Support for top-level driver and connectionString for older configs (pre-dialect)
  else if ('driver' in drizzleConfig && drizzleConfig.driver === 'pg' && 'connectionString' in drizzleConfig) {
     // @ts-expect-error legacy config
    connectionString = drizzleConfig.connectionString;
  }


  if (!connectionString) {
    logger.error('Database connection string (dbCredentials.url or dbCredentials.connectionString) not found in Drizzle config.');
    throw new Error('Database connection string not found in Drizzle config.');
  }

  // Ensure dialect is postgresql if present
  if (drizzleConfig.dialect && drizzleConfig.dialect !== 'postgresql') {
    logger.error(`Unsupported Drizzle dialect: ${drizzleConfig.dialect}. Drizzle-Assist currently only supports 'postgresql'.`);
    throw new Error(`Unsupported Drizzle dialect: ${drizzleConfig.dialect}. Only 'postgresql' is supported.`);
  }


  const resolvedConfig: ResolvedDbConfig = {
    connectionString,
    schemaPath: absoluteSchemaPath,
    drizzleConfig,
    projectRoot,
  };

  logger.verbose('Resolved configuration:', {
    connectionString: resolvedConfig.connectionString ? '********' : undefined, // Hide sensitive data
    schemaPath: resolvedConfig.schemaPath,
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
  // Note: postgres-js typically infers SSL settings from the connection string (e.g., ?sslmode=require)
  // Avoid hardcoding ssl: 'require' unless it's a specific design choice to enforce it.
  const pgClient = postgres(resolvedConfig.connectionString, {
    // max: 1, // Optional: good for CLI tools to not exhaust connections
    onnotice: (notice) => logger.verbose(`Postgres notice: ${notice.message}`),
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
  // Use pathToFileURL for robust dynamic importing, especially with Windows paths
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
    onnotice: (notice) => logger.verbose(`Postgres notice: ${notice.message}`),
  });
  
  logger.verbose('Initializing Drizzle ORM instance...');
  const db = drizzle(pgClient, { schema: schemaObject, logger: resolvedConfig.drizzleConfig.verbose });

  try {
    logger.verbose('Executing action with Drizzle instance.');
    return await action(db, schemaObject, resolvedConfig);
  } finally {
    logger.verbose('Closing postgres client connection for Drizzle.');
    await pgClient.end();
  }
}
```

```typescript // src/commands/check.ts
import type postgres from 'postgres';
import type { DrizzleAssistOptions, ResolvedDbConfig } from '@/types';
import { executeWithPostgresClient } from '@/core';
import { logger } from '@/utils/logger';

async function checkDbAction(pgClient: postgres.Sql, _config: ResolvedDbConfig): Promise<void> {
  logger.info('Connecting to database to check tables...');

  const tables = await pgClient`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  if (tables.length === 0) {
    logger.info('No tables found in the public schema.');
  } else {
    logger.info('Tables in public schema:');
    tables.forEach((table: { table_name: string }, i: number) => {
      console.log(`${i + 1}. ${table.table_name}`); // Direct console.log for cleaner list output
    });
  }
}

export async function checkDatabase(options?: DrizzleAssistOptions): Promise<void> {
  logger.verbose('Starting checkDatabase operation.');
  await executeWithPostgresClient(options, checkDbAction);
  logger.info('Database check completed.');
}
```

```typescript // src/commands/clear.ts
import { reset as drizzleSeedReset } from 'drizzle-seed';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { DrizzleAssistOptions, ResolvedDbConfig } from '@/types';
import { executeWithDrizzle } from '@/core';
import { logger } from '@/utils/logger';

async function clearDbAction(
  db: PostgresJsDatabase<Record<string, any>>,
  schema: Record<string, any>,
  _config: ResolvedDbConfig
): Promise<void> {
  logger.info('🗑️ Clearing database (truncating tables)...');
  try {
    // drizzle-seed's reset function truncates tables based on the provided schema
    await drizzleSeedReset(db, schema);
    logger.info('✅ Database cleared successfully.');
  } catch (error) {
    logger.error('❌ Error clearing database:', error);
    throw error; // Re-throw to be caught by executeWithDrizzle or caller
  }
}

export async function clearDatabase(options?: DrizzleAssistOptions): Promise<void> {
  logger.verbose('Starting clearDatabase operation.');
  await executeWithDrizzle(options, clearDbAction);
  logger.info('Database clear operation finished.');
}
```

```typescript // src/commands/reset.ts
import type postgres from 'postgres';
import type { ResetDatabaseOptions, ResolvedDbConfig } from '@/types';
import { executeWithPostgresClient } from '@/core';
import { runDrizzleKitPush } from '@/utils/exec';
import { logger } from '@/utils/logger';
import { performance } from 'node:perf_hooks';


async function resetDbAction(
  pgClient: postgres.Sql,
  config: ResolvedDbConfig,
  cmdOptions: ResetDatabaseOptions
): Promise<void> {
  logger.info('🔄 Database reset started...');
  const startTime = performance.now();

  logger.info('\n📊 Checking tables before reset...');
  const tablesBefore = await pgClient`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  if (tablesBefore.length === 0) {
    logger.info('   No tables found in the public schema.');
  } else {
    tablesBefore.forEach((table: { table_name: string }, i: number) => {
      logger.info(`   ${i + 1}. ${table.table_name}`);
    });
    logger.info(`   Total: ${tablesBefore.length} tables`);
  }

  logger.info('\n🗑️ Dropping all tables in public schema...');
  try {
    // Using DO block for atomicity and to handle dependencies
    await pgClient`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `;
    logger.info('   All tables in public schema dropped successfully.');
  } catch (error) {
    logger.error('   ❌ Error dropping tables:', error);
    throw error;
  }

  logger.info('\n📊 Verifying tables after drop...');
  const tablesAfter = await pgClient`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  if (tablesAfter.length === 0) {
    logger.info('   Verification successful: No tables found in public schema.');
  } else {
    logger.warn(`   Warning: ${tablesAfter.length} tables still found in public schema:`);
    tablesAfter.forEach((table: { table_name: string }, i: number) => {
      logger.warn(`   ${i + 1}. ${table.table_name}`);
    });
  }

  if (!cmdOptions.skipSchemaRecreation) {
    logger.info('\n🔨 Recreating database schema via drizzle-kit push...');
    try {
      // Pass the original config path to drizzle-kit, and the project root as CWD
      await runDrizzleKitPush(config.drizzleConfig.out ? config.drizzleConfig.schema : undefined, config.projectRoot);
      logger.info('   Database schema recreated successfully.');
    } catch (error) {
      logger.error('   ❌ Error recreating database schema with drizzle-kit push:', error);
      // We don't re-throw here, as tables are already dropped. The reset is partially complete.
      // The user will see the error from drizzle-kit.
    }
  } else {
    logger.info('\n⏩ Schema recreation skipped as per --skip-schema-recreation flag.');
  }

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  logger.info(`\n✅ Database reset completed in ${duration} seconds.`);
}

export async function resetDatabase(options?: ResetDatabaseOptions): Promise<void> {
  const cmdOptions = { skipSchemaRecreation: false, ...options };
  logger.verbose('Starting resetDatabase operation with options:', cmdOptions);
  // We need to pass cmdOptions (which includes skipSchemaRecreation) into the action
  await executeWithPostgresClient(options, (pgClient, config) =>
    resetDbAction(pgClient, config, cmdOptions)
  );
  logger.info('Database reset operation finished.');
}
```

```typescript // src/index.ts
export { checkDatabase } from '@/commands/check';
export { clearDatabase } from '@/commands/clear';
export { resetDatabase } from '@/commands/reset';
export type { DrizzleAssistOptions, ResetDatabaseOptions, LogLevel } from '@/types';
```

```typescript // src/cli.ts
#!/usr/bin/env bun
import { Command } from 'commander';
import { checkDatabase } from '@/commands/check';
import { clearDatabase } from '@/commands/clear';
import { resetDatabase } from '@/commands/reset';
import { logger } from '@/utils/logger';
import type { LogLevel } from './types';
// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const pkg = require('../package.json'); // Use require for JSON to avoid ESM/CJS issues in all contexts

const program = new Command();

program
  .name('drizzle-assist')
  .description(pkg.description)
  .version(pkg.version);

program.option(
    '--config <path>',
    'Path to your drizzle.config.ts file'
  )
  .option(
    '-l, --log-level <level>',
    'Set log level (verbose, info, warn, error, silent)',
    'info'
  );

program.hook('preAction', (thisCommand) => {
  const options = thisCommand.opts();
  if (options.logLevel) {
    logger.setLevel(options.logLevel as LogLevel);
  }
});

program
  .command('check')
  .description('Checks the database and lists tables in the public schema.')
  .action(async (cmdOpts) => {
    const globalOpts = program.opts();
    try {
      await checkDatabase({ configPath: globalOpts.config, logLevel: globalOpts.logLevel });
    } catch (error) {
      logger.error('Check command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('clear')
  .description('Clears all data from tables defined in your Drizzle schema.')
  .action(async (cmdOpts) => {
    const globalOpts = program.opts();
    // Add a confirmation step here if desired in future
    logger.warn('⚠️ This command will clear all data from your tables.');
    // const { confirm } = await inquirer.prompt([{ name: 'confirm', type: 'confirm', message: 'Are you sure?'}]);
    // if (!confirm) { logger.info("Operation cancelled."); process.exit(0); }
    try {
      await clearDatabase({ configPath: globalOpts.config, logLevel: globalOpts.logLevel });
    } catch (error) {
      logger.error('Clear command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('reset')
  .description('Drops all tables and recreates the schema using drizzle-kit push.')
  .option('-s, --skip-schema-recreation', 'Skip the drizzle-kit push step after dropping tables.')
  .action(async (cmdOpts) => {
    const globalOpts = program.opts();
    logger.warn('☢️  This command is destructive and will drop all tables in your public schema.');
    // Add confirmation
    try {
      await resetDatabase({
        configPath: globalOpts.config,
        logLevel: globalOpts.logLevel,
        skipSchemaRecreation: cmdOpts.skipSchemaRecreation,
      });
    } catch (error) {
      logger.error('Reset command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch(err => {
  logger.error("CLI Error:", err);
  process.exit(1);
});
```

To make `src/cli.ts` executable, you'd typically do `chmod +x src/cli.ts`. The `bin` field in `package.json` will handle this when the package is installed.

**A note on the deleted files from the original request:**
The files `src/db/check.db.ts`, `src/db/clear.db.ts`, `src/db/reset.db.ts`, `src/db/index.ts`, and `src/db/schema.ts` were part of the *user's application codebase*, not part of the `drizzle-assist` library itself. The `drizzle-assist` library is designed to *interact* with a user's Drizzle setup, which would include their own schema definitions (like `src/db/schema.ts`) and potentially their own Drizzle client instance (like `src/db/index.ts`).
Therefore, these files are not "deleted" in the context of creating the `drizzle-assist` library; rather, their *logic* is adapted and generalized into the library's commands, and the library expects the user to *have* their own `drizzle.config.ts` and schema files.

If you were to remove those files from a project *after* integrating `drizzle-assist`, you would replace their functionality with calls to `drizzle-assist` CLI or its programmatic API. For clarity, I will not mark them for deletion as they are examples of what a *user* of `drizzle-assist` would have.

This structure provides a solid foundation for `Drizzle-Assist`. You can build it using `bun run build`, and then test the CLI using `bun run ./dist/cli.js <command>` or by linking it globally (`npm link` or `bun link`).