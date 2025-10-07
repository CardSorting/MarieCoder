#!/usr/bin/env tsx

/**
 * NOORMME Artisan CLI Wrapper
 * Provides seamless integration with the MCP server for development commands
 * Following NORMIE DEV methodology - clean, unified, production-ready
 */

import { spawn } from "child_process"
import { existsSync } from "fs"
import path from "path"

class ArtisanCLI {
	private mcpServerPath: string

	constructor() {
		// Find the MCP server path
		this.mcpServerPath = this.findMCPServerPath()
	}

	private findMCPServerPath(): string {
		// Look for the MCP server in the parent directory
		const possiblePaths = [
			path.join(process.cwd(), "../mcp-servers/noormme-artisan"),
			path.join(process.cwd(), "../../mcp-servers/noormme-artisan"),
			path.join(process.cwd(), "../../../mcp-servers/noormme-artisan"),
		]

		for (const mcpPath of possiblePaths) {
			if (existsSync(path.join(mcpPath, "package.json"))) {
				return mcpPath
			}
		}

		throw new Error("NOORMME Artisan MCP Server not found. Please ensure it is installed in the mcp-servers directory.")
	}

	async execute(command: string, args: string[] = [], options: Record<string, any> = {}): Promise<void> {
		try {
			console.log(`🚀 Executing Artisan command: ${command}`)

			// Convert options to command line flags
			const flags = this.convertOptionsToFlags(options)
			const allArgs = [command, ...args, ...flags]

			// Execute the command using the MCP server
			const result = await this.runCommand(allArgs)

			if (result.success) {
				console.log(`✅ ${result.message}`)
				if (result.data) {
					this.displayResult(result.data)
				}
			} else {
				console.error(`❌ ${result.message}`)
				process.exit(1)
			}
		} catch (error) {
			console.error(`❌ Failed to execute command: ${error instanceof Error ? error.message : String(error)}`)
			process.exit(1)
		}
	}

	private convertOptionsToFlags(options: Record<string, any>): string[] {
		const flags: string[] = []

		for (const [key, value] of Object.entries(options)) {
			if (value === true) {
				flags.push(`--${key}`)
			} else if (value === false) {
			} else if (typeof value === "string" || typeof value === "number") {
				flags.push(`--${key}`, String(value))
			}
		}

		return flags
	}

	private async runCommand(args: string[]): Promise<{ success: boolean; message: string; data?: any }> {
		return new Promise((resolve, reject) => {
			const child = spawn("node", ["dist/index.js", ...args], {
				cwd: this.mcpServerPath,
				stdio: ["pipe", "pipe", "pipe"],
			})

			let stdout = ""
			let stderr = ""

			child.stdout?.on("data", (data) => {
				stdout += data.toString()
			})

			child.stderr?.on("data", (data) => {
				stderr += data.toString()
			})

			child.on("close", (code) => {
				if (code === 0) {
					try {
						const result = JSON.parse(stdout)
						resolve(result)
					} catch {
						resolve({
							success: true,
							message: stdout || "Command executed successfully",
						})
					}
				} else {
					reject(new Error(stderr || `Command failed with code ${code}`))
				}
			})

			child.on("error", (error) => {
				reject(error)
			})
		})
	}

	private displayResult(data: any): void {
		if (data.files && Array.isArray(data.files)) {
			console.log("\n📁 Created files:")
			data.files.forEach((file: string) => {
				console.log(`   • ${file}`)
			})
		}

		if (data.directories && Array.isArray(data.directories)) {
			console.log("\n📂 Created directories:")
			data.directories.forEach((dir: string) => {
				console.log(`   • ${dir}`)
			})
		}

		if (data.migrations && Array.isArray(data.migrations)) {
			console.log("\n🗄️  Migrations:")
			data.migrations.forEach((migration: string) => {
				console.log(`   • ${migration}`)
			})
		}

		if (data.url) {
			console.log(`\n🌐 Server running at: ${data.url}`)
		}

		if (data.coverage) {
			console.log("\n📊 Test Coverage:")
			console.log(`   • Statements: ${data.coverage.statements}%`)
			console.log(`   • Branches: ${data.coverage.branches}%`)
			console.log(`   • Functions: ${data.coverage.functions}%`)
			console.log(`   • Lines: ${data.coverage.lines}%`)
		}
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2)

	if (args.length === 0) {
		console.log(`
🚀 NOORMME Artisan CLI

Usage: npm run artisan <command> [options]

Available commands:
  make:component <name>     Create a new React component
  make:service <name>       Create a new service class
  make:migration <name>     Create a new database migration
  make:page <name>          Create a new Next.js page
  make:api <name>           Create a new API route
  make:middleware <name>    Create a new middleware
  install:auth              Install authentication system
  install:admin             Install admin panel
  db:migrate                Run database migrations
  db:seed                   Seed the database
  serve                     Start development server
  test                      Run tests

Examples:
  npm run artisan make:component Button --type=ui --with-tests
  npm run artisan make:service UserService --with-repository
  npm run artisan db:migrate --pretend
  npm run artisan serve --port=3000
`)
		process.exit(0)
	}

	const command = args[0]

	if (!command) {
		console.error("❌ No command provided")
		process.exit(1)
	}

	const commandArgs = args.slice(1)

	// Parse command line options
	const options: Record<string, any> = {}
	const filteredArgs: string[] = []

	for (let i = 0; i < commandArgs.length; i++) {
		const arg = commandArgs[i]

		if (arg && arg.startsWith("--")) {
			const key = arg.slice(2)
			const nextArg = commandArgs[i + 1]

			if (nextArg && !nextArg.startsWith("--")) {
				options[key] = nextArg
				i++ // Skip the next argument as it's the value
			} else {
				options[key] = true
			}
		} else if (arg) {
			filteredArgs.push(arg)
		}
	}

	const artisan = new ArtisanCLI()
	await artisan.execute(command, filteredArgs, options)
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason)
	process.exit(1)
})

// Run the CLI
main().catch((error) => {
	console.error("❌ CLI Error:", error.message)
	process.exit(1)
})
