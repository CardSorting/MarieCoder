/**
 * Variant Configuration Service
 *
 * Centralized service for variant configuration management, validation, and utilities
 * to reduce boilerplate and improve consistency across all variant configurations.
 */

import { ModelFamily } from "@/shared/prompts"
import type { PromptVariant } from "../types"
import { createPlaceholderConfig, getStandardConfig } from "./model_configurations"
import { DebugUtils, VariantUtils } from "./shared_utils"
import { validateVariantComprehensive } from "./validation_utils"

/**
 * Variant configuration service
 */
export class VariantConfigService {
	/**
	 * Create and validate a variant configuration
	 */
	static async createVariantConfig(
		id: string,
		config: Omit<PromptVariant, "id">,
		options: { strict?: boolean; logSummary?: boolean } = {},
	): Promise<PromptVariant> {
		const { strict = true, logSummary: _logSummary = false } = options

		// Create the complete variant
		const variant: PromptVariant = { ...config, id }

		// Validate the variant
		const validationResult = validateVariantComprehensive(variant, { strict })

		if (!validationResult.isValid) {
			const errorStrings = validationResult.errors.map((err) => {
				if (typeof err === "string") {
					return err
				}
				if (err && typeof err === "object") {
					return JSON.stringify(err, null, 2)
				}
				return String(err)
			})
			const errorMessage = `Variant configuration validation failed for '${id}': ${errorStrings.join(", ")}`
			throw new Error(errorMessage)
		}

		return variant
	}

	/**
	 * Get standard configuration for a model family
	 */
	static getStandardConfigForFamily(family: ModelFamily) {
		return getStandardConfig(family)
	}

	/**
	 * Create placeholder configuration for a model family
	 */
	static createPlaceholderConfigForFamily(family: ModelFamily) {
		return createPlaceholderConfig(family)
	}

	/**
	 * Validate a variant configuration
	 */
	static validateVariantConfig(variant: PromptVariant, strict = true) {
		return validateVariantComprehensive(variant, { strict })
	}

	/**
	 * Get variant maturity information
	 */
	static getVariantMaturity(variant: PromptVariant) {
		return {
			level: VariantUtils.getMaturityLevel(variant),
			isProductionReady: VariantUtils.isProductionReady(variant),
			isStable: VariantUtils.isStable(variant),
			isLightweight: VariantUtils.isLightweight(variant),
			complexityScore: VariantUtils.getComplexityScore(variant),
		}
	}

	/**
	 * Create variant summary for debugging
	 */
	static createVariantSummary(variant: PromptVariant) {
		return DebugUtils.createVariantSummary(variant)
	}

	/**
	 * Check if variant is suitable for a specific context
	 */
	static isVariantSuitableForContext(variant: PromptVariant, contextComplexity: number) {
		const variantComplexity = VariantUtils.getComplexityScore(variant)

		// Simple heuristic: variant complexity should be within reasonable range of context complexity
		const complexityRatio = variantComplexity / Math.max(contextComplexity, 1)

		return {
			suitable: complexityRatio >= 0.5 && complexityRatio <= 2.0,
			complexityRatio,
			recommendation:
				complexityRatio < 0.5
					? "consider-fuller-variant"
					: complexityRatio > 2.0
						? "consider-lighter-variant"
						: "optimal",
		}
	}
}

/**
 * Helper function to create and validate variant configurations
 * This reduces boilerplate in variant config files
 */
export function createValidatedVariantConfig(
	id: string,
	config: Omit<PromptVariant, "id">,
	options: { strict?: boolean; logSummary?: boolean } = {},
): PromptVariant {
	const { strict = true, logSummary: _logSummary = false } = options

	// Create the complete variant
	const variant: PromptVariant = { ...config, id }

	// Validate the variant
	const validationResult = validateVariantComprehensive(variant, { strict })

	if (!validationResult.isValid) {
		const errorStrings = validationResult.errors.map((err) => {
			if (typeof err === "string") {
				return err
			}
			if (err && typeof err === "object") {
				return JSON.stringify(err, null, 2)
			}
			return String(err)
		})
		const errorMessage = `Variant configuration validation failed for '${id}': ${errorStrings.join(", ")}`
		throw new Error(errorMessage)
	}

	return variant
}

/**
 * Helper function to validate variant configurations
 * This reduces boilerplate in variant config files
 */
export function validateVariantConfig(variant: PromptVariant, strict = true) {
	return VariantConfigService.validateVariantConfig(variant, strict)
}
