/**
 * CLI Setup Wizard
 * Interactive first-time setup experience for MarieCoder CLI
 */

import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { CliInteractionHandler } from "./cli_interaction_handler"

export interface SetupConfig {
	apiProvider: string
	apiKey: string
	apiModelId: string
	temperature?: number
	maxTokens?: number
	hasCompletedSetup: boolean
}

export class CliSetupWizard {
	private interactionHandler: CliInteractionHandler
	private configDir: string

	constructor() {
		this.interactionHandler = new CliInteractionHandler()
		this.configDir = path.join(os.homedir(), ".mariecoder", "cli")
	}

	/**
	 * Check if this is the first run (no config exists)
	 */
	isFirstRun(): boolean {
		const configPath = path.join(this.configDir, "config.json")
		if (!fs.existsSync(configPath)) {
			return true
		}

		try {
			const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
			return !config.hasCompletedSetup
		} catch {
			return true
		}
	}

	/**
	 * Run the interactive setup wizard
	 */
	async runSetupWizard(): Promise<SetupConfig | null> {
		console.log("\n" + "═".repeat(80))
		console.log("🎉 Welcome to MarieCoder CLI - First Time Setup")
		console.log("═".repeat(80))
		console.log("\nLet's get you set up! This will only take a minute.\n")

		try {
			// Step 1: Choose AI provider
			const provider = await this.selectProvider()
			if (!provider) {
				return null
			}

			// Step 2: Configure API key
			const apiKey = await this.configureApiKey(provider)
			if (!apiKey) {
				return null
			}

			// Step 3: Select model
			const model = await this.selectModel(provider)
			if (!model) {
				return null
			}

			// Step 4: Optional advanced settings
			const advancedSettings = await this.configureAdvancedSettings()

			// Step 5: Save configuration
			const config: SetupConfig = {
				apiProvider: provider,
				apiKey: apiKey,
				apiModelId: model,
				temperature: advancedSettings.temperature,
				maxTokens: advancedSettings.maxTokens,
				hasCompletedSetup: true,
			}

			this.saveConfig(config)

			// Step 6: Show setup summary
			this.showSetupSummary(config)

			// Step 7: Offer to create .clinerules
			await this.offerClineRulesSetup()

			console.log("\n✅ Setup complete! You're ready to start coding with MarieCoder.\n")

			return config
		} catch (error) {
			console.error("\n❌ Setup failed:", error)
			return null
		}
	}

	/**
	 * Quick setup for users who already have config elsewhere
	 */
	async quickSetup(existingApiKey?: string, existingProvider?: string): Promise<SetupConfig | null> {
		console.log("\n⚡ Quick Setup")
		console.log("─".repeat(80))

		const provider = existingProvider || "anthropic"
		const apiKey = existingApiKey || (await this.configureApiKey(provider))

		if (!apiKey) {
			return null
		}

		const defaultModel = this.getDefaultModel(provider)
		const model = await this.interactionHandler.askInput(`Model (recommended: ${defaultModel})`, defaultModel)

		const config: SetupConfig = {
			apiProvider: provider,
			apiKey: apiKey,
			apiModelId: model,
			hasCompletedSetup: true,
		}

		this.saveConfig(config)
		console.log("✅ Configuration saved!\n")

		return config
	}

	/**
	 * Step 1: Select AI provider
	 */
	private async selectProvider(): Promise<string | null> {
		console.log("📋 Step 1: Choose your AI provider")
		console.log("─".repeat(80))
		console.log("\nAvailable providers:")
		console.log("  1. Anthropic Claude (Recommended) - Most capable for coding")
		console.log("  2. OpenAI GPT - Good alternative with GPT-4")
		console.log("  3. OpenRouter - Access to multiple models")
		console.log("  4. Custom/Other - For custom API endpoints")
		console.log()

		const choice = await this.interactionHandler.askChoice("Select a provider:", [
			"anthropic",
			"openai",
			"openrouter",
			"custom",
		])

		if (!choice || choice === "custom") {
			console.log("\n⚠️  Custom providers require manual configuration.")
			console.log("Please edit ~/.mariecoder/cli/config.json after setup.\n")
			return "anthropic" // Default to anthropic for now
		}

		console.log(`✓ Selected: ${choice}\n`)
		return choice
	}

