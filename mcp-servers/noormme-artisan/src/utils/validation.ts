/**
 * Validation Utilities
 * Common validation functions for commands and inputs
 */

export interface ValidationResult {
	valid: boolean
	errors: string[]
	warnings: string[]
}

export interface ValidationRule {
	name: string
	validate: (value: any) => boolean
	message: string
}

export class Validator {
	private rules: Map<string, ValidationRule[]> = new Map()

	constructor() {
		this.loadDefaultRules()
	}

	/**
	 * Validate a value against rules
	 */
	validate(field: string, value: any): ValidationResult {
		const fieldRules = this.rules.get(field) || []
		const errors: string[] = []
		const warnings: string[] = []

		for (const rule of fieldRules) {
			if (!rule.validate(value)) {
				errors.push(rule.message)
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate multiple fields
	 */
	validateFields(fields: Record<string, any>): ValidationResult {
		const allErrors: string[] = []
		const allWarnings: string[] = []

		for (const [field, value] of Object.entries(fields)) {
			const result = this.validate(field, value)
			allErrors.push(...result.errors)
			allWarnings.push(...result.warnings)
		}

		return {
			valid: allErrors.length === 0,
			errors: allErrors,
			warnings: allWarnings,
		}
	}

	/**
	 * Add a validation rule for a field
	 */
	addRule(field: string, rule: ValidationRule): void {
		if (!this.rules.has(field)) {
			this.rules.set(field, [])
		}
		this.rules.get(field)!.push(rule)
	}

	/**
	 * Remove a validation rule for a field
	 */
	removeRule(field: string, ruleName: string): void {
		const fieldRules = this.rules.get(field)
		if (fieldRules) {
			const index = fieldRules.findIndex((rule) => rule.name === ruleName)
			if (index !== -1) {
				fieldRules.splice(index, 1)
			}
		}
	}

	/**
	 * Load default validation rules
	 */
	private loadDefaultRules(): void {
		// Name validation
		this.addRule("name", {
			name: "required",
			validate: (value) => value && typeof value === "string" && value.trim().length > 0,
			message: "Name is required",
		})

		this.addRule("name", {
			name: "minLength",
			validate: (value) => !value || value.length >= 2,
			message: "Name must be at least 2 characters long",
		})

		this.addRule("name", {
			name: "maxLength",
			validate: (value) => !value || value.length <= 50,
			message: "Name must be no more than 50 characters long",
		})

		this.addRule("name", {
			name: "validCharacters",
			validate: (value) => !value || /^[a-zA-Z0-9\s\-_]+$/.test(value),
			message: "Name can only contain letters, numbers, spaces, hyphens, and underscores",
		})

		// Email validation
		this.addRule("email", {
			name: "required",
			validate: (value) => value && typeof value === "string" && value.trim().length > 0,
			message: "Email is required",
		})

		this.addRule("email", {
			name: "format",
			validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
			message: "Email must be a valid email address",
		})

		// Path validation
		this.addRule("path", {
			name: "validPath",
			validate: (value) => !value || /^[a-zA-Z0-9/\-_.]+$/.test(value),
			message: "Path contains invalid characters",
		})

		// Port validation
		this.addRule("port", {
			name: "validPort",
			validate: (value) => !value || (Number.isInteger(value) && value > 0 && value <= 65535),
			message: "Port must be a number between 1 and 65535",
		})

		// Table name validation
		this.addRule("tableName", {
			name: "required",
			validate: (value) => value && typeof value === "string" && value.trim().length > 0,
			message: "Table name is required",
		})

		this.addRule("tableName", {
			name: "validTableName",
			validate: (value) => !value || /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value),
			message: "Table name must start with a letter or underscore and contain only letters, numbers, and underscores",
		})

		// Column validation
		this.addRule("column", {
			name: "required",
			validate: (value) => value && typeof value === "string" && value.trim().length > 0,
			message: "Column name is required",
		})

		this.addRule("column", {
			name: "validColumnName",
			validate: (value) => !value || /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value),
			message: "Column name must start with a letter or underscore and contain only letters, numbers, and underscores",
		})
	}
}

/**
 * Project validation utilities
 */
export class ProjectValidator {
	/**
	 * Validate project name
	 */
	static validateProjectName(name: string): ValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		if (!name || typeof name !== "string" || name.trim().length === 0) {
			errors.push("Project name is required")
		} else {
			const trimmedName = name.trim()

			if (trimmedName.length < 2) {
				errors.push("Project name must be at least 2 characters long")
			}

			if (trimmedName.length > 50) {
				errors.push("Project name must be no more than 50 characters long")
			}

			if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedName)) {
				errors.push("Project name can only contain letters, numbers, hyphens, and underscores")
			}

			if (trimmedName.startsWith("-") || trimmedName.endsWith("-")) {
				errors.push("Project name cannot start or end with a hyphen")
			}

			if (trimmedName.includes("--")) {
				errors.push("Project name cannot contain consecutive hyphens")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate component name
	 */
	static validateComponentName(name: string): ValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		if (!name || typeof name !== "string" || name.trim().length === 0) {
			errors.push("Component name is required")
		} else {
			const trimmedName = name.trim()

			if (trimmedName.length < 2) {
				errors.push("Component name must be at least 2 characters long")
			}

			if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmedName)) {
				errors.push("Component name must start with a letter and contain only letters and numbers")
			}

