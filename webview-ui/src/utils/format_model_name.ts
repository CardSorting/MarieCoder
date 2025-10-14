/**
 * Utility functions for formatting model names in a compact, identifiable way
 */

/**
 * Formats a full model name (provider:model-id) into a compact, identifiable version
 * that shows the most important information for quick recognition
 *
 * @param fullModelName - The full model name in format "provider:model-id"
 * @returns An object with full name and formatted short name
 *
 * @example
 * formatModelName("anthropic:claude-sonnet-4-20250514")
 * // returns { full: "anthropic:claude-sonnet-4-20250514", short: "anthropic:sonnet-4" }
 *
 * formatModelName("openai:gpt-4-turbo-2024-04-09")
 * // returns { full: "openai:gpt-4-turbo-2024-04-09", short: "openai:gpt-4-turbo" }
 */
export function formatModelName(fullModelName: string): { full: string; short: string } {
	if (!fullModelName || fullModelName === "unknown") {
		return { full: fullModelName, short: fullModelName }
	}

	const [provider, ...modelParts] = fullModelName.split(":")
	const modelId = modelParts.join(":") // Handle edge case of colons in model ID

	if (!modelId) {
		return { full: fullModelName, short: fullModelName }
	}

	let shortName = ""

	// Anthropic models: Extract tier and version
	if (provider === "anthropic") {
		// claude-3-5-sonnet-20241022 -> sonnet-3.5
		// claude-sonnet-4-20250514 -> sonnet-4
		// claude-opus-4-20250514 -> opus-4
		const tierMatch = modelId.match(/(opus|sonnet|haiku)/)
		const versionMatch = modelId.match(/claude-(\d+)-(\d+)/) || modelId.match(/-([\d]+)/)

		if (tierMatch) {
			const tier = tierMatch[1]
			if (versionMatch) {
				const majorVersion = versionMatch[1]
				const minorVersion = versionMatch[2]
				shortName = minorVersion
					? `${provider}:${tier}-${majorVersion}.${minorVersion}`
					: `${provider}:${tier}-${majorVersion}`
			} else {
				shortName = `${provider}:${tier}`
			}
		}
	}

	// OpenAI models: Remove date suffixes, keep version info
	else if (provider === "openai" || provider === "azure-openai") {
		// gpt-4-turbo-2024-04-09 -> gpt-4-turbo
		// gpt-4o-2024-05-13 -> gpt-4o
		// o1-preview-2024-09-12 -> o1-preview
		const modelWithoutDate = modelId.replace(/-\d{4}-\d{2}-\d{2}$/, "")
		shortName = `${provider}:${modelWithoutDate}`
	}

	// OpenRouter models: Extract and format the core model name
	else if (provider === "openrouter") {
		// openrouter:anthropic/claude-3.5-sonnet -> OR:sonnet-3.5
		// openrouter:openai/gpt-4o-2024-05-13 -> OR:gpt-4o
		// openrouter:agentica-org/deepcoder-14b-preview -> OR:deepcoder-14b
		const parts = modelId.split("/")

		if (parts.length >= 2) {
			const modelMaker = parts[0] // anthropic, openai, agentica-org, meta-llama, etc.
			const modelName = parts[1]

			// Apply provider-specific formatting to the model name
			let formattedModel = modelName

			if (modelMaker === "anthropic") {
				// claude-3.5-sonnet -> sonnet-3.5
				// claude-3-5-sonnet-20241022 -> sonnet-3.5
				// claude-sonnet-4-20250514 -> sonnet-4
				const tierMatch = modelName.match(/(opus|sonnet|haiku)/)
				// Match both claude-3.5-sonnet and claude-3-5-sonnet formats
				const versionMatch =
					modelName.match(/claude-(\d+)\.(\d+)/) || modelName.match(/claude-(\d+)-(\d+)/) || modelName.match(/-([\d]+)/)

				if (tierMatch) {
					const tier = tierMatch[1]
					if (versionMatch) {
						const majorVersion = versionMatch[1]
						const minorVersion = versionMatch[2]
						formattedModel = minorVersion ? `${tier}-${majorVersion}.${minorVersion}` : `${tier}-${majorVersion}`
					} else {
						formattedModel = tier
					}
				}
			} else if (modelMaker === "openai" || modelMaker === "google") {
				// gpt-4o-2024-05-13 -> gpt-4o
				// gemini-1.5-pro-002 -> gemini-1.5-pro
				formattedModel = modelName
					.replace(/-\d{4}-\d{2}-\d{2}$/, "") // Remove dates
					.replace(/-\d{3}$/, "") // Remove version suffixes like -002
					.replace(/-exp$/, "") // Remove experimental suffix
					.replace(/-preview$/, "") // Remove preview suffix
			} else if (modelMaker.includes("llama") || modelMaker === "meta-llama") {
				// llama-3.1-70b-instruct -> llama-3.1
				formattedModel = modelName.replace(/-instruct$/, "").replace(/-\d+b(-instruct)?$/, "") // Remove parameter count like -70b
			} else {
				// Generic: remove common suffixes (preview, instruct, parameter counts)
				formattedModel = modelName
					.replace(/-preview$/, "")
					.replace(/-instruct$/, "")
					.replace(/-\d+x\d+b$/, "") // Remove MoE parameter count like -8x7b
					.replace(/-\d+b$/, "") // Remove parameter count like -14b
					.replace(/-\d{4}-\d{2}-\d{2}$/, "") // Remove dates
			}

			// Use "OR" as compact prefix for OpenRouter
			shortName = `OR:${formattedModel}`
		}
	}

	// Google models: Extract version and variant
	else if (provider === "google" || provider === "vertex") {
		// gemini-1.5-pro-002 -> gemini-1.5-pro
		// gemini-2.0-flash-exp -> gemini-2.0-flash
		const cleanedModel = modelId
			.replace(/-\d{3}$/, "") // Remove version suffixes like -002
			.replace(/-exp$/, "") // Remove experimental suffix
			.replace(/-preview$/, "") // Remove preview suffix

		// Only use this if it actually shortened the name
		if (cleanedModel.length < modelId.length) {
			shortName = `${provider}:${cleanedModel}`
		} else {
			shortName = fullModelName
		}
	}

	// Bedrock models: Show the core model identifier
	else if (provider === "bedrock") {
		// Extract meaningful parts from ARN or model ID
		const modelName = modelId.split("/").pop() || modelId
		const coreModel = modelName
			.replace(/-\d{8}$/, "") // Remove date suffix
			.replace(/:\d+:\d+$/, "") // Remove version numbers from ARN
		shortName = `${provider}:${coreModel}`
	}

	// Ollama and local models: Keep as is, usually short already
	else if (provider === "ollama" || provider === "lmstudio" || provider === "vscode-lm") {
		shortName = fullModelName
	}

	// Generic fallback: Remove date patterns and version suffixes
	else {
		const cleanedModel = modelId
			.replace(/-\d{4}-\d{2}-\d{2}$/, "") // Remove YYYY-MM-DD dates
			.replace(/-\d{8}$/, "") // Remove YYYYMMDD dates
			.replace(/-v\d+$/, "") // Remove version suffixes like -v1
		shortName = `${provider}:${cleanedModel}`
	}

	// Final fallback: if shortName is still empty, use original
	if (!shortName) {
		shortName = fullModelName
	}

	return {
		full: fullModelName,
		short: shortName,
	}
}

/**
 * Extracts the most identifiable part of a model name for display in very constrained spaces
 * This focuses on showing the model tier/type without the provider
 *
 * @param fullModelName - The full model name in format "provider:model-id"
 * @returns Just the key identifier (e.g., "sonnet-4", "gpt-4o")
 */
export function getModelIdentifier(fullModelName: string): string {
	const { short } = formatModelName(fullModelName)
	const parts = short.split(":")
	return parts[parts.length - 1] || short
}
