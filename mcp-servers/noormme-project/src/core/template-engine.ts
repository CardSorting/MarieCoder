/**
 * Enhanced Template Engine for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - centralized orchestration with supporting modules
 */

import ejs from "ejs"
import path from "path"
import { ProjectConfig, TemplateFile } from "../types.js"
import { ComponentTemplates } from "./component-templates.js"
import { ConfigTemplates } from "./config-templates.js"
import { DocumentationTemplates } from "./documentation-templates.js"
import { ServiceTemplates } from "./service-templates.js"
import { TemplateLoader } from "./template-loader.js"

export class TemplateEngine {
	private templateLoader: TemplateLoader
	private componentTemplates: ComponentTemplates
	private serviceTemplates: ServiceTemplates
	private configTemplates: ConfigTemplates
	private documentationTemplates: DocumentationTemplates

	constructor() {
		this.templateLoader = new TemplateLoader()
		this.componentTemplates = new ComponentTemplates()
		this.serviceTemplates = new ServiceTemplates()
		this.configTemplates = new ConfigTemplates()
		this.documentationTemplates = new DocumentationTemplates()
	}

	/**
	 * Render a single template
	 */
	async renderTemplate(templatePath: string, config: ProjectConfig): Promise<TemplateFile> {
		const template = await this.templateLoader.loadTemplate(templatePath)
		const content = await this.renderContent(template, config)

		return {
			path: this.resolveOutputPath(templatePath, config),
			content,
			isTemplate: true,
		}
	}

	/**
	 * Render a group of templates
	 */
	async renderTemplateGroup(groupPath: string, config: ProjectConfig): Promise<TemplateFile[]> {
		const templates = await this.templateLoader.loadTemplateGroup(groupPath)
		const files: TemplateFile[] = []

		for (const templatePath of templates) {
			files.push(await this.renderTemplate(templatePath, config))
		}

		return files
	}

	/**
	 * Get component template based on type
	 */
	getComponentTemplate(_name: string, type: string, _includeStyles: boolean): string {
		switch (type) {
			case "ui":
				return this.componentTemplates.getUIComponentTemplate()
			case "page":
				return this.componentTemplates.getPageComponentTemplate()
			case "layout":
				return this.componentTemplates.getLayoutComponentTemplate()
			case "feature":
				return this.componentTemplates.getFeatureComponentTemplate()
			case "admin":
				return this.componentTemplates.getAdminComponentTemplate()
			case "auth":
				return this.componentTemplates.getAuthComponentTemplate()
			default:
				throw new Error(`Unknown component type: ${type}`)
		}
	}

	/**
	 * Get service template
	 */
	getServiceTemplate(_name: string, _tableName: string, _includeRepository: boolean, _includeBusinessLogic: boolean): string {
		return this.serviceTemplates.getServiceTemplate()
	}

	/**
	 * Get repository template
	 */
	getRepositoryTemplate(_name: string, _tableName: string): string {
		return this.serviceTemplates.getRepositoryTemplate()
	}

	/**
	 * Get test template for components
	 */
	getTestTemplate(_name: string): string {
		return this.componentTemplates.getTestTemplate()
	}

	/**
	 * Get story template for components
	 */
	getStoryTemplate(_name: string): string {
		return this.componentTemplates.getStoryTemplate()
	}

	/**
	 * Get service test template
	 */
	getServiceTestTemplate(_name: string): string {
		return this.serviceTemplates.getTestTemplate()
	}

	/**
	 * Get configuration template
	 */
	getConfigTemplate(configType: string): string {
		switch (configType) {
			case "package.json":
				return this.configTemplates.getPackageJsonTemplate()
			case "tsconfig.json":
				return this.configTemplates.getTsConfigTemplate()
			case "next.config.js":
				return this.configTemplates.getNextConfigTemplate()
			case "tailwind.config.js":
				return this.configTemplates.getTailwindConfigTemplate()
			case "postcss.config.js":
				return this.configTemplates.getPostCssConfigTemplate()
			case ".env.example":
				return this.configTemplates.getEnvExampleTemplate()
			case ".gitignore":
				return this.configTemplates.getGitIgnoreTemplate()
			case "middleware.ts":
				return this.configTemplates.getMiddlewareTemplate()
			case "auth-providers.ts":
				return this.configTemplates.getAuthProvidersTemplate()
			case "auth-types.ts":
				return this.configTemplates.getAuthTypesTemplate()
			default:
				throw new Error(`Unknown config type: ${configType}`)
		}
	}

	/**
	 * Get documentation template
	 */
	getDocumentationTemplate(docType: string): string {
		switch (docType) {
			case "README.md":
				return this.documentationTemplates.getReadmeTemplate()
			case "SETUP_GUIDE.md":
				return this.documentationTemplates.getSetupGuideTemplate()
			case "ARCHITECTURE.md":
				return this.documentationTemplates.getArchitectureTemplate()
			default:
				throw new Error(`Unknown documentation type: ${docType}`)
		}
	}

	/**
	 * Render template content with data
	 */
	public async renderContent(template: string, data: any): Promise<string> {
		return ejs.render(template, data, {
			async: false,
			strict: true,
		})
	}

	/**
	 * Resolve output path for template
	 */
	private resolveOutputPath(templatePath: string, config: ProjectConfig): string {
		// Remove template prefix and resolve to project path
		const relativePath = templatePath.replace(/^(core|templates|features|docs)\//, "")
		return path.join(config.projectPath, relativePath)
	}

	/**
	 * Convert string to PascalCase
	 */
	// private toPascalCase(str: string): string {
	//	return str
	//		.split(/[-_\s]+/)
	//		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
	//		.join("")
	// }

	/**
	 * Clear template cache
	 */
	clearCache(): void {
		this.templateLoader.clearCache()
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return this.templateLoader.getCacheStats()
	}

	/**
	 * Validate template data
	 */
	validateTemplateData(data: any, requiredFields: string[]): void {
		for (const field of requiredFields) {
			if (!data[field]) {
				throw new Error(`Missing required field: ${field}`)
			}
		}
	}

	/**
	 * Get template metadata
	 */
	getTemplateMetadata(templatePath: string): { type: string; category: string; dependencies: string[] } {
		const category = templatePath.split("/")[0]
		const type = templatePath.split("/").pop()?.split(".")[0] || "unknown"

		let dependencies: string[] = []

		switch (category) {
			case "core":
				dependencies = ["next", "react", "typescript"]
				break
			case "components":
				dependencies = ["react", "typescript"]
				break
			case "services":
				dependencies = ["noormme", "kysely"]
				break
			case "docs":
				dependencies = []
				break
		}

		return { type, category, dependencies }
	}
}
