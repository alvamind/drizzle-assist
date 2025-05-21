import path from 'node:path';
import fs from 'node:fs';
import { bundleRequire } from 'bundle-require';
import type { Config as DrizzleKitConfig } from 'drizzle-kit';
import type { DrizzleAssistOptions, ResolvedDbConfig } from '@/types';
import { logger } from '@/utils/logger';

const findDrizzleConfig = async (startPath: string): Promise<string | null> => {
  const findInPath = (currentPath: string): string | null => {
    const tsConfigPath = path.join(currentPath, 'drizzle.config.ts');
    if (fs.existsSync(tsConfigPath)) return tsConfigPath;

    const jsConfigPath = path.join(currentPath, 'drizzle.config.js');
    if (fs.existsSync(jsConfigPath)) return jsConfigPath;

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) return null; // Reached root
    
    return findInPath(parentPath);
  };
  
  return findInPath(path.resolve(startPath));
};

const getConnectionString = (drizzleConfig: DrizzleKitConfig): string | undefined => {
  if (drizzleConfig.dialect === 'postgresql') {
    const hasDbCredentials = (cfg: unknown): cfg is { dbCredentials: unknown } =>
      typeof cfg === 'object' && cfg !== null && 'dbCredentials' in cfg;
      
    if (hasDbCredentials(drizzleConfig)) {
      const pgCredentials = drizzleConfig.dbCredentials as { url?: string; connectionString?: string } | string | undefined;
      
      if (typeof pgCredentials === 'string') {
        return pgCredentials;
      } 
      
      if (typeof pgCredentials === 'object' && pgCredentials !== null) {
        return pgCredentials.url || (pgCredentials as any).connectionString;
      }
    }
    return undefined;
  }
  
  if (!drizzleConfig.dialect) {
    const legacyConfig = drizzleConfig as any;
    
    if (legacyConfig.dbCredentials) {
      if (typeof legacyConfig.dbCredentials === 'object' && legacyConfig.dbCredentials !== null) {
        if ('url' in legacyConfig.dbCredentials && typeof legacyConfig.dbCredentials.url === 'string') {
          return legacyConfig.dbCredentials.url;
        } 
        
        if ('connectionString' in legacyConfig.dbCredentials && 
            typeof legacyConfig.dbCredentials.connectionString === 'string') {
          return legacyConfig.dbCredentials.connectionString;
        }
      } 
      
      if (typeof legacyConfig.dbCredentials === 'string') {
        return legacyConfig.dbCredentials;
      }
    }
    
    if (legacyConfig.driver === 'pg' && typeof legacyConfig.connectionString === 'string') {
      return legacyConfig.connectionString;
    }
  }
  
  return undefined;
};

const validateDialect = (drizzleConfig: DrizzleKitConfig): void => {
  if (drizzleConfig.dialect && drizzleConfig.dialect !== 'postgresql') {
    logger.error(`Unsupported Drizzle dialect: ${drizzleConfig.dialect}. Drizzle-Assist currently only supports 'postgresql'.`);
    throw new Error(`Unsupported Drizzle dialect: ${drizzleConfig.dialect}. Only 'postgresql' is supported.`);
  }
};

const getSchemaPath = (drizzleConfig: DrizzleKitConfig, projectRoot: string): string => {
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
  
  return absoluteSchemaPath;
};

export const loadAndResolveConfig = async (
  options?: DrizzleAssistOptions
): Promise<ResolvedDbConfig> => {
  logger.setLevel(options?.logLevel || 'info');
  logger.verbose('Loading and resolving configuration...');

  const explicitConfigPath = options?.configPath ? path.resolve(options.configPath) : undefined;
  const drizzleConfigPath = explicitConfigPath || await findDrizzleConfig(process.cwd());

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
  
  validateDialect(drizzleConfig);
  const schemaPath = getSchemaPath(drizzleConfig, projectRoot);
  const connectionString = getConnectionString(drizzleConfig);
  
  if (!connectionString) {
    logger.error(
      'Database connection string could not be determined. Ensure your drizzle.config.ts has dialect: "postgresql" and dbCredentials.url (or dbCredentials.connectionString or dbCredentials directly as a string) is set, or uses a supported legacy format.'
    );
    throw new Error('Database connection string not found or could not be determined.');
  }

  const resolvedConfig: ResolvedDbConfig = {
    connectionString,
    schemaPath,
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
};