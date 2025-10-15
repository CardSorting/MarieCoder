/**
 * CLI Configuration Manager
 *
 * @module cli_config_manager
 * @description Manages CLI configuration including API keys, provider settings,
 * and user preferences. Handles secure storage of API keys separate from main config.
 *
 * Configuration is stored in `~/.mariecoder/cli/`:
 * - `config.json` - Main configuration (no sensitive data)
 * - `secrets.json` - API keys with restricted permissions (0600)
 *
 * @example
 * ```typescript
 * const manager = new CliConfigManager()
 *
 * // Load configuration
 * const config = manager.loadConfig()
 *
 * // Save configuration
 * manager.saveConfig({
 *   apiProvider: 'anthropic',
 *   apiModelId: 'claude-3-5-sonnet-20241022',
 *   ...
 * })
 *
 * // Validate configuration
 * const { valid, errors } = manager.validateConfig(config)
 * ```
 */

import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { output } from "./cli_output"

export interface CliConfiguration {
	apiProvider?: string
	apiModelId?: string
	apiKey?: string
	temperature?: number
	maxTokens?: number
	hasCompletedSetup?: boolean
	workspace?: string
	verbose?: boolean
	autoApprove?: boolean
	// Plan/Act mode configuration
	mode?: "plan" | "act"
	planActSeparateModelsSetting?: boolean
	planModeApiProvider?: string
	planModeApiModelId?: string
	actModeApiProvider?: string
	actModeApiModelId?: string
	// Terminal output management
	terminalOutputLineLimit?: number
	shellIntegrationTimeout?: number
	terminalReuseEnabled?: boolean
	// Task history configuration
	taskHistoryLimit?: number
}

/**
 * Manages CLI configuration with secure API key storage
 *
 * Handles loading, saving, and validating configuration while keeping
 * API keys separate from main config file for better security.
 */
export class CliConfigManager {
	private configDir: string
	private configPath: string
	private secretsPath: string
	private cachedConfig: CliConfiguration | null = null

	/**
	 * Creates a new configuration manager
	 *
	 * Initializes paths for configuration storage:
	 * - Config dir: `~/.mariecoder/cli/`
	 * - Config file: `~/.mariecoder/cli/config.json`
	 * - Secrets file: `~/.mariecoder/cli/secrets.json` (with 0600 permissions)
	 */
	constructor() {
		this.configDir = path.join(os.homedir(), ".mariecoder", "cli")
		this.configPath = path.join(this.configDir, "config.json")
		this.secretsPath = path.join(this.configDir, "secrets.json")
	}

	/**
	 * Get configuration directory path
	 */
	getConfigDir(): string {
		return this.configDir
	}

	/**
	 * Ensure configuration directory exists
	 */
	ensureConfigDirExists(): void {
		if (!fs.existsSync(this.configDir)) {
			fs.mkdirSync(this.configDir, { recursive: true })
		}
	}

	/**
	 * Check if configuration exists
	 */
	hasConfiguration(): boolean {
		return fs.existsSync(this.configPath)
	}

	/**
	 * Check if setup has been completed
	 */
	hasCompletedSetup(): boolean {
		if (!this.hasConfiguration()) {
			return false
		}

		try {
			const config = this.loadConfig()
			return config.hasCompletedSetup === true
		} catch {
			return false
		}
	}

	/**
	 * Load configuration from disk
	 */
	loadConfig(): CliConfiguration {
		// Return cached config if available
		if (this.cachedConfig) {
			return { ...this.cachedConfig }
		}

		const config: CliConfiguration = {}

		// Load main config
		if (fs.existsSync(this.configPath)) {
			try {
				const fileConfig = JSON.parse(fs.readFileSync(this.configPath, "utf-8"))
				Object.assign(config, fileConfig)
			} catch (error) {
				output.warn(`⚠️  Failed to load config from ${this.configPath}:`, error)
			}
		}

		// Load secrets (API keys)
		if (fs.existsSync(this.secretsPath)) {
			try {
				const secrets = JSON.parse(fs.readFileSync(this.secretsPath, "utf-8"))

				// Find API key for current provider
				if (config.apiProvider) {
					const keyName = `${config.apiProvider}_api_key`
					if (secrets[keyName]) {
						config.apiKey = secrets[keyName]
					}
				}

				// Also check for generic keys
				if (!config.apiKey && secrets.api_key) {
					config.apiKey = secrets.api_key
				}
			} catch (error) {
				output.warn(`⚠️  Failed to load secrets from ${this.secretsPath}:`, error)
			}
		}

		// Load from environment variables (takes precedence)
		this.mergeEnvironmentVariables(config)

		// Cache the config
		this.cachedConfig = { ...config }

		return config
	}

