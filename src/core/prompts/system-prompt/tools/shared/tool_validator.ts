/**
 * Tool Validation
 *
 * Validation utilities for tool configurations and variants
 */

import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../../spec"

/**
 * Validation result interface
 */
export interface ToolValidationResult {
	readonly isValid: boolean
	readonly errors: readonly string[]
	readonly warnings: readonly string[]
}

/**
 * Tool validation service
 */
export class ToolValidator {
	/**
	 * Validate a single tool specification
	 */
	static validateToolSpec(spec: ClineToolSpec): ToolValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		// Check required fields
		if (!spec.id) {
			errors.push("Tool specification missing required 'id' field")
		}

		if (!spec.name) {
			errors.push("Tool specification missing required 'name' field")
		}

		if (!spec.description) {
			errors.push("Tool specification missing required 'description' field")
		}

		if (!spec.variant) {
			errors.push("Tool specification missing required 'variant' field")
		}

		// Validate variant
		if (spec.variant && !Object.values(ModelFamily).includes(spec.variant)) {
			errors.push(`Invalid variant: ${spec.variant}`)
		}

		// Validate parameters
		if (spec.parameters) {
			const parameterNames = new Set<string>()
			for (const param of spec.parameters) {
				// Check for duplicate parameter names
				if (parameterNames.has(param.name)) {
					errors.push(`Duplicate parameter name: ${param.name}`)
				}
				parameterNames.add(param.name)

				// Check required parameters have instruction and usage
				if (!param.instruction) {
					errors.push(`Parameter '${param.name}' missing instruction`)
				}

				if (!param.usage) {
					errors.push(`Parameter '${param.name}' missing usage`)
				}

				// Check context requirements function
				if (param.contextRequirements && typeof param.contextRequirements !== "function") {
					errors.push(`Parameter '${param.name}' contextRequirements must be a function`)
				}
			}
		}

		// Validate context requirements
		if (spec.contextRequirements && typeof spec.contextRequirements !== "function") {
			errors.push("contextRequirements must be a function")
		}

		// Check description length
		if (spec.description && spec.description.length > 1000) {
			warnings.push("Tool description is very long, consider shortening it")
		}

