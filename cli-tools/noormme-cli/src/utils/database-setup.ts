import chalk from "chalk"
import { execSync } from "child_process"
import { promises as fs } from "fs"
import path from "path"

export class DatabaseSetup {
	private projectPath: string
	private databasePath: string

	constructor(projectPath: string) {
		this.projectPath = projectPath
		this.databasePath = path.join(projectPath, "database.sqlite")
	}

	async initialize(): Promise<void> {
		try {
			// Check if database already exists
			const dbExists = await this.databaseExists()

			if (!dbExists) {
				console.log(chalk.gray("Creating SQLite database..."))
				await this.createDatabase()
			} else {
				console.log(chalk.gray("Database already exists, skipping creation"))
			}

			// Enable WAL mode for better performance
			await this.enableWALMode()

			console.log(chalk.green("✅ Database initialized successfully"))
		} catch (error) {
			throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	async migrate(): Promise<void> {
		try {
			console.log(chalk.gray("Running database migrations..."))

			// Check if migration script exists
			const migrationScript = path.join(this.projectPath, "scripts", "migrate.ts")
			const migrationExists = await fs.access(migrationScript).then(
				() => true,
				() => false,
			)

			if (migrationExists) {
				// Run migration script
				await this.runScript("migrate")
			} else {
				// Create basic schema if no migration script
				await this.createBasicSchema()
			}

			console.log(chalk.green("✅ Database migrations completed"))
		} catch (error) {
			throw new Error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	async seed(): Promise<void> {
		try {
			console.log(chalk.gray("Seeding database..."))

			// Check if seed script exists
			const seedScript = path.join(this.projectPath, "scripts", "seed.ts")
			const seedExists = await fs.access(seedScript).then(
				() => true,
				() => false,
			)

			if (seedExists) {
				// Run seed script
				await this.runScript("seed")
			} else {
				// Create basic seed data if no seed script
				await this.createBasicSeedData()
			}

			console.log(chalk.green("✅ Database seeded successfully"))
		} catch (error) {
			throw new Error(`Seeding failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	private async databaseExists(): Promise<boolean> {
		try {
			await fs.access(this.databasePath)
			return true
		} catch {
			return false
		}
	}

	private async createDatabase(): Promise<void> {
		// Create empty SQLite database file
		await fs.writeFile(this.databasePath, "")
	}

	private async enableWALMode(): Promise<void> {
		try {
			// Enable WAL mode for better performance and concurrency
			execSync(`sqlite3 "${this.databasePath}" "PRAGMA journal_mode=WAL;"`, {
				stdio: "pipe",
				cwd: this.projectPath,
			})

			// Set other performance optimizations
			const pragmas = [
				"PRAGMA synchronous=NORMAL;",
				"PRAGMA cache_size=-64000;", // 64MB cache
				"PRAGMA temp_store=MEMORY;",
				"PRAGMA foreign_keys=ON;",
			]

			for (const pragma of pragmas) {
				execSync(`sqlite3 "${this.databasePath}" "${pragma}"`, {
					stdio: "pipe",
					cwd: this.projectPath,
				})
			}

			console.log(chalk.gray("✅ WAL mode and performance optimizations enabled"))
		} catch (error) {
			console.warn(chalk.yellow(`⚠️  Could not enable WAL mode: ${error}`))
		}
	}

	private async runScript(scriptName: string): Promise<void> {
		const scriptPath = path.join(this.projectPath, "scripts", `${scriptName}.ts`)

		try {
			// Try to run with tsx first (if available)
			execSync(`npx tsx "${scriptPath}"`, {
				stdio: "inherit",
				cwd: this.projectPath,
			})
		} catch (tsxError) {
			try {
				// Fallback to ts-node
				execSync(`npx ts-node "${scriptPath}"`, {
					stdio: "inherit",
					cwd: this.projectPath,
				})
			} catch (tsNodeError) {
				// Fallback to node with compiled JS
				const jsPath = scriptPath.replace(".ts", ".js")
				if (
					await fs.access(jsPath).then(
						() => true,
						() => false,
					)
				) {
					execSync(`node "${jsPath}"`, {
						stdio: "inherit",
						cwd: this.projectPath,
					})
				} else {
					throw new Error(`Could not run ${scriptName} script: ${tsxError}`)
				}
			}
		}
	}

	private async createBasicSchema(): Promise<void> {
		const basicSchema = `
-- Basic NOORMME schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  email_verified DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  expires DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires DATETIME NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- Create updated_at trigger for users table
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
  AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create updated_at trigger for accounts table
CREATE TRIGGER IF NOT EXISTS update_accounts_updated_at 
  AFTER UPDATE ON accounts
BEGIN
  UPDATE accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create updated_at trigger for sessions table
CREATE TRIGGER IF NOT EXISTS update_sessions_updated_at 
  AFTER UPDATE ON sessions
BEGIN
  UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
`

		execSync(`sqlite3 "${this.databasePath}" "${basicSchema}"`, {
			stdio: "pipe",
			cwd: this.projectPath,
		})
	}

	private async createBasicSeedData(): Promise<void> {
		const seedData = `
-- Basic seed data
INSERT OR IGNORE INTO users (id, email, name, email_verified) VALUES 
  ('admin', 'admin@example.com', 'Admin User', CURRENT_TIMESTAMP),
  ('user1', 'user1@example.com', 'Test User 1', CURRENT_TIMESTAMP),
  ('user2', 'user2@example.com', 'Test User 2', CURRENT_TIMESTAMP);
`

		execSync(`sqlite3 "${this.databasePath}" "${seedData}"`, {
			stdio: "pipe",
			cwd: this.projectPath,
		})
	}
}