	/**
	 * Step 2: Configure API key
	 */
	private async configureApiKey(provider: string): Promise<string | null> {
		console.log("🔑 Step 2: API Key Configuration")
		console.log("─".repeat(80))

		// Check environment variables first
		const envKey = this.getApiKeyFromEnv(provider)
		if (envKey) {
			console.log(`✓ Found API key in environment variable`)
			const useEnvKey = await this.interactionHandler.askApproval("Use this API key?", true)
			if (useEnvKey) {
				return envKey
			}
		}

		// Show instructions for getting API key
		this.showApiKeyInstructions(provider)

		// Ask for API key
		const apiKey = await this.interactionHandler.askInput("\nEnter your API key (it will be stored securely)")

		if (!apiKey || apiKey.trim().length < 10) {
			console.log("\n❌ Invalid API key. Setup cancelled.")
			return null
		}

		// Validate API key format
		if (!this.validateApiKeyFormat(apiKey, provider)) {
			console.log("\n⚠️  Warning: API key format looks unusual for this provider.")
			const continueAnyway = await this.interactionHandler.askApproval("Continue anyway?", false)
			if (!continueAnyway) {
				return null
			}
		}

		console.log("✓ API key configured\n")
		return apiKey.trim()
	}

	/**
	 * Step 3: Select model
	 */
	private async selectModel(provider: string): Promise<string | null> {
		console.log("🤖 Step 3: Select AI Model")
		console.log("─".repeat(80))

		const models = this.getAvailableModels(provider)
		const recommended = this.getDefaultModel(provider)

		console.log("\nAvailable models:")
		models.forEach((model, index) => {
			const isRecommended = model === recommended ? " (Recommended)" : ""
			console.log(`  ${index + 1}. ${model}${isRecommended}`)
		})
		console.log()

		const choice = await this.interactionHandler.askChoice("Select a model:", models)

		if (!choice) {
			console.log(`Using recommended model: ${recommended}`)
			return recommended
		}

		console.log(`✓ Selected: ${choice}\n`)
		return choice
	}

	/**
	 * Step 4: Configure advanced settings (optional)
	 */
	private async configureAdvancedSettings(): Promise<{
		temperature?: number
		maxTokens?: number
	}> {
		console.log("⚙️  Step 4: Advanced Settings (Optional)")
		console.log("─".repeat(80))

		const wantsAdvanced = await this.interactionHandler.askApproval("Configure advanced settings?", false)

		if (!wantsAdvanced) {
			console.log("✓ Using default settings\n")
			return {}
		}

		const temperature = await this.interactionHandler.askInput("Temperature (0.0-1.0, higher = more creative)", "0.0")

		const maxTokens = await this.interactionHandler.askInput("Max tokens per response (leave empty for default)", "")

		console.log("✓ Advanced settings configured\n")

		return {
			temperature: temperature ? Number.parseFloat(temperature) : undefined,
			maxTokens: maxTokens ? Number.parseInt(maxTokens, 10) : undefined,
		}
	}

	/**
	 * Offer to create .clinerules directory
	 */
	private async offerClineRulesSetup(): Promise<void> {
		console.log("\n📝 Cline Rules Setup")
		console.log("─".repeat(80))
		console.log("\nCline Rules help MarieCoder follow your project's coding standards.")
		console.log("They're automatically loaded from .clinerules/ in your workspace.\n")

		const hasLocalRules = fs.existsSync(".clinerules")

		if (hasLocalRules) {
			console.log("✓ You already have a .clinerules directory in this workspace\n")
			return
		}

		const wantsSetup = await this.interactionHandler.askApproval("Create .clinerules directory with example?", false)

		if (!wantsSetup) {
			console.log("\nℹ️  You can create .clinerules/ anytime to add project standards.\n")
			return
		}

		try {
			// Create .clinerules directory
			fs.mkdirSync(".clinerules", { recursive: true })

			// Create example rule file
			const exampleRule = `# Project Coding Standards

## Code Style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

## File Naming
- Use descriptive names
- Follow language conventions

## Documentation
- Add README files for major features
- Document public APIs
- Keep comments up to date

## Testing
- Write tests for new features
- Ensure tests pass before committing

---
You can customize this file or add more .md files to .clinerules/
`
			fs.writeFileSync(".clinerules/standards.md", exampleRule)

			console.log("\n✓ Created .clinerules/standards.md")
			console.log("✓ You can edit this file to match your project's standards\n")
		} catch (error) {
			console.log(`\n⚠️  Could not create .clinerules: ${error}`)
			console.log("You can create it manually later.\n")
		}
	}

	/**
	 * Show setup summary
	 */
	private showSetupSummary(config: SetupConfig): void {
		console.log("\n" + "═".repeat(80))
		console.log("📋 Setup Summary")
		console.log("═".repeat(80))
		console.log(`  Provider: ${config.apiProvider}`)
		console.log(`  Model: ${config.apiModelId}`)
		console.log(`  API Key: ${this.maskApiKey(config.apiKey)}`)
		if (config.temperature !== undefined) {
			console.log(`  Temperature: ${config.temperature}`)
		}
		if (config.maxTokens !== undefined) {
			console.log(`  Max Tokens: ${config.maxTokens}`)
		}
		console.log(`  Config saved to: ${this.configDir}/config.json`)
		console.log("═".repeat(80))
	}

