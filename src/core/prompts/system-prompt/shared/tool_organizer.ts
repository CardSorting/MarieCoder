/**
 * Tool Organization Service
 *
 * Centralized service for tool organization and management to reduce duplication
 * and improve consistency across tool definitions and registrations.
 */

import { ClineDefaultTool } from "@/shared/tools"

/**
 * Tool categories for better organization
 */
export const TOOL_CATEGORIES = {
	/**
	 * Core file operations
	 */
	FILE_OPERATIONS: [ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_NEW, ClineDefaultTool.FILE_EDIT] as const,

	/**
	 * Search and discovery
	 */
	SEARCH_DISCOVERY: [ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_FILES, ClineDefaultTool.LIST_CODE_DEF] as const,

	/**
	 * Command execution
	 */
	COMMAND_EXECUTION: [ClineDefaultTool.BASH] as const,

	/**
	 * Browser and web operations
	 */
	BROWSER_WEB: [ClineDefaultTool.BROWSER, ClineDefaultTool.WEB_FETCH] as const,

	/**
	 * MCP operations
	 */
	MCP_OPERATIONS: [ClineDefaultTool.MCP_USE, ClineDefaultTool.MCP_ACCESS, ClineDefaultTool.MCP_DOCS] as const,

	/**
	 * User interaction
	 */
	USER_INTERACTION: [ClineDefaultTool.ASK, ClineDefaultTool.ATTEMPT] as const,

	/**
	 * Task management
	 */
	TASK_MANAGEMENT: [ClineDefaultTool.NEW_TASK, ClineDefaultTool.PLAN_MODE, ClineDefaultTool.TODO] as const,
} as const

/**
 * Tool organization service
 */
export class ToolOrganizationService {
	/**
	 * Get tools by category
	 */
	static getToolsByCategory(category: keyof typeof TOOL_CATEGORIES): readonly ClineDefaultTool[] {
		return TOOL_CATEGORIES[category]
	}

	/**
	 * Get all tools from multiple categories
	 */
	static getToolsFromCategories(categories: (keyof typeof TOOL_CATEGORIES)[]): ClineDefaultTool[] {
		const tools: ClineDefaultTool[] = []
		for (const category of categories) {
			tools.push(...TOOL_CATEGORIES[category])
		}
		return tools
	}

	/**
	 * Get essential tools for basic functionality
	 */
	static getEssentialTools(): readonly ClineDefaultTool[] {
		return [ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_NEW, ClineDefaultTool.ATTEMPT] as const
	}

	/**
	 * Get core tools for standard functionality
	 */
	static getCoreTools(): readonly ClineDefaultTool[] {
		return [
			...TOOL_CATEGORIES.FILE_OPERATIONS,
			...TOOL_CATEGORIES.SEARCH_DISCOVERY,
			...TOOL_CATEGORIES.COMMAND_EXECUTION,
			...TOOL_CATEGORIES.USER_INTERACTION,
		] as const
	}

	/**
	 * Get advanced tools for full functionality
	 */
	static getAdvancedTools(): readonly ClineDefaultTool[] {
		return [
			...TOOL_CATEGORIES.FILE_OPERATIONS,
			...TOOL_CATEGORIES.SEARCH_DISCOVERY,
			...TOOL_CATEGORIES.COMMAND_EXECUTION,
			...TOOL_CATEGORIES.BROWSER_WEB,
			...TOOL_CATEGORIES.MCP_OPERATIONS,
			...TOOL_CATEGORIES.USER_INTERACTION,
			...TOOL_CATEGORIES.TASK_MANAGEMENT,
		] as const
	}

	/**
	 * Get tools suitable for lightweight models
	 */
	static getLightweightTools(): readonly ClineDefaultTool[] {
		return [
			...TOOL_CATEGORIES.FILE_OPERATIONS,
			...TOOL_CATEGORIES.SEARCH_DISCOVERY,
			...TOOL_CATEGORIES.COMMAND_EXECUTION,
			...TOOL_CATEGORIES.USER_INTERACTION,
			...TOOL_CATEGORIES.TASK_MANAGEMENT,
		] as const
	}