			if (trimmedName !== ProjectValidator.toPascalCase(trimmedName)) {
				warnings.push("Component name should be in PascalCase format")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate service name
	 */
	static validateServiceName(name: string): ValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		if (!name || typeof name !== "string" || name.trim().length === 0) {
			errors.push("Service name is required")
		} else {
			const trimmedName = name.trim()

			if (trimmedName.length < 2) {
				errors.push("Service name must be at least 2 characters long")
			}

			if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmedName)) {
				errors.push("Service name must start with a letter and contain only letters and numbers")
			}

			if (trimmedName !== ProjectValidator.toPascalCase(trimmedName)) {
				warnings.push("Service name should be in PascalCase format")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate page route
	 */
	static validatePageRoute(route: string): ValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		if (!route || typeof route !== "string" || route.trim().length === 0) {
			errors.push("Page route is required")
		} else {
			const trimmedRoute = route.trim()

			if (trimmedRoute.startsWith("/")) {
				warnings.push("Route should not start with a forward slash")
			}

			if (!/^[a-zA-Z0-9/\-_]+$/.test(trimmedRoute)) {
				errors.push("Route can only contain letters, numbers, forward slashes, hyphens, and underscores")
			}

			if (trimmedRoute.includes("//")) {
				errors.push("Route cannot contain consecutive forward slashes")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate API route
	 */
	static validateApiRoute(route: string): ValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		if (!route || typeof route !== "string" || route.trim().length === 0) {
			errors.push("API route is required")
		} else {
			const trimmedRoute = route.trim()

			if (trimmedRoute.startsWith("/")) {
				warnings.push("Route should not start with a forward slash")
			}

			if (!/^[a-zA-Z0-9/\-_]+$/.test(trimmedRoute)) {
				errors.push("Route can only contain letters, numbers, forward slashes, hyphens, and underscores")
			}

			if (trimmedRoute.includes("//")) {
				errors.push("Route cannot contain consecutive forward slashes")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate migration name
	 */
	static validateMigrationName(name: string): ValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		if (!name || typeof name !== "string" || name.trim().length === 0) {
			errors.push("Migration name is required")
		} else {
			const trimmedName = name.trim()

			if (trimmedName.length < 2) {
				errors.push("Migration name must be at least 2 characters long")
			}

			if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedName)) {
				errors.push("Migration name can only contain letters, numbers, hyphens, and underscores")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate table name
	 */
	static validateTableName(name: string): ValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		if (!name || typeof name !== "string" || name.trim().length === 0) {
			errors.push("Table name is required")
		} else {
			const trimmedName = name.trim()

			if (trimmedName.length < 2) {
				errors.push("Table name must be at least 2 characters long")
			}

			if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
				errors.push(
					"Table name must start with a letter or underscore and contain only letters, numbers, and underscores",
				)
			}

			if (trimmedName !== trimmedName.toLowerCase()) {
				warnings.push("Table name should be in lowercase")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate column definition
	 */
	static validateColumnDefinition(column: { name: string; type: string }): ValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		if (!column.name || typeof column.name !== "string" || column.name.trim().length === 0) {
			errors.push("Column name is required")
		} else {
			const trimmedName = column.name.trim()

			if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
				errors.push(
					"Column name must start with a letter or underscore and contain only letters, numbers, and underscores",
				)
			}
		}

		if (!column.type || typeof column.type !== "string" || column.type.trim().length === 0) {
			errors.push("Column type is required")
		} else {
			const validTypes = ["string", "text", "integer", "bigint", "boolean", "date", "datetime", "json"]
			if (!validTypes.includes(column.type.trim())) {
				errors.push(`Column type must be one of: ${validTypes.join(", ")}`)
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Convert string to PascalCase
	 */
	private static toPascalCase(str: string): string {
		return str
			.split(/[-_\s/]+/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join("")
	}
}

/**
 * File system validation utilities
 */
export class FileSystemValidator {
	/**
	 * Validate file path
	 */
	static validateFilePath(path: string): ValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		if (!path || typeof path !== "string" || path.trim().length === 0) {
			errors.push("File path is required")
		} else {
			const trimmedPath = path.trim()

			if (trimmedPath.includes("..")) {
				errors.push("File path cannot contain parent directory references (..)")
			}

			if (trimmedPath.includes("//")) {
				errors.push("File path cannot contain consecutive forward slashes")
			}

			if (!/^[a-zA-Z0-9/\-_.]+$/.test(trimmedPath)) {
				errors.push("File path contains invalid characters")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate directory path
	 */
	static validateDirectoryPath(path: string): ValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		if (!path || typeof path !== "string" || path.trim().length === 0) {
			errors.push("Directory path is required")
		} else {
			const trimmedPath = path.trim()

			if (trimmedPath.includes("..")) {
				errors.push("Directory path cannot contain parent directory references (..)")
			}

			if (trimmedPath.includes("//")) {
				errors.push("Directory path cannot contain consecutive forward slashes")
			}

			if (!/^[a-zA-Z0-9/\-_]+$/.test(trimmedPath)) {
				errors.push("Directory path contains invalid characters")
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	}
}
