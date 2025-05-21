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