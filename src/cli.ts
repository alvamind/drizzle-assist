#!/usr/bin/env bun
import { Command } from 'commander';
import { checkDatabase } from '@/commands/check';
import { clearDatabase } from '@/commands/clear';
import { resetDatabase } from '@/commands/reset';
import { logger } from '@/utils/logger';
import type { LogLevel } from './types';
// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const pkg = require('../package.json'); // Use require for JSON to avoid ESM/CJS issues in all contexts

const program = new Command();

program
  .name('drizzle-assist')
  .description(pkg.description)
  .version(pkg.version);

program.option(
    '--config <path>',
    'Path to your drizzle.config.ts file'
  )
  .option(
    '-l, --log-level <level>',
    'Set log level (verbose, info, warn, error, silent)',
    'info'
  );

program.hook('preAction', (thisCommand) => {
  const options = thisCommand.opts();
  if (options.logLevel) {
    logger.setLevel(options.logLevel as LogLevel);
  }
});

program
  .command('check')
  .description('Checks the database and lists tables in the public schema.')
  .action(async (cmdOpts) => {
    const globalOpts = program.opts();
    try {
      await checkDatabase({ configPath: globalOpts.config, logLevel: globalOpts.logLevel });
    } catch (error) {
      logger.error('Check command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('clear')
  .description('Clears all data from tables defined in your Drizzle schema.')
  .action(async (cmdOpts) => {
    const globalOpts = program.opts();
    // Add a confirmation step here if desired in future
    logger.warn('⚠️ This command will clear all data from your tables.');
    // const { confirm } = await inquirer.prompt([{ name: 'confirm', type: 'confirm', message: 'Are you sure?'}]);
    // if (!confirm) { logger.info("Operation cancelled."); process.exit(0); }
    try {
      await clearDatabase({ configPath: globalOpts.config, logLevel: globalOpts.logLevel });
    } catch (error) {
      logger.error('Clear command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('reset')
  .description('Drops all tables and recreates the schema using drizzle-kit push.')
  .option('-s, --skip-schema-recreation', 'Skip the drizzle-kit push step after dropping tables.')
  .action(async (cmdOpts) => {
    const globalOpts = program.opts();
    logger.warn('☢️  This command is destructive and will drop all tables in your public schema.');
    // Add confirmation
    try {
      await resetDatabase({
        configPath: globalOpts.config,
        logLevel: globalOpts.logLevel,
        skipSchemaRecreation: cmdOpts.skipSchemaRecreation,
      });
    } catch (error) {
      logger.error('Reset command failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch(err => {
  logger.error("CLI Error:", err);
  process.exit(1);
});