	/**
	 * Check if a tool is essential
	 */
	static isEssentialTool(tool: ClineDefaultTool): boolean {
		return (ToolOrganizationService.getEssentialTools() as readonly ClineDefaultTool[]).includes(tool)
	}

	/**
	 * Check if a tool is suitable for lightweight models
	 */
	static isLightweightTool(tool: ClineDefaultTool): boolean {
		return (ToolOrganizationService.getLightweightTools() as readonly ClineDefaultTool[]).includes(tool)
	}

	/**
	 * Get tool category
	 */
	static getToolCategory(tool: ClineDefaultTool): string | null {
		for (const [categoryName, tools] of Object.entries(TOOL_CATEGORIES)) {
			if ((tools as readonly ClineDefaultTool[]).includes(tool)) {
				return categoryName
			}
		}
		return null
	}

	/**
	 * Validate tool configuration
	 */
	static validateToolConfiguration(tools: ClineDefaultTool[]): {
		isValid: boolean
		errors: string[]
		warnings: string[]
	} {
		const errors: string[] = []
		const warnings: string[] = []

		// Check for essential tools
		const essentialTools = ToolOrganizationService.getEssentialTools()
		const missingEssential = essentialTools.filter((tool) => !tools.includes(tool))
		if (missingEssential.length > 0) {
			warnings.push(`Missing essential tools: ${missingEssential.join(", ")}`)
		}

		// Check for duplicate tools
		const duplicates = tools.filter((tool, index) => tools.indexOf(tool) !== index)
		if (duplicates.length > 0) {
			errors.push(`Duplicate tools found: ${duplicates.join(", ")}`)
		}

		// Check tool count
		if (tools.length === 0) {
			errors.push("No tools configured")
		} else if (tools.length > 20) {
			warnings.push("Large number of tools configured - consider if all are necessary")
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		}
	}

	/**
	 * Get tool configuration recommendations
	 */
	static getToolRecommendations(
		modelFamily: string,
		context: { supportsBrowser?: boolean; supportsMCP?: boolean },
	): {
		recommended: ClineDefaultTool[]
		optional: ClineDefaultTool[]
		notRecommended: ClineDefaultTool[]
	} {
		const recommended: ClineDefaultTool[] = []
		const optional: ClineDefaultTool[] = []
		const notRecommended: ClineDefaultTool[] = []

		// Base recommendations
		recommended.push(...ToolOrganizationService.getCoreTools())

		// Context-specific recommendations
		if (context.supportsBrowser) {
			recommended.push(...TOOL_CATEGORIES.BROWSER_WEB)
		} else {
			optional.push(...TOOL_CATEGORIES.BROWSER_WEB)
		}

		if (context.supportsMCP) {
			recommended.push(...TOOL_CATEGORIES.MCP_OPERATIONS)
		} else {
			optional.push(...TOOL_CATEGORIES.MCP_OPERATIONS)
		}

		// Model family specific recommendations
		if (modelFamily === "xs" || modelFamily === "lightweight") {
			// For lightweight models, move some tools to optional
			const advancedTools = [...TOOL_CATEGORIES.BROWSER_WEB, ...TOOL_CATEGORIES.MCP_OPERATIONS]
			recommended.forEach((tool) => {
				if ((advancedTools as ClineDefaultTool[]).includes(tool)) {
					const index = recommended.indexOf(tool)
					if (index > -1) {
						recommended.splice(index, 1)
						optional.push(tool)
					}
				}
			})
		}

		return { recommended, optional, notRecommended }
	}
}

/**
 * Helper functions for tool configuration
 */
export const ToolConfigHelpers = {
	/**
	 * Create a minimal tool configuration
	 */
	minimal: () => ToolOrganizationService.getEssentialTools(),

	/**
	 * Create a standard tool configuration
	 */
	standard: () => ToolOrganizationService.getCoreTools(),

	/**
	 * Create a full tool configuration
	 */
	full: () => ToolOrganizationService.getAdvancedTools(),

	/**
	 * Create a lightweight tool configuration
	 */
	lightweight: () => ToolOrganizationService.getLightweightTools(),

	/**
	 * Create a custom tool configuration from categories
	 */
	fromCategories: (categories: (keyof typeof TOOL_CATEGORIES)[]) => ToolOrganizationService.getToolsFromCategories(categories),
} as const
