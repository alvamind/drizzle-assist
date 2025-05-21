import { reset as drizzleSeedReset } from 'drizzle-seed';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { DrizzleAssistOptions, ResolvedDbConfig } from '@/types';
import { executeWithDrizzle } from '@/core';
import { logger } from '@/utils/logger';

const clearDbAction = async (
  db: PostgresJsDatabase<Record<string, any>>,
  schema: Record<string, any>,
  _config: ResolvedDbConfig
): Promise<void> => {
  logger.info('🗑️ Clearing database (truncating tables)...');
  
  try {
    await drizzleSeedReset(db, schema);
    logger.info('✅ Database cleared successfully.');
  } catch (error) {
    logger.error('❌ Error clearing database:', error);
    throw error;
  }
};

export const clearDatabase = async (
  options?: DrizzleAssistOptions
): Promise<void> => {
  logger.verbose('Starting clearDatabase operation.');
  await executeWithDrizzle(options, clearDbAction);
  logger.info('Database clear operation finished.');
};