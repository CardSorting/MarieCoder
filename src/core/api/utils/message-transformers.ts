import { Anthropic } from "@anthropic-ai/sdk"

/**
 * Message transformation utilities for different providers
 * Centralizes message format conversions to reduce duplication
 */

/**
 * Convert Anthropic messages to OpenAI format
 */
export function convertToOpenAiMessages(messages: Anthropic.Messages.MessageParam[]): any[] {
	return messages.map((message) => {
		if (typeof message.content === "string") {
			return {
				role: message.role,
				content: message.content,
			}
		}

		// Handle complex content types
		return {
			role: message.role,
			content: message.content,
		}
	})
}

/**
 * Convert Anthropic messages to Ollama format
 */
export function convertToOllamaMessages(messages: Anthropic.Messages.MessageParam[]): any[] {
	return messages.map((message) => ({
		role: message.role,
		content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
	}))
}

/**
 * Convert Anthropic messages to Gemini format
 */
export function convertAnthropicMessageToGemini(message: Anthropic.Messages.MessageParam): any {
	if (typeof message.content === "string") {
		return {
			role: message.role === "assistant" ? "model" : "user",
			parts: [{ text: message.content }],
		}
	}

	// Handle complex content types
	return {
		role: message.role === "assistant" ? "model" : "user",
		parts: Array.isArray(message.content)
			? message.content.map((part) => ({ text: typeof part === "string" ? part : JSON.stringify(part) }))
			: [{ text: JSON.stringify(message.content) }],
	}
}

/**
 * Convert messages to R1 format (for reasoning models)
 */
export function convertToR1Format(messages: Anthropic.Messages.MessageParam[]): any[] {
	return messages.map((message) => ({
		role: message.role === "assistant" ? "assistant" : "user",
		content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
	}))
}

/**
 * Convert messages to Mistral format
 */
export function convertToMistralFormat(messages: Anthropic.Messages.MessageParam[]): any[] {
	return messages.map((message) => ({
		role: message.role,
		content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
	}))
}

/**
 * Convert messages to provider-specific format
 */
export function convertMessages(messages: Anthropic.Messages.MessageParam[], provider: string): any[] {
	switch (provider) {
		case "openai":
		case "openai-native":
		case "deepseek":
		case "fireworks":
		case "together":
		case "mistral":
		case "groq":
		case "baseten":
		case "sambanova":
		case "cerebras":
		case "xai":
		case "huggingface":
		case "nebius":
		case "asksage":
		case "dify":
		case "vercel-ai-gateway":
		case "zai":
		case "oca":
		case "litellm":
		case "openrouter":
			return convertToOpenAiMessages(messages)

		case "ollama":
		case "lmstudio":
			return convertToOllamaMessages(messages)

		case "gemini":
		case "vertex":
			return messages.map(convertAnthropicMessageToGemini)

		case "qwen":
		case "qwen-code":
		case "doubao":
		case "moonshot":
		case "huawei-cloud-maas":
			return convertToMistralFormat(messages)

		case "claude-code":
			return convertToR1Format(messages)

		default:
			return convertToOpenAiMessages(messages)
	}
}

/**
 * Validate message format for provider
 */
export function validateMessageFormat(messages: any[], provider: string): boolean {
	if (!Array.isArray(messages)) {
		return false
	}

	for (const message of messages) {
		if (!message.role || !message.content) {
			return false
		}

		// Provider-specific validation
		switch (provider) {
			case "gemini":
			case "vertex":
				if (!Array.isArray(message.parts)) {
					return false
				}
				break

			case "ollama":
			case "lmstudio":
				if (typeof message.content !== "string") {
					return false
				}
				break

			default:
				// Most providers accept string or complex content
				break
		}
	}

	return true
}

/**
 * Normalize message content for consistent handling
 */
export function normalizeMessageContent(content: any): string {
	if (typeof content === "string") {
		return content
	}

	if (Array.isArray(content)) {
		return content.map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join("")
	}

	return JSON.stringify(content)
}

/**
 * Extract text content from message
 */
export function extractTextContent(message: Anthropic.Messages.MessageParam): string {
	if (typeof message.content === "string") {
		return message.content
	}

	if (Array.isArray(message.content)) {
		const textParts = message.content.filter((part): part is Anthropic.Messages.TextBlockParam => part.type === "text")
		return textParts.map((part) => part.text).join("")
	}

	return ""
}
