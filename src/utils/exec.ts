import { spawn } from 'child_process';
import { logger } from './logger';

export function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; logPrefix?: string }
): Promise<void> {
  logger.verbose(`Executing command: ${command} ${args.join(' ')} ${options?.cwd ? `in ${options.cwd}` : ''}`);
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'pipe', // 'inherit' will show output directly, 'pipe' allows us to prefix
      shell: true, // Important for commands like 'npx' on Windows
      cwd: options?.cwd,
    });

    const prefix = options?.logPrefix || `[${command}]`;

    process.stdout?.on('data', (data) => {
      logger.info(`${prefix}: ${data.toString().trim()}`);
    });

    process.stderr?.on('data', (data) => {
      logger.error(`${prefix} (stderr): ${data.toString().trim()}`);
    });

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
}

export async function runDrizzleKitPush(configPath?: string, projectRoot?: string): Promise<void> {
  const args = ['drizzle-kit', 'push'];
  if (configPath) {
    // drizzle-kit expects config path relative to CWD or absolute
    args.push('--config', configPath);
  }
  // npx should handle finding drizzle-kit from local node_modules or globally
  // We run it from projectRoot to ensure it picks up local drizzle-kit and config correctly
  await runCommand('npx', args, { cwd: projectRoot, logPrefix: '[drizzle-kit push]' });
}