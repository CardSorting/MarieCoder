import { ApiHandler } from "@core/api"

/**
 * Default context window size when not specified by the model
 */
const DEFAULT_CONTEXT_WINDOW = 128_000

/**
 * Context window buffer configurations for different model sizes
 * Buffer ensures we don't hit the absolute limit and leave room for response tokens
 */
const CONTEXT_BUFFER_CONFIG = {
	/** Small models (64k) - Conservative buffer */
	SMALL_MODEL_SIZE: 64_000,
	SMALL_MODEL_BUFFER: 27_000,

	/** Standard models (128k) - Standard buffer */
	STANDARD_MODEL_SIZE: 128_000,
	STANDARD_MODEL_BUFFER: 30_000,

	/** Large models (200k) - Larger buffer for safety */
	LARGE_MODEL_SIZE: 200_000,
	LARGE_MODEL_BUFFER: 40_000,

	/** Default fallback - Use 80% of context window or absolute buffer, whichever is smaller */
	DEFAULT_BUFFER_RATIO: 0.8,
	DEFAULT_ABSOLUTE_BUFFER: 40_000,
} as const

/**
 * DeepSeek model configuration
 * DeepSeek models use OpenAI-compatible API but have different context window sizes
 */
const DEEPSEEK_CONFIG = {
	CONTEXT_WINDOW: 128_000,
} as const

/**
 * Information about a model's context window
 */
export interface ContextWindowInfo {
	/** Total context window size in tokens */
	contextWindow: number
	/** Maximum allowed size for input, accounting for response buffer */
	maxAllowedSize: number
}

/**
 * Gets context window information for the given API handler.
 *
 * This function determines the appropriate context window size and calculates
 * the maximum allowed input size, accounting for:
 * - Model-specific context window limits
 * - Buffer space for response tokens
 * - Special handling for OpenAI-compatible APIs (e.g., DeepSeek)
 *
 * @param api - The API handler to get context window information for
 * @returns Context window information including total size and max allowed input size
 * @throws {Error} If api is null or undefined
 *
 * @example
 * ```typescript
 * const info = getContextWindowInfo(apiHandler)
 * console.log(`Context window: ${info.contextWindow}`)
 * console.log(`Max input size: ${info.maxAllowedSize}`)
 * ```
 */
export function getContextWindowInfo(api: ApiHandler): ContextWindowInfo {
	// Input validation
	if (!api) {
		throw new Error("API handler is required")
	}

	const model = api.getModel()
	if (!model) {
		throw new Error("API handler must have a valid model")
	}

	// Determine context window size
	let contextWindow = model.info.contextWindow || DEFAULT_CONTEXT_WINDOW

	// Special handling for DeepSeek models using OpenAI-compatible API
	// DeepSeek models report incorrect context window sizes through OpenAI API
	const providerMetadata = api.getProviderMetadata()
	if (providerMetadata.providerId === "openai" && model.id.toLowerCase().includes("deepseek")) {
		contextWindow = DEEPSEEK_CONFIG.CONTEXT_WINDOW
	}

	// Calculate max allowed size based on context window
	const maxAllowedSize = calculateMaxAllowedSize(contextWindow)

	return { contextWindow, maxAllowedSize }
}

/**
 * Calculates the maximum allowed input size based on context window.
 * Accounts for response token buffer to prevent context window overflow.
 *
 * @param contextWindow - Total context window size in tokens
 * @returns Maximum allowed input size in tokens
 */
function calculateMaxAllowedSize(contextWindow: number): number {
	if (contextWindow <= 0) {
		throw new Error(`Invalid context window size: ${contextWindow}`)
	}

	switch (contextWindow) {
		case CONTEXT_BUFFER_CONFIG.SMALL_MODEL_SIZE:
			return contextWindow - CONTEXT_BUFFER_CONFIG.SMALL_MODEL_BUFFER

		case CONTEXT_BUFFER_CONFIG.STANDARD_MODEL_SIZE:
			return contextWindow - CONTEXT_BUFFER_CONFIG.STANDARD_MODEL_BUFFER

		case CONTEXT_BUFFER_CONFIG.LARGE_MODEL_SIZE:
			return contextWindow - CONTEXT_BUFFER_CONFIG.LARGE_MODEL_BUFFER

		default:
			// For unknown sizes, use either 80% of context window or absolute buffer,
			// whichever leaves more room. This prevents too-small buffers on small models
			// while maintaining safety margins on larger models.
			const percentageBuffer = contextWindow * CONTEXT_BUFFER_CONFIG.DEFAULT_BUFFER_RATIO
			const absoluteBuffer = contextWindow - CONTEXT_BUFFER_CONFIG.DEFAULT_ABSOLUTE_BUFFER
			return Math.max(percentageBuffer, absoluteBuffer)
	}
}
