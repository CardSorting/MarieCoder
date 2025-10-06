/**
 * Core Project Generator for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - centralized, modular, clean
 */

import { GenerationResult, ProjectConfig, TemplateFile } from "../types.js"
import { FileManager } from "./file-manager.js"
import { ProjectValidator } from "./project-validator.js"
import { TemplateEngine } from "./template-engine.js"

export class ProjectGenerator {
	private fileManager: FileManager
	private templateEngine: TemplateEngine
	private validator: ProjectValidator

	constructor() {
		this.fileManager = new FileManager()
		this.templateEngine = new TemplateEngine()
		this.validator = new ProjectValidator()
	}

	/**
	 * Generate a complete project structure
	 */
	async generate(config: ProjectConfig): Promise<GenerationResult> {
		try {
			console.log(`🚀 Generating NOORMME project: ${config.projectName}`)

			// Validate configuration
			await this.validator.validateConfig(config)

			// Create project directory
			await this.fileManager.ensureDirectory(config.projectPath)

			// Generate core project files
			const coreFiles = await this.generateCoreFiles(config)
			await this.fileManager.writeFiles(coreFiles)

			// Generate template-specific files
			const templateFiles = await this.generateTemplateFiles(config)
			await this.fileManager.writeFiles(templateFiles)

			// Generate optional features
			const featureFiles = await this.generateFeatureFiles(config)
			if (featureFiles.length > 0) {
				await this.fileManager.writeFiles(featureFiles)
			}

			// Generate documentation
			const docFiles = await this.generateDocumentation(config)
			await this.fileManager.writeFiles(docFiles)

			console.log(`✅ Project ${config.projectName} generated successfully`)

			return {
				success: true,
				message: `NOORMME project '${config.projectName}' generated successfully`,
				files: [...coreFiles, ...templateFiles, ...featureFiles, ...docFiles].map((f) => f.path),
			}
		} catch (error) {
			console.error("❌ Project generation failed:", error)
			return {
				success: false,
				message: `Project generation failed: ${error instanceof Error ? error.message : String(error)}`,
				files: [],
				errors: [error instanceof Error ? error.message : String(error)],
			}
		}
	}

	/**
	 * Generate core project files (package.json, tsconfig, etc.)
	 */
	private async generateCoreFiles(config: ProjectConfig): Promise<TemplateFile[]> {
		const files: TemplateFile[] = []

		// Package.json
		files.push(await this.templateEngine.renderTemplate("core/package.json", config))

		// TypeScript config
		files.push(await this.templateEngine.renderTemplate("core/tsconfig.json", config))

		// Next.js config
		files.push(await this.templateEngine.renderTemplate("core/next.config.js", config))

		// Tailwind config (if enabled)
		if (config.includeTailwind) {
			files.push(await this.templateEngine.renderTemplate("core/tailwind.config.js", config))
			files.push(await this.templateEngine.renderTemplate("core/postcss.config.js", config))
		}

		// Environment files
		files.push(await this.templateEngine.renderTemplate("core/env.example", config))

		// Git ignore
		files.push(await this.templateEngine.renderTemplate("core/.gitignore", config))

		return files
	}

	/**
	 * Generate template-specific files
	 */
	private async generateTemplateFiles(config: ProjectConfig): Promise<TemplateFile[]> {
		const files: TemplateFile[] = []

		// Base template files
		files.push(...(await this.templateEngine.renderTemplateGroup("base", config)))

		// Template-specific files
		files.push(...(await this.templateEngine.renderTemplateGroup(`templates/${config.template}`, config)))

		return files
	}

	/**
	 * Generate optional feature files
	 */
	private async generateFeatureFiles(config: ProjectConfig): Promise<TemplateFile[]> {
		const files: TemplateFile[] = []

		if (config.includeAuth) {
			files.push(...(await this.templateEngine.renderTemplateGroup("features/auth", config)))
		}

		if (config.includeAdmin) {
			files.push(...(await this.templateEngine.renderTemplateGroup("features/admin", config)))
		}

		if (config.includeQueue) {
			files.push(...(await this.templateEngine.renderTemplateGroup("features/queue", config)))
		}

		if (config.includePayments) {
			files.push(...(await this.templateEngine.renderTemplateGroup("features/payments", config)))
		}

		if (config.includeSubscriptions) {
			files.push(...(await this.templateEngine.renderTemplateGroup("features/subscriptions", config)))
		}

		if (config.includeTests) {
			files.push(...(await this.templateEngine.renderTemplateGroup("features/testing", config)))
		}

		return files
	}

	/**
	 * Generate documentation files
	 */
	private async generateDocumentation(config: ProjectConfig): Promise<TemplateFile[]> {
		const files: TemplateFile[] = []

		// Main README
		files.push(await this.templateEngine.renderTemplate("docs/README.md", config))

		// Setup guide
		files.push(await this.templateEngine.renderTemplate("docs/SETUP_GUIDE.md", config))

		// Architecture guide
		files.push(await this.templateEngine.renderTemplate("docs/ARCHITECTURE.md", config))

		return files
	}
}
