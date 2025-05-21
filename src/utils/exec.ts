import { spawn } from 'child_process';
import { logger } from './logger';

type CommandOptions = {
  readonly cwd?: string;
  readonly logPrefix?: string;
};

const createProcess = (
  command: string,
  args: readonly string[],
  options?: CommandOptions
) => {
  return spawn(command, args, {
    stdio: 'pipe',
    shell: true,
    cwd: options?.cwd,
  });
};

const getPrefix = (options?: CommandOptions, command?: string): string => 
  options?.logPrefix || `[${command}]`;

const handleOutput = (
  process: ReturnType<typeof spawn>,
  options?: CommandOptions,
  command?: string
): void => {
  const prefix = getPrefix(options, command);

  process.stdout?.on('data', (data) => {
    logger.info(`${prefix}: ${data.toString().trim()}`);
  });

  process.stderr?.on('data', (data) => {
    logger.error(`${prefix} (stderr): ${data.toString().trim()}`);
  });
};

export const runCommand = (
  command: string,
  args: readonly string[],
  options?: CommandOptions
): Promise<void> => {
  logger.verbose(`Executing command: ${command} ${args.join(' ')} ${options?.cwd ? `in ${options.cwd}` : ''}`);
  
  return new Promise((resolve, reject) => {
    const process = createProcess(command, args, options);
    handleOutput(process, options, command);

    process.on('close', (code) => {
      if (code === 0) {
        logger.verbose(`Command "${command} ${args.join(' ')}" executed successfully.`);
        resolve();
      } else {
        logger.error(`Command "${command} ${args.join(' ')}" failed with code ${code}.`);
        reject(new Error(`${command} exited with code ${code}`));
      }
    });

    process.on('error', (err) => {
      logger.error(`Failed to start command "${command}":`, err);
      reject(err);
    });
  });
};

export const runDrizzleKitPush = async (
  configPath?: string, 
  projectRoot?: string
): Promise<void> => {
  const args = ['drizzle-kit', 'push'] as const;
  const argsWithConfig = configPath 
    ? [...args, '--config', configPath] as const
    : args;
    
  await runCommand('npx', argsWithConfig, { 
    cwd: projectRoot, 
    logPrefix: '[drizzle-kit push]' 
  });
};