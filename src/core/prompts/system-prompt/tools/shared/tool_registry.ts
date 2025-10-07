/**
 * Tool Registry
 *
 * Centralized registry for managing tool variants and configurations
 */

import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../../spec"
import { ToolValidator } from "./tool-validation"

/**
 * Tool registry entry
 */
export interface ToolRegistryEntry {
	readonly tool: ClineDefaultTool
	readonly variants: readonly ClineToolSpec[]
	readonly metadata: {
		readonly createdAt: Date
		readonly updatedAt: Date
		readonly version: string
		readonly description: string
	}
}

/**
 * Tool registry service
 */
export class ToolRegistry {
	private static instance: ToolRegistry
	private registry = new Map<ClineDefaultTool, ToolRegistryEntry>()

	private constructor() {}

	/**
	 * Get singleton instance
	 */
	static getInstance(): ToolRegistry {
		if (!ToolRegistry.instance) {
			ToolRegistry.instance = new ToolRegistry()
		}
		return ToolRegistry.instance
	}

	/**
	 * Register tool variants
	 */
	register(
		tool: ClineDefaultTool,
		variants: ClineToolSpec[],
		metadata: {
			version?: string
			description?: string
		} = {},
	): void {
		// Validate variants
		const validation = ToolValidator.validateToolVariants([...variants])
		if (!validation.isValid) {
			throw new Error(`Invalid tool variants for ${tool}: ${validation.errors.join(", ")}`)
		}

		// Check for existing entry
		const existing = this.registry.get(tool)
		if (existing) {
			console.warn(`Tool ${tool} is already registered. Updating with new variants.`)
		}

		// Create registry entry
		const entry: ToolRegistryEntry = {
			tool,
			variants,
			metadata: {
				createdAt: existing?.metadata.createdAt || new Date(),
				updatedAt: new Date(),
				version: metadata.version || "1.0.0",
				description: metadata.description || `Tool variants for ${tool}`,
			},
		}

		this.registry.set(tool, entry)
	}

	/**
	 * Get tool variants
	 */
	get(tool: ClineDefaultTool): ToolRegistryEntry | undefined {
		return this.registry.get(tool)
	}

	/**
	 * Get tool variants by model family
	 */
	getByModelFamily(tool: ClineDefaultTool, modelFamily: ModelFamily): ClineToolSpec | undefined {
		const entry = this.registry.get(tool)
		if (!entry) {
			return undefined
		}

		return entry.variants.find((variant) => variant.variant === modelFamily)
	}

	/**
	 * Get all registered tools
	 */
	getAllTools(): readonly ClineDefaultTool[] {
		return Array.from(this.registry.keys())
	}

	/**
	 * Get all registry entries
	 */
	getAllEntries(): readonly ToolRegistryEntry[] {
		return Array.from(this.registry.values())
	}

	/**
	 * Check if tool is registered
	 */
	isRegistered(tool: ClineDefaultTool): boolean {
		return this.registry.has(tool)
	}

	/**
	 * Unregister tool
	 */
	unregister(tool: ClineDefaultTool): boolean {
		return this.registry.delete(tool)
	}

	/**
	 * Clear all registered tools
	 */
	clear(): void {
		this.registry.clear()
	}

	/**
	 * Get tools by model family
	 */
	getToolsByModelFamily(modelFamily: ModelFamily): ClineToolSpec[] {
		const tools: ClineToolSpec[] = []

		for (const entry of this.registry.values()) {
			const variant = entry.variants.find((v) => v.variant === modelFamily)
			if (variant) {
				tools.push(variant)
			}
		}

		return tools
	}

	/**
	 * Get tools by category
	 */
	getToolsByCategory(_category: string): ClineToolSpec[] {
		// This would need to be implemented based on your categorization system
		// For now, return all tools
		return this.getAllEntries().flatMap((entry) => entry.variants)
	}

	/**
	 * Validate all registered tools
	 */
	validateAll(): { isValid: boolean; errors: string[]; warnings: string[] } {
		const errors: string[] = []
		const warnings: string[] = []
		let isValid = true

		for (const entry of this.registry.values()) {
			const validation = ToolValidator.validateToolVariants([...entry.variants])
			if (!validation.isValid) {
				isValid = false
				errors.push(`Tool ${entry.tool}: ${validation.errors.join(", ")}`)
			}
			warnings.push(...validation.warnings.map((w) => `Tool ${entry.tool}: ${w}`))
		}

		return { isValid, errors, warnings }
	}

