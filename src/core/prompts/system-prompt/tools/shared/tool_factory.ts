/**
 * Tool Factory
 *
 * Centralized factory for creating tool variants with consistent patterns
 * and reduced boilerplate code.
 */

import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../../spec"

// Import standardized parameters from parameter-templates
import {
	createCommandParameter,
	createContentParameter,
	createFilePatternParameter,
	createPathParameter,
	createRecursiveParameter,
	createRegexParameter,
	createRequiresApprovalParameter,
	createTaskProgressParameter,
	createTimeoutParameter,
} from "./parameter_definitions"

/**
 * Standard parameter definitions for common tool parameters
 * Uses centralized parameter templates to eliminate duplication
 */
export const STANDARD_PARAMETERS = {
	/**
	 * File path parameter
	 */
	PATH: createPathParameter("file"),

	/**
	 * Directory path parameter
	 */
	DIRECTORY_PATH: createPathParameter("directory"),

	/**
	 * Content parameter for file operations
	 */
	CONTENT: createContentParameter(),

	/**
	 * Command parameter for command execution
	 */
	COMMAND: createCommandParameter(),

	/**
	 * Requires approval parameter
	 */
	REQUIRES_APPROVAL: createRequiresApprovalParameter(),

	/**
	 * Timeout parameter for commands
	 */
	TIMEOUT: createTimeoutParameter(),

	/**
	 * Regex parameter for search operations
	 */
	REGEX: createRegexParameter(),

	/**
	 * File pattern parameter for filtering
	 */
	FILE_PATTERN: createFilePatternParameter(),

	/**
	 * Recursive parameter for directory operations
	 */
	RECURSIVE: createRecursiveParameter(),

	/**
	 * Task progress parameter
	 */
	TASK_PROGRESS: createTaskProgressParameter(),
} as const

/**
 * Tool variant configuration
 */
export interface ToolVariantConfig {
	readonly id: ClineDefaultTool
	readonly name: string
	readonly description: string
	readonly parameters?: Array<{
		name: string
		required: boolean
		instruction: string
		usage: string
		contextRequirements?: (context: any) => boolean
	}>
	readonly contextRequirements?: (context: any) => boolean
	readonly variants?: ModelFamily[]
}

/**
 * Tool factory class for creating consistent tool variants
 */
export class ToolFactory {
	/**
	 * Create a tool variant from configuration
	 */
	static createVariant(config: ToolVariantConfig, variant: ModelFamily): ClineToolSpec {
		const baseSpec: ClineToolSpec = {
			variant,
			id: config.id,
			name: config.name,
			description: config.description,
			contextRequirements: config.contextRequirements,
			parameters: config.parameters || [],
		}

		return baseSpec
	}

	/**
	 * Create multiple variants for a tool
	 */
	static createVariants(config: ToolVariantConfig, variants: ModelFamily[] = [ModelFamily.GENERIC]): ClineToolSpec[] {
		return variants.map((variant) => ToolFactory.createVariant(config, variant))
	}

	/**
	 * Create a generic tool variant
	 */
	static createGeneric(config: Omit<ToolVariantConfig, "id">, id: ClineDefaultTool): ClineToolSpec {
		return ToolFactory.createVariant({ ...config, id }, ModelFamily.GENERIC)
	}

	/**
	 * Create variants for all model families
	 */
	static createAllVariants(config: ToolVariantConfig): ClineToolSpec[] {
		return ToolFactory.createVariants(config, [
			ModelFamily.GENERIC,
			ModelFamily.NEXT_GEN,
			ModelFamily.GPT,
			ModelFamily.GEMINI,
		])
	}

	/**
	 * Create variants for next-gen and GPT models only
	 */
	static createNextGenVariants(config: ToolVariantConfig): ClineToolSpec[] {
		return ToolFactory.createVariants(config, [ModelFamily.GENERIC, ModelFamily.NEXT_GEN, ModelFamily.GPT])
	}

	/**
	 * Create variants for lightweight models only
	 */
	static createLightweightVariants(config: ToolVariantConfig): ClineToolSpec[] {
		return ToolFactory.createVariants(config, [ModelFamily.GENERIC])
	}
}

// Tool configurations are now managed by ToolConfigService
// This eliminates the large COMMON_TOOL_CONFIGS object and centralizes configuration management

/**
 * Helper functions for common tool creation patterns
 * These helpers are now simplified and use the centralized ToolConfigService
 */
export const ToolHelpers = {
	/**
	 * Create a file operation tool
	 */
	createFileOperation: (config: Partial<ToolVariantConfig> & { id: ClineDefaultTool }) => {
		const fullConfig: ToolVariantConfig = {
			name: config.name || "",
			description: config.description || "",
			parameters: [STANDARD_PARAMETERS.PATH, STANDARD_PARAMETERS.TASK_PROGRESS],
			...config,
		}
		return ToolFactory.createAllVariants(fullConfig)
	},

	/**
	 * Create a search tool
	 */
	createSearchTool: (config: Partial<ToolVariantConfig> & { id: ClineDefaultTool }) => {
		const fullConfig: ToolVariantConfig = {
			name: config.name || "",
			description: config.description || "",
			parameters: [
				STANDARD_PARAMETERS.DIRECTORY_PATH,
				STANDARD_PARAMETERS.REGEX,
				STANDARD_PARAMETERS.FILE_PATTERN,
				STANDARD_PARAMETERS.TASK_PROGRESS,
			],
			...config,
		}
		return ToolFactory.createLightweightVariants(fullConfig)
	},

	/**
	 * Create a command execution tool
	 */
	createCommandTool: (config: Partial<ToolVariantConfig> & { id: ClineDefaultTool }) => {
		const fullConfig: ToolVariantConfig = {
			name: config.name || "",
			description: config.description || "",
			parameters: [STANDARD_PARAMETERS.COMMAND, STANDARD_PARAMETERS.REQUIRES_APPROVAL, STANDARD_PARAMETERS.TIMEOUT],
			...config,
		}
		return ToolFactory.createNextGenVariants(fullConfig)
	},

	/**
	 * Create a browser tool
	 */
	createBrowserTool: (config: Partial<ToolVariantConfig> & { id: ClineDefaultTool }) => {
		const fullConfig: ToolVariantConfig = {
			name: config.name || "",
			description: config.description || "",
			contextRequirements: (context) => context.supportsBrowserUse === true,
			...config,
		}
		return ToolFactory.createLightweightVariants(fullConfig)
	},

	/**
	 * Create an MCP tool
	 */
	createMcpTool: (config: Partial<ToolVariantConfig> & { id: ClineDefaultTool }) => {
		const fullConfig: ToolVariantConfig = {
			name: config.name || "",
			description: config.description || "",
			contextRequirements: (context) => !!(context as any).mcpServers && (context as any).mcpServers.length > 0,
			...config,
		}
		return ToolFactory.createLightweightVariants(fullConfig)
	},
} as const
