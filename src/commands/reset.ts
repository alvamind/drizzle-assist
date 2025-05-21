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