	/**
	 * Get registry statistics
	 */
	getStatistics(): {
		totalTools: number
		totalVariants: number
		variantsByModelFamily: Record<ModelFamily, number>
		lastUpdated: Date | null
	} {
		const variantsByModelFamily: Record<ModelFamily, number> = {} as Record<ModelFamily, number>
		let totalVariants = 0
		let lastUpdated: Date | null = null

		for (const entry of this.registry.values()) {
			totalVariants += entry.variants.length

			for (const variant of entry.variants) {
				variantsByModelFamily[variant.variant] = (variantsByModelFamily[variant.variant] || 0) + 1
			}

			if (!lastUpdated || entry.metadata.updatedAt > lastUpdated) {
				lastUpdated = entry.metadata.updatedAt
			}
		}

		return {
			totalTools: this.registry.size,
			totalVariants,
			variantsByModelFamily,
			lastUpdated,
		}
	}

	/**
	 * Export registry data
	 */
	export(): {
		tools: Record<ClineDefaultTool, ToolRegistryEntry>
		metadata: {
			exportedAt: Date
			version: string
		}
	} {
		return {
			tools: Object.fromEntries(this.registry) as Record<ClineDefaultTool, ToolRegistryEntry>,
			metadata: {
				exportedAt: new Date(),
				version: "1.0.0",
			},
		}
	}

	/**
	 * Import registry data
	 */
	import(data: { tools: Record<ClineDefaultTool, ToolRegistryEntry>; metadata: { exportedAt: Date; version: string } }): void {
		// Clear existing registry
		this.clear()

		// Import tools
		for (const [tool, entry] of Object.entries(data.tools)) {
			this.registry.set(tool as ClineDefaultTool, entry)
		}
	}
}

/**
 * Global tool registry instance
 */
export const toolRegistry = ToolRegistry.getInstance()

/**
 * Tool registry helpers
 */
export const ToolRegistryHelpers = {
	/**
	 * Register tool variants with validation
	 */
	registerWithValidation: (
		tool: ClineDefaultTool,
		variants: ClineToolSpec[],
		metadata?: {
			version?: string
			description?: string
		},
	): void => {
		const validation = ToolValidator.validateToolVariants(variants)
		if (!validation.isValid) {
			throw new Error(`Validation failed for tool ${tool}: ${validation.errors.join(", ")}`)
		}

		toolRegistry.register(tool, variants, metadata)
	},

	/**
	 * Get tool variant safely
	 */
	getVariant: (tool: ClineDefaultTool, modelFamily: ModelFamily): ClineToolSpec | null => {
		return toolRegistry.getByModelFamily(tool, modelFamily) || null
	},

	/**
	 * Check if tool is available for model family
	 */
	isAvailableForModelFamily: (tool: ClineDefaultTool, modelFamily: ModelFamily): boolean => {
		return toolRegistry.getByModelFamily(tool, modelFamily) !== undefined
	},

	/**
	 * Get available tools for model family
	 */
	getAvailableToolsForModelFamily: (modelFamily: ModelFamily): ClineDefaultTool[] => {
		const availableTools: ClineDefaultTool[] = []

		for (const tool of toolRegistry.getAllTools()) {
			if (ToolRegistryHelpers.isAvailableForModelFamily(tool, modelFamily)) {
				availableTools.push(tool)
			}
		}

		return availableTools
	},

	/**
	 * Create tool configuration summary
	 */
	createSummary: (): string => {
		const stats = toolRegistry.getStatistics()
		const lines: string[] = []

		lines.push("Tool Registry Summary:")
		lines.push(`  Total Tools: ${stats.totalTools}`)
		lines.push(`  Total Variants: ${stats.totalVariants}`)
		lines.push(`  Last Updated: ${stats.lastUpdated?.toISOString() || "Never"}`)
		lines.push("  Variants by Model Family:")

		for (const [family, count] of Object.entries(stats.variantsByModelFamily)) {
			lines.push(`    ${family}: ${count}`)
		}

		return lines.join("\n")
	},
} as const