	/**
	 * Save configuration to disk
	 */
	private saveConfig(config: SetupConfig): void {
		// Ensure config directory exists
		fs.mkdirSync(this.configDir, { recursive: true })

		// Save config (excluding API key for security)
		const configPath = path.join(this.configDir, "config.json")
		const configToSave = {
			apiProvider: config.apiProvider,
			apiModelId: config.apiModelId,
			temperature: config.temperature,
			maxTokens: config.maxTokens,
			hasCompletedSetup: config.hasCompletedSetup,
		}
		fs.writeFileSync(configPath, JSON.stringify(configToSave, null, 2))

		// Save API key separately for better security
		const secretsPath = path.join(this.configDir, "secrets.json")
		const secrets = {
			[`${config.apiProvider}_api_key`]: config.apiKey,
		}
		fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 2))

		// Set restrictive permissions on secrets file (Unix-like systems)
		try {
			fs.chmodSync(secretsPath, 0o600) // Read/write for owner only
		} catch {
			// Windows doesn't support chmod, ignore
		}
	}

	/**
	 * Get API key from environment variables
	 */
	private getApiKeyFromEnv(provider: string): string | undefined {
		switch (provider) {
			case "anthropic":
				return process.env.ANTHROPIC_API_KEY
			case "openai":
				return process.env.OPENAI_API_KEY
			case "openrouter":
				return process.env.OPENROUTER_API_KEY
			default:
				return process.env.MARIE_API_KEY
		}
	}

	/**
	 * Validate API key format
	 */
	private validateApiKeyFormat(apiKey: string, provider: string): boolean {
		switch (provider) {
			case "anthropic":
				return apiKey.startsWith("sk-ant-")
			case "openai":
				return apiKey.startsWith("sk-")
			case "openrouter":
				return apiKey.startsWith("sk-")
			default:
				return true // Unknown provider, accept anything
		}
	}

	/**
	 * Show instructions for getting an API key
	 */
	private showApiKeyInstructions(provider: string): void {
		console.log("\nTo get your API key:\n")

		switch (provider) {
			case "anthropic":
				console.log("  1. Visit: https://console.anthropic.com/")
				console.log("  2. Sign up or log in")
				console.log("  3. Go to API Keys section")
				console.log("  4. Create a new API key")
				console.log("\n  Format: sk-ant-...")
				break

			case "openai":
				console.log("  1. Visit: https://platform.openai.com/api-keys")
				console.log("  2. Sign up or log in")
				console.log("  3. Create a new API key")
				console.log("\n  Format: sk-...")
				break

			case "openrouter":
				console.log("  1. Visit: https://openrouter.ai/keys")
				console.log("  2. Sign up or log in")
				console.log("  3. Generate an API key")
				console.log("\n  Format: sk-...")
				break

			default:
				console.log("  Please refer to your provider's documentation")
		}
	}

	/**
	 * Get available models for a provider
	 */
	private getAvailableModels(provider: string): string[] {
		switch (provider) {
			case "anthropic":
				return [
					"claude-3-5-sonnet-20241022",
					"claude-3-5-haiku-20241022",
					"claude-3-opus-20240229",
					"claude-3-haiku-20240307",
				]

			case "openai":
				return ["gpt-4-turbo-preview", "gpt-4", "gpt-4o", "gpt-3.5-turbo"]

			case "openrouter":
				return ["anthropic/claude-3.5-sonnet", "openai/gpt-4-turbo", "google/gemini-pro", "meta-llama/llama-3-70b"]

			default:
				return ["default"]
		}
	}

	/**
	 * Get default/recommended model for a provider
	 */
	private getDefaultModel(provider: string): string {
		switch (provider) {
			case "anthropic":
				return "claude-3-5-sonnet-20241022"
			case "openai":
				return "gpt-4-turbo-preview"
			case "openrouter":
				return "anthropic/claude-3.5-sonnet"
			default:
				return "default"
		}
	}

	/**
	 * Mask API key for display
	 */
	private maskApiKey(apiKey: string): string {
		if (apiKey.length <= 8) {
			return "*".repeat(apiKey.length)
		}
		return apiKey.substring(0, 4) + "*".repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4)
	}

	/**
	 * Close the interaction handler
	 */
	close(): void {
		this.interactionHandler.close()
	}
}
