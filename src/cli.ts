#!/usr/bin/env bun
import { Command } from 'commander';
import { checkDatabase } from '@/commands/check';
import { clearDatabase } from '@/commands/clear';
import { resetDatabase } from '@/commands/reset';
import { logger } from '@/utils/logger';
import type { LogLevel } from './types';
// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const pkg = require('../package.json'); 

type GlobalOptions = {
  readonly config?: string;
  readonly logLevel?: LogLevel;
};

const createProgram = (): Command => {
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

  return program;
};

const setupHooks = (program: Command): void => {
  program.hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    if (options['logLevel']) {
      logger.setLevel(options['logLevel'] as LogLevel);
    }
  });
};

const addCheckCommand = (program: Command): void => {
  program
    .command('check')
    .description('Checks the database and lists tables in the public schema.')
    .action(async () => {
      const globalOpts = program.opts() as GlobalOptions;
      try {
        await checkDatabase({ 
          configPath: globalOpts['config'], 
          logLevel: globalOpts['logLevel'] 
        });
      } catch (error) {
        logger.error('Check command failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};

const addClearCommand = (program: Command): void => {
  program
    .command('clear')
    .description('Clears all data from tables defined in your Drizzle schema.')
    .action(async () => {
      const globalOpts = program.opts() as GlobalOptions;
      logger.warn('⚠️ This command will clear all data from your tables.');
      try {
        await clearDatabase({ 
          configPath: globalOpts['config'], 
          logLevel: globalOpts['logLevel'] 
        });
      } catch (error) {
        logger.error('Clear command failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};

const addResetCommand = (program: Command): void => {
  program
    .command('reset')
    .description('Drops all tables and recreates the schema using drizzle-kit push.')
    .option('-s, --skip-schema-recreation', 'Skip the drizzle-kit push step after dropping tables.')
    .action(async (cmdOpts) => {
      const globalOpts = program.opts() as GlobalOptions;
      logger.warn('☢️  This command is destructive and will drop all tables in your public schema.');
      try {
        await resetDatabase({
          configPath: globalOpts['config'],
          logLevel: globalOpts['logLevel'],
          skipSchemaRecreation: cmdOpts.skipSchemaRecreation,
        });
      } catch (error) {
        logger.error('Reset command failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};

const setupCli = (): Command => {
  const program = createProgram();
  setupHooks(program);
  addCheckCommand(program);
  addClearCommand(program);
  addResetCommand(program);
  return program;
};

const runCli = async (): Promise<void> => {
  const program = setupCli();
  
  await program.parseAsync(process.argv).catch(err => {
    logger.error("CLI Error:", err);
    process.exit(1);
  });
};

runCli();