	/**
	 * Save configuration to disk
	 */
	saveConfig(config: CliConfiguration): void {
		this.ensureConfigDirExists()

		// Separate API key from main config
		const { apiKey, ...configWithoutKey } = config

		// Save main config (without API key)
		try {
			fs.writeFileSync(this.configPath, JSON.stringify(configWithoutKey, null, 2))
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			throw new Error(
				`Failed to save configuration: ${errorMessage}. ` +
					`Unable to write to ${this.configPath}. ` +
					`Try: 1) Check directory exists and is writable, ` +
					`2) Verify sufficient disk space, 3) Ensure file is not locked by another program`,
			)
		}

		// Save API key separately if provided
		if (apiKey) {
			this.saveApiKey(apiKey, config.apiProvider || "anthropic")
		}

		// Update cache
		this.cachedConfig = { ...config }
	}

	/**
	 * Save API key to secrets file
	 */
	saveApiKey(apiKey: string, provider: string): void {
		this.ensureConfigDirExists()

		// Load existing secrets
		let secrets: Record<string, string> = {}
		if (fs.existsSync(this.secretsPath)) {
			try {
				secrets = JSON.parse(fs.readFileSync(this.secretsPath, "utf-8"))
			} catch {
				// Ignore errors, will create new file
			}
		}

		// Add new API key
		secrets[`${provider}_api_key`] = apiKey

		// Save secrets
		try {
			fs.writeFileSync(this.secretsPath, JSON.stringify(secrets, null, 2))

			// Set restrictive permissions (Unix-like systems only)
			try {
				fs.chmodSync(this.secretsPath, 0o600) // Read/write for owner only
			} catch {
				// Windows doesn't support chmod, ignore
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			throw new Error(
				`Failed to save API key: ${errorMessage}. ` +
					`Unable to write secrets to ${this.secretsPath}. ` +
					`Ensure ~/.mariecoder/cli/ directory has write permissions and sufficient disk space.`,
			)
		}
	}

	/**
	 * Merge configuration with command-line options
	 */
	mergeWithOptions(options: Partial<CliConfiguration>): CliConfiguration {
		const config = this.loadConfig()

		// Command-line options override config file
		if (options.apiProvider) {
			config.apiProvider = options.apiProvider
		}
		if (options.apiModelId) {
			config.apiModelId = options.apiModelId
		}
		if (options.apiKey) {
			config.apiKey = options.apiKey
		}
		if (options.temperature !== undefined) {
			config.temperature = options.temperature
		}
		if (options.maxTokens !== undefined) {
			config.maxTokens = options.maxTokens
		}
		if (options.workspace) {
			config.workspace = options.workspace
		}
		if (options.verbose !== undefined) {
			config.verbose = options.verbose
		}
		if (options.autoApprove !== undefined) {
			config.autoApprove = options.autoApprove
		}
		if (options.mode) {
			config.mode = options.mode
		}
		if (options.planActSeparateModelsSetting !== undefined) {
			config.planActSeparateModelsSetting = options.planActSeparateModelsSetting
		}
		if (options.planModeApiProvider) {
			config.planModeApiProvider = options.planModeApiProvider
		}
		if (options.planModeApiModelId) {
			config.planModeApiModelId = options.planModeApiModelId
		}
		if (options.actModeApiProvider) {
			config.actModeApiProvider = options.actModeApiProvider
		}
		if (options.actModeApiModelId) {
			config.actModeApiModelId = options.actModeApiModelId
		}
		// Terminal output management
		if (options.terminalOutputLineLimit !== undefined) {
			config.terminalOutputLineLimit = options.terminalOutputLineLimit
		}
		if (options.shellIntegrationTimeout !== undefined) {
			config.shellIntegrationTimeout = options.shellIntegrationTimeout
		}
		if (options.terminalReuseEnabled !== undefined) {
			config.terminalReuseEnabled = options.terminalReuseEnabled
		}
		// Task history
		if (options.taskHistoryLimit !== undefined) {
			config.taskHistoryLimit = options.taskHistoryLimit
		}

		return config
	}

	/**
	 * Merge environment variables into config
	 */
	private mergeEnvironmentVariables(config: CliConfiguration): void {
		// API Keys (only if not already set)
		if (!config.apiKey) {
			config.apiKey =
				process.env.ANTHROPIC_API_KEY ||
				process.env.OPENAI_API_KEY ||
				process.env.OPENROUTER_API_KEY ||
				process.env.MARIE_API_KEY
		}

		// Provider
		if (!config.apiProvider && process.env.MARIE_PROVIDER) {
			config.apiProvider = process.env.MARIE_PROVIDER
		}

		// Model
		if (!config.apiModelId && process.env.MARIE_MODEL) {
			config.apiModelId = process.env.MARIE_MODEL
		}

		// Temperature
		if (config.temperature === undefined && process.env.MARIE_TEMPERATURE) {
			config.temperature = Number.parseFloat(process.env.MARIE_TEMPERATURE)
		}

		// Max tokens
		if (config.maxTokens === undefined && process.env.MARIE_MAX_TOKENS) {
			config.maxTokens = Number.parseInt(process.env.MARIE_MAX_TOKENS, 10)
		}
	}

	/**
	 * Update specific configuration values
	 */
	updateConfig(updates: Partial<CliConfiguration>): void {
		const config = this.loadConfig()
		Object.assign(config, updates)
		this.saveConfig(config)
	}

	/**
	 * Clear cached configuration (force reload next time)
	 */
	clearCache(): void {
		this.cachedConfig = null
	}

	/**
	 * Validate configuration is complete and usable
	 */
	validateConfig(config: CliConfiguration): { valid: boolean; errors: string[] } {
		const errors: string[] = []

		if (!config.apiKey) {
			errors.push("API key is required")
		}

		if (!config.apiProvider) {
			errors.push("API provider is required")
		}

		if (!config.apiModelId) {
			errors.push("API model is required")
		}

		if (config.temperature !== undefined) {
			if (config.temperature < 0 || config.temperature > 1) {
				errors.push("Temperature must be between 0.0 and 1.0")
			}
		}

		if (config.maxTokens !== undefined) {
			if (config.maxTokens < 1) {
				errors.push("Max tokens must be positive")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}

	/**
	 * Show current configuration (with masked API key)
	 */
	displayConfig(config?: CliConfiguration): void {
		const currentConfig = config || this.loadConfig()

		output.log("\n📋 Current Configuration")
		output.log("─".repeat(80))
		output.log(`  Config Directory: ${this.configDir}`)
		output.log(`  Provider: ${currentConfig.apiProvider || "not set"}`)
		output.log(`  Model: ${currentConfig.apiModelId || "not set"}`)
		output.log(`  API Key: ${currentConfig.apiKey ? this.maskApiKey(currentConfig.apiKey) : "not set"}`)

		if (currentConfig.temperature !== undefined) {
			output.log(`  Temperature: ${currentConfig.temperature}`)
		}
		if (currentConfig.maxTokens !== undefined) {
			output.log(`  Max Tokens: ${currentConfig.maxTokens}`)
		}

		// Plan/Act Mode Configuration
		if (currentConfig.planActSeparateModelsSetting) {
			output.log(`\n  Plan/Act Mode: Separate Models Enabled`)
			output.log(`  Current Mode: ${currentConfig.mode || "act"} mode`)
			if (currentConfig.planModeApiProvider || currentConfig.planModeApiModelId) {
				output.log(
					`  Plan Mode: ${currentConfig.planModeApiProvider || "not set"} / ${currentConfig.planModeApiModelId || "not set"}`,
				)
			}
			if (currentConfig.actModeApiProvider || currentConfig.actModeApiModelId) {
				output.log(
					`  Act Mode: ${currentConfig.actModeApiProvider || "not set"} / ${currentConfig.actModeApiModelId || "not set"}`,
				)
			}
		} else {
			output.log(`  Mode: ${currentConfig.mode || "act"}`)
		}

		if (currentConfig.workspace) {
			output.log(`\n  Workspace: ${currentConfig.workspace}`)
		}
		if (currentConfig.verbose) {
			output.log(`  Verbose: ${currentConfig.verbose}`)
		}
		if (currentConfig.autoApprove) {
			output.log(`  Auto-Approve: ${currentConfig.autoApprove}`)
		}

		output.log("─".repeat(80) + "\n")
	}

	/**
	 * Get helpful error messages for missing configuration
	 */
	getConfigurationHelp(): void {
		output.log("\n❌ Configuration incomplete!")
		output.log("\nTo configure MarieCoder CLI, you can:")
		output.log("\n1. Run the setup wizard:")
		output.log("   mariecoder --setup")
		output.log("\n2. Use command-line options:")
		output.log('   mariecoder --api-key YOUR_KEY --provider anthropic "Your task"')
		output.log("\n3. Set environment variables:")
		output.log("   export ANTHROPIC_API_KEY=your-key")
		output.log('   mariecoder "Your task"')
		output.log("\n4. Edit the config file directly:")
		output.log(`   ${this.configPath}`)
		output.log("\nFor more help, run: mariecoder --help\n")
	}

	/**
	 * Mask API key for display
	 */
	private maskApiKey(apiKey: string): string {
		if (apiKey.length <= 8) {
			return "*".repeat(apiKey.length)
		}
		const start = apiKey.substring(0, 7)
		const end = apiKey.substring(apiKey.length - 4)
		const masked = "*".repeat(Math.max(8, apiKey.length - 11))
		return `${start}${masked}${end}`
	}

	/**
	 * Reset configuration (delete config files)
	 */
	resetConfig(): void {
		try {
			if (fs.existsSync(this.configPath)) {
				fs.unlinkSync(this.configPath)
			}
			if (fs.existsSync(this.secretsPath)) {
				fs.unlinkSync(this.secretsPath)
			}
			this.clearCache()
			output.log("✅ Configuration reset successfully")
		} catch (error) {
			console.error(`❌ Failed to reset configuration: ${error}`)
		}
	}
}
