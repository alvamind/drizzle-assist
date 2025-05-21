# Drizzle-Assist

[![npm version](https://badge.fury.io/js/drizzle-assist.svg)](https://badge.fury.io/js/drizzle-assist)

Drizzle-Assist is a CLI and programmatic toolkit designed to simplify common database operations for projects using [Drizzle ORM](https://orm.drizzle.team/). It helps you `check` your database's current state, `clear` all data from your tables, and `reset` your database schema.

Built with a Bun-first approach but compatible with Node.js.

## Features

-   **Check Database**: List all tables in your public schema.
-   **Clear Database**: Truncate all data from tables defined in your Drizzle schema (uses `drizzle-seed`).
-   **Reset Database**: Drop all tables in your public schema and then re-apply your schema using `drizzle-kit push`.
-   **Configuration-Driven**: Reads your existing `drizzle.config.ts` for database connection and schema path.
-   **CLI & Programmatic API**: Use it from your terminal or integrate it into your scripts.

## Prerequisites

-   Node.js (>=18.0.0) or Bun (>=1.0.0)
-   Drizzle ORM and Drizzle Kit set up in your project.
-   A `drizzle.config.ts` (or `.js`) file in your project root.

## Installation

```bash
# Using npm
npm install drizzle-assist
npm install -D drizzle-kit # If not already installed

# Using yarn
yarn add drizzle-assist
yarn add -D drizzle-kit # If not already installed

# Using pnpm
pnpm add drizzle-assist
pnpm add -D drizzle-kit # If not already installed

# Using bun
bun add drizzle-assist
bun add -D drizzle-kit # If not already installed
```

Drizzle-Assist relies on `drizzle-kit` being available in your project for the `reset` command (to push schema changes).

## Configuration

Drizzle-Assist automatically looks for a `drizzle.config.ts` (or `.js`) file in the root of your project. Ensure this file correctly specifies your `schema` path and `dbCredentials` (or `dialect: 'postgresql'` and `dbCredentials` for newer Drizzle Kit versions).

Example `drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/db/schema.ts', // Path to your Drizzle schema file
  out: './drizzle',             // Output directory for migrations
  dialect: 'postgresql',        // Specify 'postgresql'
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Your database connection string
  },
} satisfies Config;
```

Make sure your `DATABASE_URL` environment variable is set.

## CLI Usage

You can run Drizzle-Assist commands using `npx drizzle-assist <command>` or `bunx drizzle-assist <command>`.

### `check`

Displays a list of tables in the public schema of your database.

```bash
npx drizzle-assist check
```

### `clear`

Clears all data from the tables defined in your Drizzle schema. This operation uses `drizzle-seed`'s `reset` functionality under the hood, which typically truncates tables.

```bash
npx drizzle-assist clear
```

**Caution**: This command will remove all data from your tables.

### `reset`

Performs a hard reset of your database. It will:
1. Drop all tables in the `public` schema.
2. Recreate the schema by running `drizzle-kit push`.

```bash
npx drizzle-assist reset
```

Options:
  `-s, --skip-schema-recreation`: Skip the `drizzle-kit push` step after dropping tables.
  `--config <path>`: Specify a custom path to your `drizzle.config.ts` file.

```bash
npx drizzle-assist reset -s
npx drizzle-assist reset --config ./path/to/my.drizzle.config.ts
```

**Caution**: This command is destructive and will result in data loss.

## Programmatic API Usage

You can import and use Drizzle-Assist functions in your Node.js or Bun scripts.

```typescript
import { checkDatabase, clearDatabase, resetDatabase } from 'drizzle-assist';

// Optional: Define options if your config isn't at the default location
// or if you need to override something.
const options = {
  configPath: './custom-drizzle.config.ts',
};

async function main() {
  try {
    console.log('Checking database...');
    await checkDatabase(options);

    console.log('Clearing database...');
    await clearDatabase(options);

    console.log('Resetting database...');
    await resetDatabase({
      ...options,
      skipSchemaRecreation: false,
    });

    console.log('All operations completed successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();
```

### API Functions

- `checkDatabase(options?: DrizzleAssistOptions): Promise<void>`
- `clearDatabase(options?: DrizzleAssistOptions): Promise<void>`
- `resetDatabase(options?: ResetDatabaseOptions): Promise<void>`

Where `DrizzleAssistOptions` is:
```typescript
interface DrizzleAssistOptions {
  configPath?: string; // Path to drizzle.config.ts (defaults to project root)
  logLevel?: 'verbose' | 'info' | 'warn' | 'error' | 'silent'; // Default: 'info'
}

interface ResetDatabaseOptions extends DrizzleAssistOptions {
  skipSchemaRecreation?: boolean; // Default: false
}
```

## Logging
Drizzle-Assist uses a simple console logger. You can control the verbosity via the `logLevel` option in the programmatic API or potentially via a CLI flag in future versions.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## License
MIT