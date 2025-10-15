/**
 * CLI Setup Wizard
 * Interactive first-time setup experience for MarieCoder CLI
 */

import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { type AnthropicModelId, anthropicDefaultModelId, anthropicModels, openRouterDefaultModelId } from "@/shared/api"
import { CliInteractionHandler } from "./cli_interaction_handler"
import { output } from "./cli_output"

export interface SetupConfig {
	apiProvider: string
	apiKey: string
	apiModelId: string
	temperature?: number
	maxTokens?: number
	hasCompletedSetup: boolean
	// Plan/Act mode configuration
	mode?: "plan" | "act"
	planActSeparateModelsSetting?: boolean
	planModeApiProvider?: string
	planModeApiModelId?: string
	actModeApiProvider?: string
	actModeApiModelId?: string
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
	 * Run the interactive setup wizard (streamlined 3-step process)
	 */
	async runSetupWizard(): Promise<SetupConfig | null> {
		output.log("\n" + "═".repeat(80))
		output.log("🎉 Welcome to MarieCoder CLI")
		output.log("═".repeat(80))
		output.log("\nQuick setup - just 3 steps to get started!\n")

		try {
			// Step 1: Provider & API Key (combined)
			const { provider, apiKey } = await this.configureProviderAndKey()
			if (!provider || !apiKey) {
				return null
			}

			// Step 2: Select model (with smart defaults)
			const model = await this.selectModel(provider)
			if (!model) {
				return null
			}

			// Step 3: Optional extras (rules, advanced settings)
			const extras = await this.configureOptionalExtras()

			// Save configuration
			const config: SetupConfig = {
				apiProvider: provider,
				apiKey: apiKey,
				apiModelId: model,
				temperature: extras.temperature,
				maxTokens: extras.maxTokens,
				hasCompletedSetup: true,
			}

			this.saveConfig(config)

			// Show setup summary
			this.showSetupSummary(config)

			output.log("\n✅ Setup complete! You're ready to start coding with MarieCoder.\n")

			return config
		} catch (error) {
			console.error("\n❌ Setup failed:", error)
			return null
		}
	}

