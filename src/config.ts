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