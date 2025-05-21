import type postgres from 'postgres';
import type { ResetDatabaseOptions, ResolvedDbConfig } from '@/types';
import { executeWithPostgresClient } from '@/core';
import { runDrizzleKitPush } from '@/utils/exec';
import { logger } from '@/utils/logger';
import { performance } from 'node:perf_hooks';

type TableRecord = {
  readonly table_name: string;
};

const checkTables = async (
  pgClient: postgres.Sql, 
  message: string
): Promise<readonly TableRecord[]> => {
  logger.info(`\n📊 ${message}...`);
  
  const tables = await pgClient<TableRecord[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  if (tables.length === 0) {
    logger.info('   No tables found in the public schema.');
  } else {
    tables.forEach((table, i) => {
      logger.info(`   ${i + 1}. ${table.table_name}`);
    });
    logger.info(`   Total: ${tables.length} tables`);
  }
  
  return tables;
};

const dropAllTables = async (
  pgClient: postgres.Sql
): Promise<void> => {
  logger.info('\n🗑️ Dropping all tables in public schema...');
  
  try {
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
};

const recreateSchema = async (
  config: ResolvedDbConfig,
  skipSchemaRecreation: boolean
): Promise<void> => {
  if (skipSchemaRecreation) {
    logger.info('\n⏩ Schema recreation skipped as per --skip-schema-recreation flag.');
    return;
  }
  
  logger.info('\n🔨 Recreating database schema via drizzle-kit push...');
  
  try {
    await runDrizzleKitPush(config.drizzleConfigFilePath, config.projectRoot);
    logger.info('   Database schema recreated successfully.');
  } catch (error) {
    logger.error('   ❌ Error recreating database schema with drizzle-kit push:', error);
  }
};

const resetDbAction = async (
  pgClient: postgres.Sql,
  config: ResolvedDbConfig,
  cmdOptions: ResetDatabaseOptions
): Promise<void> => {
  logger.info('🔄 Database reset started...');
  const startTime = performance.now();

  await checkTables(pgClient, 'Checking tables before reset');
  await dropAllTables(pgClient);
  
  const tablesAfter = await checkTables(pgClient, 'Verifying tables after drop');
  
  if (tablesAfter.length > 0) {
    logger.warn(`   Warning: ${tablesAfter.length} tables still found in public schema.`);
  } else {
    logger.info('   Verification successful: No tables found in public schema.');
  }

  await recreateSchema(config, !!cmdOptions.skipSchemaRecreation);

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  logger.info(`\n✅ Database reset completed in ${duration} seconds.`);
};

export const resetDatabase = async (
  options?: ResetDatabaseOptions
): Promise<void> => {
  const cmdOptions = { skipSchemaRecreation: false, ...options };
  logger.verbose('Starting resetDatabase operation with options:', cmdOptions);
  
  await executeWithPostgresClient(options, (pgClient, config) =>
    resetDbAction(pgClient, config, cmdOptions)
  );
  
  logger.info('Database reset operation finished.');
};