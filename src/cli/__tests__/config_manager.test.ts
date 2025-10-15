/**
 * Tests for CLI Configuration Manager
 * Critical area: Configuration loading, saving, and validation
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { expect } from "chai"
import sinon from "sinon"
import { CliConfigManager, type CliConfiguration } from "../config/config_manager"

describe("CliConfigManager", () => {
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

	describe("Configuration Directory", () => {
		it("should create configuration directory if it doesn't exist", () => {
			configManager.ensureConfigDirExists()
			const configDir = configManager.getConfigDir()
			expect(fs.existsSync(configDir)).to.be.true
		})

		it("should use correct configuration directory path", () => {
			const configDir = configManager.getConfigDir()
			expect(configDir).to.include(".mariecoder")
			expect(configDir).to.include("cli")
		})

		it("should not error if directory already exists", () => {
			configManager.ensureConfigDirExists()
			expect(() => configManager.ensureConfigDirExists()).to.not.throw()
		})
	})

	describe("Configuration Loading", () => {
		it("should return empty config when no files exist", () => {
			const config = configManager.loadConfig()
			expect(config).to.be.an("object")
			expect(config.apiKey).to.be.undefined
		})

		it("should load config from file", () => {
			const testConfig: CliConfiguration = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
				temperature: 0.5,
				maxTokens: 4096,
			}

			configManager.saveConfig(testConfig)
			const loaded = configManager.loadConfig()

			expect(loaded.apiProvider).to.equal(testConfig.apiProvider)
			expect(loaded.apiModelId).to.equal(testConfig.apiModelId)
			expect(loaded.temperature).to.equal(testConfig.temperature)
			expect(loaded.maxTokens).to.equal(testConfig.maxTokens)
		})

		it("should load API key from secrets file", () => {
			const testConfig: CliConfiguration = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
				apiKey: "sk-ant-test-key-123",
			}

			configManager.saveConfig(testConfig)
			configManager.clearCache() // Clear cache to force reload
			const loaded = configManager.loadConfig()

			expect(loaded.apiKey).to.equal(testConfig.apiKey)
		})

		it("should cache configuration after first load", () => {
			const testConfig: CliConfiguration = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
			}

			configManager.saveConfig(testConfig)
			const first = configManager.loadConfig()

			// Modify the file directly
			const configPath = path.join(configManager.getConfigDir(), "config.json")
			const modified = { ...testConfig, apiProvider: "openai" }
			fs.writeFileSync(configPath, JSON.stringify(modified))

			// Should still return cached version
			const second = configManager.loadConfig()
			expect(second.apiProvider).to.equal(first.apiProvider)
		})

		it("should reload config after cache clear", () => {
			const testConfig: CliConfiguration = {
				apiProvider: "anthropic",
			}

			configManager.saveConfig(testConfig)
			configManager.loadConfig()

			// Modify and clear cache
			configManager.clearCache()
			const configPath = path.join(configManager.getConfigDir(), "config.json")
			const modified = { apiProvider: "openai" }
			fs.writeFileSync(configPath, JSON.stringify(modified))

			const reloaded = configManager.loadConfig()
			expect(reloaded.apiProvider).to.equal("openai")
		})

		it("should handle corrupted config file gracefully", () => {
			configManager.ensureConfigDirExists()
			const configPath = path.join(configManager.getConfigDir(), "config.json")
			fs.writeFileSync(configPath, "{ invalid json }")

			const consoleWarnStub = sinon.stub(console, "warn")
			const config = configManager.loadConfig()

			expect(config).to.be.an("object")
			expect(consoleWarnStub.called).to.be.true

			consoleWarnStub.restore()
		})
	})

	describe("Configuration Saving", () => {
		it("should save configuration to file", () => {
			const testConfig: CliConfiguration = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
			}

			configManager.saveConfig(testConfig)

			const configPath = path.join(configManager.getConfigDir(), "config.json")
			expect(fs.existsSync(configPath)).to.be.true

			const saved = JSON.parse(fs.readFileSync(configPath, "utf-8"))
			expect(saved.apiProvider).to.equal(testConfig.apiProvider)
		})

		it("should save API key to separate secrets file", () => {
			const testConfig: CliConfiguration = {
				apiProvider: "anthropic",
				apiKey: "sk-ant-test-key-123",
			}

			configManager.saveConfig(testConfig)

			const secretsPath = path.join(configManager.getConfigDir(), "secrets.json")
			expect(fs.existsSync(secretsPath)).to.be.true

			const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf-8"))
			expect(secrets.anthropic_api_key).to.equal(testConfig.apiKey)
		})

		it("should not save API key to main config file", () => {
			const testConfig: CliConfiguration = {
				apiProvider: "anthropic",
				apiKey: "sk-ant-test-key-123",
			}

			configManager.saveConfig(testConfig)

			const configPath = path.join(configManager.getConfigDir(), "config.json")
			const saved = JSON.parse(fs.readFileSync(configPath, "utf-8"))

			expect(saved.apiKey).to.be.undefined
		})

		it("should set restrictive permissions on secrets file", function () {
			// Skip on Windows
			if (process.platform === "win32") {
				this.skip()
				return
			}

			const testConfig: CliConfiguration = {
				apiProvider: "anthropic",
				apiKey: "sk-ant-test-key-123",
			}

			configManager.saveConfig(testConfig)

			const secretsPath = path.join(configManager.getConfigDir(), "secrets.json")
			const stats = fs.statSync(secretsPath)
			const mode = stats.mode & 0o777

			// Should be 0o600 (read/write for owner only)
			expect(mode).to.equal(0o600)
		})

		it("should update cache after saving", () => {
			const testConfig: CliConfiguration = {
				apiProvider: "anthropic",
			}

			configManager.saveConfig(testConfig)

			// Should return cached version without reading file
			const loaded = configManager.loadConfig()
			expect(loaded.apiProvider).to.equal(testConfig.apiProvider)
		})
	})

	describe("Configuration Validation", () => {
		it("should validate complete configuration", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
				apiKey: "sk-ant-test-key-123",
			}

			const result = configManager.validateConfig(config)
			expect(result.valid).to.be.true
			expect(result.errors).to.be.empty
		})

		it("should reject config without API key", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
			}

			const result = configManager.validateConfig(config)
			expect(result.valid).to.be.false
			expect(result.errors).to.include("API key is required")
		})

		it("should reject config without provider", () => {
			const config: CliConfiguration = {
				apiModelId: "claude-3-5-sonnet-20241022",
				apiKey: "sk-ant-test-key-123",
			}

			const result = configManager.validateConfig(config)
			expect(result.valid).to.be.false
			expect(result.errors).to.include("API provider is required")
		})

		it("should reject config without model", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				apiKey: "sk-ant-test-key-123",
			}

			const result = configManager.validateConfig(config)
			expect(result.valid).to.be.false
			expect(result.errors).to.include("API model is required")
		})

		it("should reject invalid temperature", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
				apiKey: "sk-ant-test-key-123",
				temperature: 1.5,
			}

			const result = configManager.validateConfig(config)
			expect(result.valid).to.be.false
			expect(result.errors).to.include("Temperature must be between 0.0 and 1.0")
		})

		it("should reject negative maxTokens", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
				apiKey: "sk-ant-test-key-123",
				maxTokens: -100,
			}

			const result = configManager.validateConfig(config)
			expect(result.valid).to.be.false
			expect(result.errors).to.include("Max tokens must be positive")
		})
	})

	describe("Configuration Merging", () => {
		it("should merge command-line options with config", () => {
			const fileConfig: CliConfiguration = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
			}

			configManager.saveConfig(fileConfig)

			const options: Partial<CliConfiguration> = {
				temperature: 0.7,
				maxTokens: 2048,
			}

			const merged = configManager.mergeWithOptions(options)

			expect(merged.apiProvider).to.equal(fileConfig.apiProvider)
			expect(merged.temperature).to.equal(options.temperature)
			expect(merged.maxTokens).to.equal(options.maxTokens)
		})

		it("should prioritize command-line options over file config", () => {
			const fileConfig: CliConfiguration = {
				apiProvider: "anthropic",
				temperature: 0.3,
			}

			configManager.saveConfig(fileConfig)

			const options: Partial<CliConfiguration> = {
				temperature: 0.8,
			}

			const merged = configManager.mergeWithOptions(options)
			expect(merged.temperature).to.equal(0.8)
		})

		it("should merge environment variables", () => {
			process.env.ANTHROPIC_API_KEY = "test-env-key"

			configManager.clearCache()
			const config = configManager.loadConfig()

			expect(config.apiKey).to.equal("test-env-key")

			delete process.env.ANTHROPIC_API_KEY
		})
	})

	describe("Plan/Act Mode Configuration", () => {
		it("should save and load plan/act mode settings", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
				mode: "plan",
				planActSeparateModelsSetting: true,
				planModeApiProvider: "anthropic",
				planModeApiModelId: "claude-3-5-sonnet-20241022",
				actModeApiProvider: "openai",
				actModeApiModelId: "gpt-4",
			}

			configManager.saveConfig(config)
			configManager.clearCache()
			const loaded = configManager.loadConfig()

			expect(loaded.mode).to.equal("plan")
			expect(loaded.planActSeparateModelsSetting).to.be.true
			expect(loaded.planModeApiModelId).to.equal("claude-3-5-sonnet-20241022")
			expect(loaded.actModeApiModelId).to.equal("gpt-4")
		})

		it("should update mode configuration", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				mode: "act",
			}

			configManager.saveConfig(config)
			configManager.updateConfig({ mode: "plan" })
			configManager.clearCache()

			const updated = configManager.loadConfig()
			expect(updated.mode).to.equal("plan")
		})
	})

	describe("Terminal Output Configuration", () => {
		it("should save and load terminal output settings", () => {
			const config: CliConfiguration = {
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
	})

	describe("Setup Completion", () => {
		it("should detect incomplete setup", () => {
			expect(configManager.hasCompletedSetup()).to.be.false
		})

		it("should detect completed setup", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				hasCompletedSetup: true,
			}

			configManager.saveConfig(config)
			configManager.clearCache()

			expect(configManager.hasCompletedSetup()).to.be.true
		})

		it("should return false if config file doesn't exist", () => {
			expect(configManager.hasCompletedSetup()).to.be.false
		})
	})

	describe("Configuration Reset", () => {
		it("should delete all configuration files", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				apiKey: "test-key",
			}

			configManager.saveConfig(config)

			const configPath = path.join(configManager.getConfigDir(), "config.json")
			const secretsPath = path.join(configManager.getConfigDir(), "secrets.json")

			expect(fs.existsSync(configPath)).to.be.true
			expect(fs.existsSync(secretsPath)).to.be.true

			configManager.resetConfig()

			expect(fs.existsSync(configPath)).to.be.false
			expect(fs.existsSync(secretsPath)).to.be.false
		})

		it("should clear cache after reset", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
			}

			configManager.saveConfig(config)
			configManager.loadConfig() // Cache it

			configManager.resetConfig()

			// Should return empty config (cache cleared)
			const loaded = configManager.loadConfig()
			expect(loaded.apiProvider).to.be.undefined
		})
	})

	describe("API Key Masking", () => {
		it("should mask API key for display", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				apiKey: "sk-ant-1234567890123456",
			}

			configManager.saveConfig(config)

			const consoleLogStub = sinon.stub(console, "log")
			configManager.displayConfig()

			const output = consoleLogStub
				.getCalls()
				.map((call) => call.args.join(" "))
				.join("\n")

			// Should not show full key
			expect(output).to.not.include("sk-ant-1234567890123456")
			// Should show partial key
			expect(output).to.include("sk-ant-")

			consoleLogStub.restore()
		})

		it("should mask short keys completely", () => {
			const key = "short"
			const masked = (configManager as any).maskApiKey(key)
			expect(masked).to.equal("*****")
		})
	})

	describe("Update Configuration", () => {
		it("should update specific configuration values", () => {
			const config: CliConfiguration = {
				apiProvider: "anthropic",
				temperature: 0.3,
			}

			configManager.saveConfig(config)
			configManager.updateConfig({ temperature: 0.7 })
			configManager.clearCache()

			const updated = configManager.loadConfig()
			expect(updated.temperature).to.equal(0.7)
			expect(updated.apiProvider).to.equal("anthropic") // Should preserve other values
		})
	})

	describe("Configuration Existence Check", () => {
		it("should return false when no config exists", () => {
			expect(configManager.hasConfiguration()).to.be.false
		})

		it("should return true when config exists", () => {
			configManager.saveConfig({ apiProvider: "anthropic" })
			expect(configManager.hasConfiguration()).to.be.true
		})
	})
})
