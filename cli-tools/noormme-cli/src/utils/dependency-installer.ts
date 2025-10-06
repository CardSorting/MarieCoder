import chalk from "chalk"
import { execSync } from "child_process"
import { promises as fs } from "fs"
import path from "path"

export interface InstallOptions {
	packageManager?: "npm" | "yarn" | "pnpm"
	skipOptional?: boolean
	productionOnly?: boolean
}

export class DependencyInstaller {
	private projectPath: string
	private packageManager: string

	constructor(projectPath: string, options: InstallOptions = {}) {
		this.projectPath = projectPath
		this.packageManager = options.packageManager || this.detectPackageManager()
	}

	async install(): Promise<void> {
		try {
			console.log(chalk.gray(`Installing dependencies with ${this.packageManager}...`))

			// Check if package.json exists
			const packageJsonPath = path.join(this.projectPath, "package.json")
			await fs.access(packageJsonPath)

			// Install dependencies
			await this.runInstall()

			console.log(chalk.green("✅ Dependencies installed successfully"))
		} catch (error) {
			throw new Error(`Dependency installation failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	private detectPackageManager(): string {
		const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]

		for (const lockFile of lockFiles) {
			try {
				const lockPath = path.join(this.projectPath, lockFile)
				require("fs").accessSync(lockPath)

				switch (lockFile) {
					case "package-lock.json":
						return "npm"
					case "yarn.lock":
						return "yarn"
					case "pnpm-lock.yaml":
						return "pnpm"
				}
			} catch {
				// Lock file doesn't exist, continue checking
			}
		}

		// Default to npm if no lock file is found
		return "npm"
	}

	private async runInstall(): Promise<void> {
		const commands = this.getInstallCommands()

		for (const command of commands) {
			try {
				console.log(chalk.gray(`Running: ${command}`))

				execSync(command, {
					cwd: this.projectPath,
					stdio: "pipe",
					timeout: 300000, // 5 minutes timeout
				})

				console.log(chalk.gray(`✅ ${command} completed`))
			} catch (error) {
				console.warn(chalk.yellow(`⚠️  ${command} failed, trying next method...`))

				// Try alternative installation methods
				await this.tryAlternativeInstall(command)
			}
		}
	}

	private getInstallCommands(): string[] {
		const baseCommands: string[] = []

		switch (this.packageManager) {
			case "npm":
				baseCommands.push("npm install")
				break
			case "yarn":
				baseCommands.push("yarn install")
				break
			case "pnpm":
				baseCommands.push("pnpm install")
				break
		}

		// Add additional setup commands
		baseCommands.push('npm run build || echo "Build skipped - not required for setup"')

		return baseCommands
	}

	private async tryAlternativeInstall(failedCommand: string): Promise<void> {
		const alternatives = this.getAlternativeCommands(failedCommand)

		for (const alternative of alternatives) {
			try {
				console.log(chalk.gray(`Trying alternative: ${alternative}`))

				execSync(alternative, {
					cwd: this.projectPath,
					stdio: "pipe",
					timeout: 300000, // 5 minutes timeout
				})

				console.log(chalk.green(`✅ Alternative command succeeded: ${alternative}`))
				return
			} catch (error) {
				console.warn(chalk.yellow(`⚠️  Alternative failed: ${alternative}`))
			}
		}

		throw new Error(`All installation methods failed for: ${failedCommand}`)
	}

	private getAlternativeCommands(failedCommand: string): string[] {
		const alternatives: string[] = []

		if (failedCommand.includes("npm install")) {
			alternatives.push("npm ci")
			alternatives.push("npm install --legacy-peer-deps")
			alternatives.push("yarn install")
			alternatives.push("pnpm install")
		} else if (failedCommand.includes("yarn install")) {
			alternatives.push("yarn install --frozen-lockfile")
			alternatives.push("yarn install --ignore-engines")
			alternatives.push("npm install")
		} else if (failedCommand.includes("pnpm install")) {
			alternatives.push("pnpm install --frozen-lockfile")
			alternatives.push("pnpm install --ignore-engines")
			alternatives.push("npm install")
		}

		return alternatives
	}

	// Utility method to check if dependencies are already installed
	async areDependenciesInstalled(): Promise<boolean> {
		try {
			const nodeModulesPath = path.join(this.projectPath, "node_modules")
			await fs.access(nodeModulesPath)

			// Check if node_modules has content
			const entries = await fs.readdir(nodeModulesPath)
			return entries.length > 0
		} catch {
			return false
		}
	}

	// Utility method to clean install (remove node_modules and reinstall)
	async cleanInstall(): Promise<void> {
		try {
			console.log(chalk.gray("Performing clean install..."))

			// Remove node_modules and lock files
			await this.cleanInstallation()

			// Reinstall
			await this.install()

			console.log(chalk.green("✅ Clean install completed"))
		} catch (error) {
			throw new Error(`Clean install failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	private async cleanInstallation(): Promise<void> {
		const pathsToRemove = ["node_modules", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"]

		for (const pathToRemove of pathsToRemove) {
			const fullPath = path.join(this.projectPath, pathToRemove)
			try {
				await fs.rm(fullPath, { recursive: true, force: true })
				console.log(chalk.gray(`Removed: ${pathToRemove}`))
			} catch (error) {
				console.warn(chalk.yellow(`Could not remove ${pathToRemove}: ${error}`))
			}
		}
	}
}
