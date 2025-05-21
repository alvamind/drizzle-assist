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