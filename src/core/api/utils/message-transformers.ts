import { Anthropic } from "@anthropic-ai/sdk"

/**
 * Message transformation utilities for supported providers
 * Only Anthropic and OpenRouter are supported
 * OpenRouter uses OpenAI-compatible format
 */

/**
 * Convert Anthropic messages to OpenAI format (used by OpenRouter)
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
 * Convert messages to provider-specific format
 * Only supports anthropic and openrouter
 */
export function convertMessages(messages: Anthropic.Messages.MessageParam[], provider: string): any[] {
	switch (provider) {
		case "openrouter":
			return convertToOpenAiMessages(messages)

		case "anthropic":
		default:
			// Anthropic uses native format, no conversion needed
			return messages
	}
}

/**
 * Validate message format for provider
 */
export function validateMessageFormat(messages: any[], _provider: string): boolean {
	if (!Array.isArray(messages)) {
		return false
	}

	for (const message of messages) {
		if (!message.role || !message.content) {
			return false
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
