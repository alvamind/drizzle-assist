import type postgres from 'postgres';
import type { DrizzleAssistOptions, ResolvedDbConfig } from '@/types';
import { executeWithPostgresClient } from '@/core';
import { logger } from '@/utils/logger';

type TableRecord = {
  readonly table_name: string;
};

const displayTables = (tables: readonly TableRecord[]): void => {
  if (tables.length === 0) {
    logger.info('No tables found in the public schema.');
    return;
  }
  
  logger.info('Tables in public schema:');
  tables.forEach((table, i) => {
    console.log(`${i + 1}. ${table.table_name}`);
  });
};

const checkDbAction = async (
  pgClient: postgres.Sql, 
  _config: ResolvedDbConfig
): Promise<void> => {
  logger.info('Connecting to database to check tables...');

  const tables = await pgClient<TableRecord[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  displayTables(tables);
};

export const checkDatabase = async (
  options?: DrizzleAssistOptions
): Promise<void> => {
  logger.verbose('Starting checkDatabase operation.');
  await executeWithPostgresClient(options, checkDbAction);
  logger.info('Database check completed.');
};