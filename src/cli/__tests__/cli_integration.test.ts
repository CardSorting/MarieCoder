/**
 * Integration Tests for CLI
 * Tests end-to-end workflows and component integration
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { expect } from "chai"
import sinon from "sinon"
import { CliConfigManager } from "../cli_config_manager"

describe("CLI Integration Tests", () => {
	// For integration tests, we'll use a real config directory and clean it up
	// This is more realistic than trying to mock os.homedir
	let configManager: CliConfigManager
	let testConfigDir: string

	beforeEach(() => {
		configManager = new CliConfigManager()
		testConfigDir = configManager.getConfigDir()

		// Clean up any existing test config
		if (fs.existsSync(testConfigDir)) {
			fs.rmSync(testConfigDir, { recursive: true, force: true })
		}
	})

	afterEach(() => {
		sinon.restore()

		// Clean up test config directory
		if (fs.existsSync(testConfigDir)) {
			fs.rmSync(testConfigDir, { recursive: true, force: true })
		}
	})

	describe("Configuration Workflow", () => {
		it("should complete full configuration lifecycle", () => {
			const configManager = new CliConfigManager()

			// 1. Check initial state - no config
			expect(configManager.hasConfiguration()).to.be.false
			expect(configManager.hasCompletedSetup()).to.be.false

			// 2. Save configuration
			const config = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
				apiKey: "sk-ant-test-key-123",
				temperature: 0.5,
				maxTokens: 4096,
				hasCompletedSetup: true,
			}

			configManager.saveConfig(config)

			// 3. Verify config exists
			expect(configManager.hasConfiguration()).to.be.true
			expect(configManager.hasCompletedSetup()).to.be.true

			// 4. Load and verify
			configManager.clearCache()
			const loaded = configManager.loadConfig()

			expect(loaded.apiProvider).to.equal(config.apiProvider)
			expect(loaded.apiModelId).to.equal(config.apiModelId)
			expect(loaded.apiKey).to.equal(config.apiKey)
			expect(loaded.temperature).to.equal(config.temperature)

			// 5. Update configuration
			configManager.updateConfig({ temperature: 0.8 })
			configManager.clearCache()
			const updated = configManager.loadConfig()

			expect(updated.temperature).to.equal(0.8)
			expect(updated.apiProvider).to.equal(config.apiProvider) // Preserved

			// 6. Reset configuration
			configManager.resetConfig()
			expect(configManager.hasConfiguration()).to.be.false
		})

		it("should handle plan/act mode configuration workflow", () => {
			const configManager = new CliConfigManager()

			// 1. Set up with separate models
			const config = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
				apiKey: "test-key",
				mode: "plan" as const,
				planActSeparateModelsSetting: true,
				planModeApiProvider: "anthropic",
				planModeApiModelId: "claude-3-5-sonnet-20241022",
				actModeApiProvider: "openai",
				actModeApiModelId: "gpt-4",
			}

			configManager.saveConfig(config)

			// 2. Load and verify mode settings
			configManager.clearCache()
			const loaded = configManager.loadConfig()

			expect(loaded.mode).to.equal("plan")
			expect(loaded.planActSeparateModelsSetting).to.be.true
			expect(loaded.planModeApiModelId).to.equal("claude-3-5-sonnet-20241022")
			expect(loaded.actModeApiModelId).to.equal("gpt-4")

			// 3. Toggle mode
			configManager.updateConfig({ mode: "act" })
			configManager.clearCache()
			const toggled = configManager.loadConfig()

			expect(toggled.mode).to.equal("act")
			expect(toggled.planActSeparateModelsSetting).to.be.true // Preserved
		})
	})

	describe("Configuration with Environment Variables", () => {
		it("should merge environment variables into configuration", () => {
			// Set environment variables
			process.env.ANTHROPIC_API_KEY = "env-api-key"
			process.env.MARIE_MODEL = "env-model"
			process.env.MARIE_TEMPERATURE = "0.7"

			const configManager = new CliConfigManager()

			// Save partial config
			configManager.saveConfig({
				apiProvider: "anthropic",
			})

			// Load should merge env vars
			configManager.clearCache()
			const loaded = configManager.loadConfig()

			expect(loaded.apiKey).to.equal("env-api-key")
			expect(loaded.apiModelId).to.equal("env-model")
			expect(loaded.temperature).to.equal(0.7)

			// Cleanup
			delete process.env.ANTHROPIC_API_KEY
			delete process.env.MARIE_MODEL
			delete process.env.MARIE_TEMPERATURE
		})

		it("should prioritize file config over environment variables", () => {
			process.env.ANTHROPIC_API_KEY = "env-key"

			const configManager = new CliConfigManager()

			// Save config with explicit key
			configManager.saveConfig({
				apiProvider: "anthropic",
				apiKey: "file-key",
			})

			configManager.clearCache()
			const loaded = configManager.loadConfig()

			// File config should win
			expect(loaded.apiKey).to.equal("file-key")

			delete process.env.ANTHROPIC_API_KEY
		})
	})

	describe("Configuration Validation Workflow", () => {
		it("should validate configuration before use", () => {
			const configManager = new CliConfigManager()

			// Invalid config - missing required fields
			const invalidConfig = {
				temperature: 0.5,
			}

			const validation = configManager.validateConfig(invalidConfig)

			expect(validation.valid).to.be.false
			expect(validation.errors).to.have.lengthOf(3) // Missing key, provider, model
			expect(validation.errors).to.include("API key is required")
			expect(validation.errors).to.include("API provider is required")
			expect(validation.errors).to.include("API model is required")
		})

		it("should validate temperature and maxTokens ranges", () => {
			const configManager = new CliConfigManager()

			const invalidConfig = {
				apiProvider: "anthropic",
				apiModelId: "test",
				apiKey: "test",
				temperature: 2.0, // Invalid
				maxTokens: -100, // Invalid
			}

			const validation = configManager.validateConfig(invalidConfig)

			expect(validation.valid).to.be.false
			expect(validation.errors).to.include("Temperature must be between 0.0 and 1.0")
			expect(validation.errors).to.include("Max tokens must be positive")
		})
	})

	describe("Multiple Configuration Files", () => {
		it("should handle multiple provider API keys", () => {
			const configManager = new CliConfigManager()

			// Save Anthropic key
			configManager.saveConfig({
				apiProvider: "anthropic",
				apiKey: "anthropic-key",
			})

			// Switch to OpenAI
			configManager.updateConfig({
				apiProvider: "openai",
			})
			configManager.saveApiKey("openai-key", "openai")

			// Load with OpenAI provider
			configManager.clearCache()
			const loaded = configManager.loadConfig()

			expect(loaded.apiKey).to.equal("openai-key")
		})
	})

	describe("Error Recovery", () => {
		it("should recover from corrupted configuration files", () => {
			const configManager = new CliConfigManager()

			// Create valid config first
			configManager.saveConfig({
				apiProvider: "anthropic",
				apiKey: "test-key",
			})

			// Corrupt the config file
			const configPath = path.join(configManager.getConfigDir(), "config.json")
			fs.writeFileSync(configPath, "{ invalid json }")

			// Should handle gracefully
			const consoleWarnStub = sinon.stub(console, "warn")
			configManager.clearCache()
			const loaded = configManager.loadConfig()

			expect(loaded).to.be.an("object")
			expect(consoleWarnStub.called).to.be.true

			consoleWarnStub.restore()
		})

		it("should recover from corrupted secrets file", () => {
			const configManager = new CliConfigManager()

			// Create valid config
			configManager.saveConfig({
				apiProvider: "anthropic",
			})

			// Corrupt secrets file
			const secretsPath = path.join(configManager.getConfigDir(), "secrets.json")
			fs.writeFileSync(secretsPath, "not json")

			// Should handle gracefully
			const consoleWarnStub = sinon.stub(console, "warn")
			configManager.clearCache()
			const loaded = configManager.loadConfig()

			expect(loaded).to.be.an("object")
			expect(consoleWarnStub.called).to.be.true

			consoleWarnStub.restore()
		})
	})

	describe("Terminal Output Configuration", () => {
		it("should persist terminal output settings", () => {
			const configManager = new CliConfigManager()

			const config = {
				apiProvider: "anthropic",
				terminalOutputLineLimit: 1000,
				shellIntegrationTimeout: 60000,
				terminalReuseEnabled: false,
			}

			configManager.saveConfig(config)
			configManager.clearCache()
			const loaded = configManager.loadConfig()

			expect(loaded.terminalOutputLineLimit).to.equal(1000)
			expect(loaded.shellIntegrationTimeout).to.equal(60000)
			expect(loaded.terminalReuseEnabled).to.be.false
		})

		it("should use default terminal settings when not configured", () => {
			const configManager = new CliConfigManager()

			configManager.saveConfig({
				apiProvider: "anthropic",
			})

			configManager.clearCache()
			const loaded = configManager.loadConfig()

			expect(loaded.terminalOutputLineLimit).to.be.undefined
			expect(loaded.shellIntegrationTimeout).to.be.undefined
			expect(loaded.terminalReuseEnabled).to.be.undefined
		})
	})

	describe("Task History Configuration", () => {
		it("should save and load task history limit", () => {
			const configManager = new CliConfigManager()

			configManager.saveConfig({
				apiProvider: "anthropic",
				taskHistoryLimit: 50,
			})

			configManager.clearCache()
			const loaded = configManager.loadConfig()

			expect(loaded.taskHistoryLimit).to.equal(50)
		})
	})

	describe("Configuration Merging with Command-Line Options", () => {
		it("should correctly merge all option types", () => {
			const configManager = new CliConfigManager()

			// Save base config
			configManager.saveConfig({
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
				temperature: 0.3,
			})

			// Merge with CLI options
			const options = {
				apiKey: "cli-key",
				temperature: 0.8,
				verbose: true,
				autoApprove: true,
				terminalOutputLineLimit: 500,
			}

			const merged = configManager.mergeWithOptions(options)

			// CLI options should override
			expect(merged.temperature).to.equal(0.8)
			expect(merged.apiKey).to.equal("cli-key")
			expect(merged.verbose).to.be.true
			expect(merged.autoApprove).to.be.true
			expect(merged.terminalOutputLineLimit).to.equal(500)

			// File config should be preserved
			expect(merged.apiProvider).to.equal("anthropic")
			expect(merged.apiModelId).to.equal("claude-3-5-sonnet-20241022")
		})

		it("should handle boolean false values correctly", () => {
			const configManager = new CliConfigManager()

			configManager.saveConfig({
				apiProvider: "anthropic",
				verbose: true,
			})

			const merged = configManager.mergeWithOptions({
				verbose: false,
			})

			expect(merged.verbose).to.be.false
		})
	})

	describe("API Key Security", () => {
		it("should never store API key in main config file", () => {
			const configManager = new CliConfigManager()

			configManager.saveConfig({
				apiProvider: "anthropic",
				apiKey: "secret-key-123",
			})

			// Read main config file directly
			const configPath = path.join(configManager.getConfigDir(), "config.json")
			const configFile = JSON.parse(fs.readFileSync(configPath, "utf-8"))

			expect(configFile.apiKey).to.be.undefined
		})

		it("should store API key in separate secrets file", () => {
			const configManager = new CliConfigManager()

			configManager.saveConfig({
				apiProvider: "anthropic",
				apiKey: "secret-key-123",
			})

			// Read secrets file
			const secretsPath = path.join(configManager.getConfigDir(), "secrets.json")
			const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf-8"))

			expect(secrets.anthropic_api_key).to.equal("secret-key-123")
		})
	})
})
