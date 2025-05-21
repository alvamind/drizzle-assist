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
  // Explicitly type the expected row structure
  const tablesBefore = await pgClient<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  if (tablesBefore.length === 0) {
    logger.info('   No tables found in the public schema.');
  } else {
    tablesBefore.forEach((table, i) => { // 'table' is now { table_name: string }
      logger.info(`   ${i + 1}. ${table.table_name}`);
    });
    logger.info(`   Total: ${tablesBefore.length} tables`);
  }

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

  logger.info('\n📊 Verifying tables after drop...');
  // Explicitly type the expected row structure
  const tablesAfter = await pgClient<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  if (tablesAfter.length === 0) {
    logger.info('   Verification successful: No tables found in public schema.');
  } else {
    logger.warn(`   Warning: ${tablesAfter.length} tables still found in public schema:`);
    tablesAfter.forEach((table, i) => { // 'table' is now { table_name: string }
      logger.warn(`   ${i + 1}. ${table.table_name}`);
    });
  }

  if (!cmdOptions.skipSchemaRecreation) {
    logger.info('\n🔨 Recreating database schema via drizzle-kit push...');
    try {
      // Pass the path to drizzle.config.ts and the project root for CWD
      await runDrizzleKitPush(config.drizzleConfigFilePath, config.projectRoot);
      logger.info('   Database schema recreated successfully.');
    } catch (error) {
      logger.error('   ❌ Error recreating database schema with drizzle-kit push:', error);
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
  await executeWithPostgresClient(options, (pgClient, config) =>
    resetDbAction(pgClient, config, cmdOptions)
  );
  logger.info('Database reset operation finished.');
}