		// Check parameter count
		if (spec.parameters && spec.parameters.length > 10) {
			warnings.push("Tool has many parameters, consider simplifying")
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate multiple tool variants
	 */
	static validateToolVariants(variants: ClineToolSpec[]): ToolValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		// Check for empty variants array
		if (variants.length === 0) {
			errors.push("No tool variants provided")
			return { isValid: false, errors, warnings }
		}

		// Validate each variant
		for (const variant of variants) {
			const result = ToolValidator.validateToolSpec(variant)
			errors.push(...result.errors)
			warnings.push(...result.warnings)
		}

		// Check for duplicate variants
		const variantKeys = new Set<string>()
		for (const variant of variants) {
			const key = `${variant.id}-${variant.variant}`
			if (variantKeys.has(key)) {
				errors.push(`Duplicate variant: ${variant.id} for ${variant.variant}`)
			}
			variantKeys.add(key)
		}

		// Check for consistent tool IDs
		const toolIds = new Set(variants.map((v) => v.id))
		if (toolIds.size > 1) {
			errors.push("All variants must have the same tool ID")
		}

		// Check for consistent tool names
		const toolNames = new Set(variants.map((v) => v.name))
		if (toolNames.size > 1) {
			errors.push("All variants must have the same tool name")
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate tool configuration against schema
	 */
	static validateToolConfiguration(
		_tool: ClineDefaultTool,
		config: any,
		schema: Record<string, { required: boolean; type: string; description: string }>,
	): ToolValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		for (const [field, fieldSchema] of Object.entries(schema)) {
			const value = config[field]

			// Check required fields
			if (fieldSchema.required && (value === undefined || value === null)) {
				errors.push(`Required field '${field}' is missing`)
				continue
			}

			// Skip validation if field is not required and not present
			if (!fieldSchema.required && value === undefined) {
				continue
			}

			// Check type
			const actualType = typeof value
			if (actualType !== fieldSchema.type) {
				errors.push(`Field '${field}' should be ${fieldSchema.type}, got ${actualType}`)
			}
		}

		// Check for unexpected fields
		const expectedFields = Object.keys(schema)
		const actualFields = Object.keys(config)
		const unexpectedFields = actualFields.filter((field) => !expectedFields.includes(field))

		if (unexpectedFields.length > 0) {
			warnings.push(`Unexpected fields found: ${unexpectedFields.join(", ")}`)
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate tool dependencies
	 */
	static validateToolDependencies(tools: ClineDefaultTool[]): ToolValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		// Define tool dependencies
		const dependencies: Record<ClineDefaultTool, ClineDefaultTool[]> = {
			[ClineDefaultTool.FILE_EDIT]: [ClineDefaultTool.FILE_READ],
			[ClineDefaultTool.FILE_NEW]: [ClineDefaultTool.LIST_FILES],
			[ClineDefaultTool.SEARCH]: [ClineDefaultTool.LIST_FILES],
			[ClineDefaultTool.BROWSER]: [ClineDefaultTool.BASH],
			[ClineDefaultTool.MCP_USE]: [ClineDefaultTool.MCP_DOCS],
			[ClineDefaultTool.MCP_ACCESS]: [ClineDefaultTool.MCP_DOCS],
			// Add more dependencies as needed
		} as Record<ClineDefaultTool, ClineDefaultTool[]>

		// Check dependencies
		for (const tool of tools) {
			const toolDependencies = dependencies[tool]
			if (toolDependencies) {
				const missingDependencies = toolDependencies.filter((dep) => !tools.includes(dep))
				if (missingDependencies.length > 0) {
					warnings.push(`Tool '${tool}' has missing dependencies: ${missingDependencies.join(", ")}`)
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Validate tool compatibility with model family
	 */
	static validateModelCompatibility(tool: ClineToolSpec, modelFamily: ModelFamily): ToolValidationResult {
		const errors: string[] = []
		const warnings: string[] = []

		// Check if tool variant matches model family
		if (tool.variant !== modelFamily) {
			warnings.push(`Tool variant '${tool.variant}' may not be optimal for model family '${modelFamily}'`)
		}

		// Check parameter complexity for lightweight models
		if (
			(modelFamily === ModelFamily.XS || modelFamily === ModelFamily.GENERIC) &&
			tool.parameters &&
			tool.parameters.length > 5
		) {
			warnings.push(`Tool has many parameters (${tool.parameters.length}) which may be complex for lightweight models`)
		}

		// Check description length for lightweight models
		if (
			(modelFamily === ModelFamily.XS || modelFamily === ModelFamily.GENERIC) &&
			tool.description &&
			tool.description.length > 500
		) {
			warnings.push("Tool description is long and may impact performance on lightweight models")
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		}
	}
}

/**
 * Tool validation helpers
 */
export const ToolValidationHelpers = {
	/**
	 * Create a validation result
	 */
	createResult: (isValid: boolean, errors: string[] = [], warnings: string[] = []): ToolValidationResult => ({
		isValid,
		errors,
		warnings,
	}),

	/**
	 * Merge multiple validation results
	 */
	mergeResults: (...results: ToolValidationResult[]): ToolValidationResult => {
		const errors: string[] = []
		const warnings: string[] = []
		let isValid = true

		for (const result of results) {
			errors.push(...result.errors)
			warnings.push(...result.warnings)
			if (!result.isValid) {
				isValid = false
			}
		}

		return { isValid, errors, warnings }
	},

	/**
	 * Check if validation result has any issues
	 */
	hasIssues: (result: ToolValidationResult): boolean => {
		return result.errors.length > 0 || result.warnings.length > 0
	},

	/**
	 * Format validation result for display
	 */
	formatResult: (result: ToolValidationResult): string => {
		const parts: string[] = []

		if (result.errors.length > 0) {
			parts.push(`Errors:\n${result.errors.map((e) => `  - ${e}`).join("\n")}`)
		}

		if (result.warnings.length > 0) {
			parts.push(`Warnings:\n${result.warnings.map((w) => `  - ${w}`).join("\n")}`)
		}

		return parts.join("\n\n") || "No issues found"
	},
} as const
