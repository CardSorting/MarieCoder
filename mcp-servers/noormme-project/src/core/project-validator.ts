/**
 * Project Validator for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean validation, helpful error messages
 */

import path from "path"
import { ProjectConfig } from "../types.js"

export class ProjectValidator {
	/**
	 * Validate project configuration
	 */
	async validateConfig(config: ProjectConfig): Promise<void> {
		this.validateProjectName(config.projectName)
		this.validateProjectPath(config.projectPath)
		this.validateTemplate(config.template)
		this.validateFeatures(config)
		this.validateDatabasePath(config.databasePath)
	}

	/**
	 * Validate project name
	 */
	private validateProjectName(name: string): void {
		if (!name || typeof name !== "string") {
			throw new Error("Project name is required and must be a string")
		}

		if (name.trim().length === 0) {
			throw new Error("Project name cannot be empty")
		}

		// Check for valid characters (alphanumeric, hyphens, underscores)
		const validNameRegex = /^[a-zA-Z0-9-_]+$/
		if (!validNameRegex.test(name)) {
			throw new Error("Project name can only contain letters, numbers, hyphens, and underscores")
		}

		// Check length
		if (name.length > 50) {
			throw new Error("Project name must be 50 characters or less")
		}

		// Check for reserved names
		const reservedNames = ["node_modules", "src", "app", "lib", "components", "pages", "public", "styles"]
		if (reservedNames.includes(name.toLowerCase())) {
			throw new Error(`'${name}' is a reserved name and cannot be used as project name`)
		}
	}

	/**
	 * Validate project path
	 */
	private validateProjectPath(projectPath: string): void {
		if (!projectPath || typeof projectPath !== "string") {
			throw new Error("Project path is required and must be a string")
		}

		if (projectPath.trim().length === 0) {
			throw new Error("Project path cannot be empty")
		}

		// Check if path is absolute
		if (!path.isAbsolute(projectPath)) {
			throw new Error("Project path must be an absolute path")
		}

		// Check for valid characters in path
		const invalidChars = /[<>:"|?*\x00-\x1f]/
		if (invalidChars.test(projectPath)) {
			throw new Error("Project path contains invalid characters")
		}
	}

	/**
	 * Validate template selection
	 */
	private validateTemplate(template: string): void {
		const validTemplates = ["nextjs", "nextjs-auth", "nextjs-admin", "nextjs-saas"]

		if (!validTemplates.includes(template)) {
			throw new Error(`Invalid template '${template}'. Valid templates are: ${validTemplates.join(", ")}`)
		}
	}

	/**
	 * Validate feature combinations
	 */
	private validateFeatures(config: ProjectConfig): void {
		// Auth is required for admin panel
		if (config.includeAdmin && !config.includeAuth) {
			throw new Error("Authentication is required when admin panel is enabled")
		}

		// Auth is required for payments
		if (config.includePayments && !config.includeAuth) {
			throw new Error("Authentication is required when payments are enabled")
		}

		// Auth is required for subscriptions
		if (config.includeSubscriptions && !config.includeAuth) {
			throw new Error("Authentication is required when subscriptions are enabled")
		}

		// Payments are required for subscriptions
		if (config.includeSubscriptions && !config.includePayments) {
			throw new Error("Payments are required when subscriptions are enabled")
		}

		// Validate template-specific requirements
		this.validateTemplateRequirements(config)
	}

	/**
	 * Validate template-specific requirements
	 */
	private validateTemplateRequirements(config: ProjectConfig): void {
		switch (config.template) {
			case "nextjs-auth":
				if (!config.includeAuth) {
					throw new Error("Auth template requires authentication to be enabled")
				}
				break
			case "nextjs-admin":
				if (!config.includeAuth || !config.includeAdmin) {
					throw new Error("Admin template requires both authentication and admin panel to be enabled")
				}
				break
			case "nextjs-saas":
				if (!config.includeAuth || !config.includeAdmin || !config.includePayments || !config.includeSubscriptions) {
					throw new Error(
						"SaaS template requires authentication, admin panel, payments, and subscriptions to be enabled",
					)
				}
				break
		}
	}

	/**
	 * Validate database path
	 */
	private validateDatabasePath(databasePath?: string): void {
		if (databasePath) {
			if (typeof databasePath !== "string") {
				throw new Error("Database path must be a string")
			}

			// Check for valid characters
			const invalidChars = /[<>:"|?*\x00-\x1f]/
			if (invalidChars.test(databasePath)) {
				throw new Error("Database path contains invalid characters")
			}

			// Check file extension
			if (!databasePath.endsWith(".db") && !databasePath.endsWith(".sqlite") && !databasePath.endsWith(".sqlite3")) {
				throw new Error("Database path must have a .db, .sqlite, or .sqlite3 extension")
			}
		}
	}

	/**
	 * Validate optional string fields
	 */
	private validateOptionalString(value: any, fieldName: string, maxLength?: number): void {
		if (value !== undefined && value !== null) {
			if (typeof value !== "string") {
				throw new Error(`${fieldName} must be a string`)
			}

			if (maxLength && value.length > maxLength) {
				throw new Error(`${fieldName} must be ${maxLength} characters or less`)
			}
		}
	}

	/**
	 * Validate boolean fields
	 */
	private validateBoolean(value: any, fieldName: string): void {
		if (value !== undefined && value !== null && typeof value !== "boolean") {
			throw new Error(`${fieldName} must be a boolean`)
		}
	}

	/**
	 * Validate number fields
	 */
	private validateNumber(value: any, fieldName: string, min?: number, max?: number): void {
		if (value !== undefined && value !== null) {
			if (typeof value !== "number" || isNaN(value)) {
				throw new Error(`${fieldName} must be a number`)
			}

			if (min !== undefined && value < min) {
				throw new Error(`${fieldName} must be ${min} or greater`)
			}

			if (max !== undefined && value > max) {
				throw new Error(`${fieldName} must be ${max} or less`)
			}
		}
	}

	/**
	 * Sanitize project name for file system
	 */
	sanitizeProjectName(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9-_]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "")
	}

	/**
	 * Check if project directory already exists and has content
	 */
	async checkProjectDirectory(projectPath: string): Promise<{ exists: boolean; hasContent: boolean }> {
		try {
			const fs = await import("fs-extra")
			const exists = await fs.pathExists(projectPath)

			if (!exists) {
				return { exists: false, hasContent: false }
			}

			const contents = await fs.readdir(projectPath)
			const hasContent = contents.length > 0

			return { exists: true, hasContent }
		} catch (error) {
			throw new Error(`Failed to check project directory: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Get validation warnings (non-blocking issues)
	 */
	getValidationWarnings(config: ProjectConfig): string[] {
		const warnings: string[] = []

		// Check for common issues
		if (config.projectName !== this.sanitizeProjectName(config.projectName)) {
			warnings.push(
				`Project name '${config.projectName}' will be sanitized to '${this.sanitizeProjectName(config.projectName)}'`,
			)
		}

		// Check for missing optional but recommended features
		if (!config.includeTailwind && config.template !== "nextjs") {
			warnings.push("Tailwind CSS is recommended for most templates")
		}

		if (!config.includeTests && config.template === "nextjs-saas") {
			warnings.push("Testing is recommended for SaaS applications")
		}

		// Check for potential conflicts
		if (config.includeAuth && !config.appUrl) {
			warnings.push("App URL is recommended when authentication is enabled")
		}

		return warnings
	}
}