	/**
	 * Quick setup for users who already have config elsewhere
	 */
	/**
	 * Quick setup for users who already have partial config
	 */
	async quickSetup(existingApiKey?: string, existingProvider?: string): Promise<SetupConfig | null> {
		output.log("\n⚡ Quick Setup")
		output.log("─".repeat(80))

		const provider = existingProvider || "anthropic"
		const apiKey = existingApiKey || ""

		if (!apiKey) {
			output.log("API key required for quick setup")
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
		output.log("✅ Configuration saved!\n")

		return config
	}

	/**
	 * Step 1: Configure provider and API key (combined for efficiency)
	 */
	private async configureProviderAndKey(): Promise<{ provider: string; apiKey: string } | { provider: null; apiKey: null }> {
		output.log("🔑 Step 1: Provider & API Key")
		output.log("─".repeat(80))

		// Check for existing environment variables
		const anthropicEnvKey = process.env.ANTHROPIC_API_KEY
		const openRouterEnvKey = process.env.OPENROUTER_API_KEY

		// Auto-detect provider from environment
		if (anthropicEnvKey) {
			output.log("✓ Found ANTHROPIC_API_KEY in environment")
			const useIt = await this.interactionHandler.askApproval("Use Anthropic with this key?", true)
			if (useIt) {
				output.log("✓ Using Anthropic\n")
				return { provider: "anthropic", apiKey: anthropicEnvKey }
			}
		}

		if (openRouterEnvKey) {
			output.log("✓ Found OPENROUTER_API_KEY in environment")
			const useIt = await this.interactionHandler.askApproval("Use OpenRouter with this key?", true)
			if (useIt) {
				output.log("✓ Using OpenRouter\n")
				return { provider: "openrouter", apiKey: openRouterEnvKey }
			}
		}

		// Manual selection
		output.log("\nSelect your AI provider:")
		output.log("  1. Anthropic Claude (Recommended) - Best for coding")
		output.log("  2. OpenRouter - Access to 100+ models")
		output.log("  3. LM Studio - Run models locally")
		output.log()

		const choice = await this.interactionHandler.askChoice("Select provider:", ["anthropic", "openrouter", "lmstudio"])

		if (!choice) {
			output.log("\n❌ No provider selected. Setup cancelled.")
			return { provider: null, apiKey: null }
		}

		output.log(`✓ Selected: ${choice}`)

		// LM Studio doesn't need an API key
		if (choice === "lmstudio") {
			output.log("✓ LM Studio uses local models (no API key needed)\n")
			return { provider: "lmstudio", apiKey: "local" }
		}

		// Get API key
		this.showApiKeyInstructions(choice)
		const apiKey = await this.interactionHandler.askInput("\nEnter your API key (stored securely)")

		if (!apiKey || apiKey.trim().length < 10) {
			output.log("\n❌ Invalid API key. Setup cancelled.")
			return { provider: null, apiKey: null }
		}

		// Quick format validation
		if (!this.validateApiKeyFormat(apiKey, choice)) {
			output.log("\n⚠️  Warning: API key format looks unusual.")
			const continueAnyway = await this.interactionHandler.askApproval("Continue anyway?", false)
			if (!continueAnyway) {
				return { provider: null, apiKey: null }
			}
		}

		output.log("✓ API key configured\n")
		return { provider: choice, apiKey: apiKey.trim() }
	}

	/**
	 * Step 2: Select model (streamlined with smart defaults + custom entry)
	 */
	private async selectModel(provider: string): Promise<string | null> {
		output.log("🤖 Step 2: Select Model")
		output.log("─".repeat(80))

		const defaultModel = this.getDefaultModel(provider)

		// For most users, the default is perfect
		output.log(`\nRecommended: ${defaultModel}`)
		const useDefault = await this.interactionHandler.askApproval("Use recommended model?", true)

		if (useDefault) {
			output.log(`✓ Using: ${defaultModel}\n`)
			return defaultModel
		}

		// Offer custom model entry or list selection
		output.log("\nOptions:")
		output.log("  1. Enter a custom model code (e.g., openai/gpt-4-turbo, anthropic/claude-3.5-sonnet)")
		output.log("  2. Choose from popular models list")
		output.log()

		const wantsCustom = await this.interactionHandler.askApproval("Enter custom model code?", false)

		if (wantsCustom) {
			return await this.enterCustomModel(provider, defaultModel)
		}

		// Show alternatives from list
		return await this.selectFromModelList(provider, defaultModel)
	}

	/**
	 * Enter a custom model code
	 */
	private async enterCustomModel(provider: string, defaultModel: string): Promise<string | null> {
		output.log("\nEnter model code:")

		// Show helpful examples based on provider
		if (provider === "openrouter") {
			output.log("  Examples:")
			output.log("    • openai/gpt-4-turbo")
			output.log("    • anthropic/claude-3.5-sonnet")
			output.log("    • google/gemini-pro-1.5")
			output.log("    • meta-llama/llama-3.3-70b-instruct")
			output.log("    • openai/gpt-oss-20b:free (free models)")
			output.log("\n  Find models at: https://openrouter.ai/models")
		} else if (provider === "anthropic") {
			output.log("  Examples:")
			output.log("    • claude-sonnet-4-5-20250929")
			output.log("    • claude-opus-4-1-20250805")
			output.log("    • claude-3-5-sonnet-20241022")
		} else if (provider === "lmstudio") {
			output.log("  Enter the exact model name from your LM Studio")
			output.log("  Example: llama-3.1-8b-instruct")
		}

		const customModel = await this.interactionHandler.askInput("\nModel code", "")

		if (!customModel || customModel.trim().length === 0) {
			output.log(`Using default: ${defaultModel}`)
			return defaultModel
		}

		const trimmedModel = customModel.trim()

		// Basic validation
		if (provider === "openrouter" && !trimmedModel.includes("/")) {
			output.log("\n⚠️  OpenRouter models should include provider prefix (e.g., 'anthropic/claude-3.5-sonnet')")
			const continueAnyway = await this.interactionHandler.askApproval("Use anyway?", false)
			if (!continueAnyway) {
				return defaultModel
			}
		}

		output.log(`✓ Using custom model: ${trimmedModel}\n`)
		return trimmedModel
	}

	/**
	 * Select from curated model list
	 */
	private async selectFromModelList(provider: string, defaultModel: string): Promise<string | null> {
		const models = this.getAvailableModels(provider)
		output.log("\nPopular models:")
		models.forEach((model, index) => {
			const tag = model === defaultModel ? " (recommended)" : ""
			output.log(`  ${index + 1}. ${model}${tag}`)
		})
		output.log()

		const choice = await this.interactionHandler.askChoice("Select a model:", models)
		const selectedModel = choice || defaultModel

		output.log(`✓ Selected: ${selectedModel}\n`)
		return selectedModel
	}

	/**
	 * Step 3: Configure optional extras (combined: rules, advanced settings, plan/act mode)
	 */
	private async configureOptionalExtras(): Promise<{
		temperature?: number
		maxTokens?: number
		mode?: "plan" | "act"
		planActSeparateModelsSetting?: boolean
		planModeApiProvider?: string
		planModeApiModelId?: string
		actModeApiProvider?: string
		actModeApiModelId?: string
	}> {
		output.log("⚙️  Step 3: Optional Configuration")
		output.log("─".repeat(80))

		const wantsExtras = await this.interactionHandler.askApproval(
			"Configure optional features? (plan/act mode, rules, advanced settings)",
			false,
		)

		if (!wantsExtras) {
			output.log("✓ Using defaults (you can configure these later)\n")
			return { mode: "act" }
		}

		// Plan/Act Mode Configuration
		output.log("\nPlan/Act Mode:")
		output.log("  • Plan Mode: AI proposes changes for your review (safer)")
		output.log("  • Act Mode: AI executes changes directly (faster)")

		const wantsPlanActSetup = await this.interactionHandler.askApproval(
			"  Configure separate models for plan and act modes?",
			false,
		)

		let planActConfig = {}
		if (wantsPlanActSetup) {
			planActConfig = await this.configurePlanActMode()
		} else {
			const defaultMode = await this.interactionHandler.askApproval("  Start in plan mode (safer)?", false)
			planActConfig = { mode: defaultMode ? "plan" : "act" }
		}

		// Offer .clinerules setup
		await this.offerClineRulesSetup()

		// Advanced settings
		output.log("\nAdvanced Settings:")
		const wantsAdvanced = await this.interactionHandler.askApproval("  Configure temperature/tokens?", false)

		if (!wantsAdvanced) {
			return { ...planActConfig }
		}

		const temperature = await this.interactionHandler.askInput("  Temperature (0.0-1.0)", "0.0")
		const maxTokens = await this.interactionHandler.askInput("  Max tokens (leave empty for default)", "")

		output.log("✓ Settings configured\n")

		return {
			...planActConfig,
			temperature: temperature ? Number.parseFloat(temperature) : undefined,
			maxTokens: maxTokens ? Number.parseInt(maxTokens, 10) : undefined,
		}
	}

	/**
	 * Configure plan/act mode with separate models
	 */
	private async configurePlanActMode(): Promise<{
		mode: "plan" | "act"
		planActSeparateModelsSetting: boolean
		planModeApiProvider?: string
		planModeApiModelId?: string
		actModeApiProvider?: string
		actModeApiModelId?: string
	}> {
		output.log("\n⚙️  Plan/Act Mode Setup")
		output.log("─".repeat(80))

		// Select plan mode configuration
		output.log("\nPlan Mode Configuration:")
		output.log("  (Use a cheaper/faster model for planning)")
		const planProvider = await this.interactionHandler.askChoice("Plan mode provider:", [
			"anthropic",
			"openrouter",
			"lmstudio",
		])
		const planDefaultModel = this.getDefaultModel(planProvider || "anthropic")
		const usePlanDefault = await this.interactionHandler.askApproval(`Use ${planDefaultModel} for plan mode?`, true)
		const planModel = usePlanDefault
			? planDefaultModel
			: await this.interactionHandler.askInput("Plan mode model:", planDefaultModel)

		// Select act mode configuration
		output.log("\nAct Mode Configuration:")
		output.log("  (Use a powerful model for execution)")
		const actProvider = await this.interactionHandler.askChoice("Act mode provider:", ["anthropic", "openrouter", "lmstudio"])
		const actDefaultModel = this.getDefaultModel(actProvider || "anthropic")
		const useActDefault = await this.interactionHandler.askApproval(`Use ${actDefaultModel} for act mode?`, true)
		const actModel = useActDefault
			? actDefaultModel
			: await this.interactionHandler.askInput("Act mode model:", actDefaultModel)

		// Default mode
		const startInPlanMode = await this.interactionHandler.askApproval("Start in plan mode (safer)?", true)

		output.log("\n✓ Plan/Act mode configured:")
		output.log(`  Plan: ${planProvider} / ${planModel}`)
		output.log(`  Act: ${actProvider} / ${actModel}`)
		output.log(`  Default: ${startInPlanMode ? "plan" : "act"} mode\n`)

		return {
			mode: startInPlanMode ? "plan" : "act",
			planActSeparateModelsSetting: true,
			planModeApiProvider: planProvider || undefined,
			planModeApiModelId: planModel,
			actModeApiProvider: actProvider || undefined,
			actModeApiModelId: actModel,
		}
	}

	/**
	 * Offer to create .clinerules directory
	 */
	private async offerClineRulesSetup(): Promise<void> {
		const hasLocalRules = fs.existsSync(".clinerules")

		if (hasLocalRules) {
			output.log("✓ You already have .clinerules/ setup\n")
			return
		}

		const wantsSetup = await this.interactionHandler.askApproval(
			"  Create .clinerules/ with coding standards template?",
			false,
		)

		if (!wantsSetup) {
			return
		}

		try {
			fs.mkdirSync(".clinerules", { recursive: true })
			const exampleRule = `# Project Coding Standards

## Code Style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

## Documentation
- Document public APIs
- Keep comments up to date

---
Customize this file to match your project's standards.
`
			fs.writeFileSync(".clinerules/standards.md", exampleRule)
			output.log("  ✓ Created .clinerules/standards.md\n")
		} catch (error) {
			output.log(`  ⚠️  Could not create .clinerules: ${error}\n`)
		}
	}

	/**
	 * Show setup summary
	 */
	private showSetupSummary(config: SetupConfig): void {
		output.log("\n" + "═".repeat(80))
		output.log("📋 Setup Summary")
		output.log("═".repeat(80))
		output.log(`  Provider: ${config.apiProvider}`)
		output.log(`  Model: ${config.apiModelId}`)
		output.log(`  API Key: ${this.maskApiKey(config.apiKey)}`)
		if (config.temperature !== undefined) {
			output.log(`  Temperature: ${config.temperature}`)
		}
		if (config.maxTokens !== undefined) {
			output.log(`  Max Tokens: ${config.maxTokens}`)
		}
		if (config.planActSeparateModelsSetting) {
			output.log(`  Mode: ${config.mode || "act"} (Plan/Act configured separately)`)
			output.log(`  Plan Mode: ${config.planModeApiProvider} / ${config.planModeApiModelId}`)
			output.log(`  Act Mode: ${config.actModeApiProvider} / ${config.actModeApiModelId}`)
		} else {
			output.log(`  Mode: ${config.mode || "act"}`)
		}
		output.log(`  Config saved to: ${this.configDir}/config.json`)
		output.log("═".repeat(80))
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
			mode: config.mode || "act",
			planActSeparateModelsSetting: config.planActSeparateModelsSetting || false,
			planModeApiProvider: config.planModeApiProvider,
			planModeApiModelId: config.planModeApiModelId,
			actModeApiProvider: config.actModeApiProvider,
			actModeApiModelId: config.actModeApiModelId,
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
		output.log("\nTo get your API key:\n")

		switch (provider) {
			case "anthropic":
				output.log("  1. Visit: https://console.anthropic.com/")
				output.log("  2. Sign up or log in")
				output.log("  3. Go to API Keys section")
				output.log("  4. Create a new API key")
				output.log("\n  Format: sk-ant-...")
				break

			case "openai":
				output.log("  1. Visit: https://platform.openai.com/api-keys")
				output.log("  2. Sign up or log in")
				output.log("  3. Create a new API key")
				output.log("\n  Format: sk-...")
				break

			case "openrouter":
				output.log("  1. Visit: https://openrouter.ai/keys")
				output.log("  2. Sign up or log in")
				output.log("  3. Generate an API key")
				output.log("\n  Format: sk-...")
				break

			default:
				output.log("  Please refer to your provider's documentation")
		}
	}

	/**
	 * Get available models for a provider (dynamically from shared definitions)
	 * Returns a curated list of popular/recommended models
	 */
	private getAvailableModels(provider: string): string[] {
		switch (provider) {
			case "anthropic": {
				// Get all Anthropic model IDs from shared definitions
				const models = Object.keys(anthropicModels) as AnthropicModelId[]
				// Filter to show most relevant models (exclude some legacy ones)
				return models
					.filter((id) => id.includes("sonnet-4") || id.includes("opus-4") || id.includes("3-7") || id.includes("3-5"))
					.slice(0, 8) // Show top 8 most relevant
			}

			case "openrouter":
				// Most popular OpenRouter models (curated list)
				return [
					"anthropic/claude-sonnet-4.5",
					"anthropic/claude-3.5-sonnet",
					"openai/gpt-4-turbo",
					"openai/gpt-4o",
					"google/gemini-pro-1.5",
					"google/gemini-flash-1.5",
					"meta-llama/llama-3.3-70b-instruct",
					"qwen/qwen-2.5-72b-instruct",
				]

			case "lmstudio":
				// LM Studio uses local models - user needs to enter their model name
				return ["<enter-your-model-name>"]

			default:
				return ["default"]
		}
	}

	/**
	 * Get default/recommended model for a provider (from shared definitions)
	 */
	private getDefaultModel(provider: string): string {
		switch (provider) {
			case "anthropic":
				return anthropicDefaultModelId // Dynamically from shared API
			case "openrouter":
				return openRouterDefaultModelId // Dynamically from shared API
			case "lmstudio":
				return "local-model"
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
