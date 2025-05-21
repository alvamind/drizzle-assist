import type postgres from 'postgres';
import type { DrizzleAssistOptions, ResolvedDbConfig } from '@/types';
import { executeWithPostgresClient } from '@/core';
import { logger } from '@/utils/logger';

async function checkDbAction(pgClient: postgres.Sql, _config: ResolvedDbConfig): Promise<void> {
  logger.info('Connecting to database to check tables...');

  // Explicitly type the expected row structure from the query
  const tables = await pgClient<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  if (tables.length === 0) {
    logger.info('No tables found in the public schema.');
  } else {
    logger.info('Tables in public schema:');
    tables.forEach((table, i) => { // 'table' is now correctly typed as { table_name: string }
      console.log(`${i + 1}. ${table.table_name}`); 
    });
  }
}

export async function checkDatabase(options?: DrizzleAssistOptions): Promise<void> {
  logger.verbose('Starting checkDatabase operation.');
  await executeWithPostgresClient(options, checkDbAction);
  logger.info('Database check completed.');
}