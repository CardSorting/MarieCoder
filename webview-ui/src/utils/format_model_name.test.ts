/**
 * Tests for model name formatting utilities
 */

import { describe, expect, it } from "vitest"
import { formatModelName, getModelIdentifier } from "./format_model_name"

describe("formatModelName", () => {
	describe("Anthropic models", () => {
		it("should format claude-sonnet-4 models correctly", () => {
			const result = formatModelName("anthropic:claude-sonnet-4-20250514")
			expect(result.full).toBe("anthropic:claude-sonnet-4-20250514")
			expect(result.short).toBe("anthropic:sonnet-4")
		})

		it("should format claude-3-5-sonnet models correctly", () => {
			const result = formatModelName("anthropic:claude-3-5-sonnet-20241022")
			expect(result.full).toBe("anthropic:claude-3-5-sonnet-20241022")
			expect(result.short).toBe("anthropic:sonnet-3.5")
		})

		it("should format claude-opus models correctly", () => {
			const result = formatModelName("anthropic:claude-opus-4-20250514")
			expect(result.full).toBe("anthropic:claude-opus-4-20250514")
			expect(result.short).toBe("anthropic:opus-4")
		})

		it("should format claude-haiku models correctly", () => {
			const result = formatModelName("anthropic:claude-haiku-3-20240307")
			expect(result.full).toBe("anthropic:claude-haiku-3-20240307")
			expect(result.short).toBe("anthropic:haiku-3")
		})
	})

	describe("OpenAI models", () => {
		it("should remove date suffixes from gpt-4 models", () => {
			const result = formatModelName("openai:gpt-4-turbo-2024-04-09")
			expect(result.full).toBe("openai:gpt-4-turbo-2024-04-09")
			expect(result.short).toBe("openai:gpt-4-turbo")
		})

		it("should remove date suffixes from gpt-4o models", () => {
			const result = formatModelName("openai:gpt-4o-2024-05-13")
			expect(result.full).toBe("openai:gpt-4o-2024-05-13")
			expect(result.short).toBe("openai:gpt-4o")
		})

		it("should handle o1 models correctly", () => {
			const result = formatModelName("openai:o1-preview-2024-09-12")
			expect(result.full).toBe("openai:o1-preview-2024-09-12")
			expect(result.short).toBe("openai:o1-preview")
		})
	})

	describe("Azure OpenAI models", () => {
		it("should format azure-openai models", () => {
			const result = formatModelName("azure-openai:gpt-4-turbo-2024-04-09")
			expect(result.full).toBe("azure-openai:gpt-4-turbo-2024-04-09")
			expect(result.short).toBe("azure-openai:gpt-4-turbo")
		})
	})

	describe("OpenRouter models", () => {
		it("should format openrouter anthropic models", () => {
			const result = formatModelName("openrouter:anthropic/claude-3.5-sonnet")
			expect(result.full).toBe("openrouter:anthropic/claude-3.5-sonnet")
			expect(result.short).toBe("openrouter:anthropic/claude-3.5-sonnet")
		})

		it("should simplify openrouter models with parameter counts", () => {
			const result = formatModelName("openrouter:meta-llama/llama-3.1-70b-instruct")
			expect(result.full).toBe("openrouter:meta-llama/llama-3.1-70b-instruct")
			expect(result.short).toBe("openrouter:meta-llama/llama-3.1")
		})
	})

	describe("Google models", () => {
		it("should remove version suffixes from gemini models", () => {
			const result = formatModelName("google:gemini-1.5-pro-002")
			expect(result.full).toBe("google:gemini-1.5-pro-002")
			expect(result.short).toBe("google:gemini-1.5-pro")
		})

		it("should remove experimental suffixes", () => {
			const result = formatModelName("google:gemini-2.0-flash-exp")
			expect(result.full).toBe("google:gemini-2.0-flash-exp")
			expect(result.short).toBe("google:gemini-2.0-flash")
		})

		it("should handle vertex provider", () => {
			const result = formatModelName("vertex:gemini-1.5-pro-preview")
			expect(result.full).toBe("vertex:gemini-1.5-pro-preview")
			expect(result.short).toBe("vertex:gemini-1.5-pro")
		})
	})

	describe("Bedrock models", () => {
		it("should clean bedrock model names", () => {
			const result = formatModelName("bedrock:anthropic.claude-v2-20231122")
			expect(result.full).toBe("bedrock:anthropic.claude-v2-20231122")
			expect(result.short).toBe("bedrock:anthropic.claude-v2")
		})
	})

	describe("Local models", () => {
		it("should keep ollama models as-is", () => {
			const result = formatModelName("ollama:llama3.2")
			expect(result.full).toBe("ollama:llama3.2")
			expect(result.short).toBe("ollama:llama3.2")
		})

		it("should keep lmstudio models as-is", () => {
			const result = formatModelName("lmstudio:mistral-7b")
			expect(result.full).toBe("lmstudio:mistral-7b")
			expect(result.short).toBe("lmstudio:mistral-7b")
		})

		it("should keep vscode-lm models as-is", () => {
			const result = formatModelName("vscode-lm:copilot-gpt-4")
			expect(result.full).toBe("vscode-lm:copilot-gpt-4")
			expect(result.short).toBe("vscode-lm:copilot-gpt-4")
		})
	})

	describe("Edge cases", () => {
		it("should handle unknown model names", () => {
			const result = formatModelName("unknown")
			expect(result.full).toBe("unknown")
			expect(result.short).toBe("unknown")
		})

		it("should handle empty strings", () => {
			const result = formatModelName("")
			expect(result.full).toBe("")
			expect(result.short).toBe("")
		})

		it("should handle model names without provider", () => {
			const result = formatModelName("gpt-4")
			expect(result.full).toBe("gpt-4")
			expect(result.short).toBe("gpt-4")
		})

		it("should handle models with multiple colons", () => {
			const result = formatModelName("provider:model:with:colons")
			expect(result.full).toBe("provider:model:with:colons")
			// Should use generic fallback
			expect(result.short).toBe("provider:model:with:colons")
		})
	})
})

describe("getModelIdentifier", () => {
	it("should extract identifier from anthropic models", () => {
		const identifier = getModelIdentifier("anthropic:claude-sonnet-4-20250514")
		expect(identifier).toBe("sonnet-4")
	})

	it("should extract identifier from openai models", () => {
		const identifier = getModelIdentifier("openai:gpt-4-turbo-2024-04-09")
		expect(identifier).toBe("gpt-4-turbo")
	})

	it("should extract identifier from openrouter models", () => {
		const identifier = getModelIdentifier("openrouter:anthropic/claude-3.5-sonnet")
		expect(identifier).toBe("anthropic/claude-3.5-sonnet")
	})

	it("should handle unknown models", () => {
		const identifier = getModelIdentifier("unknown")
		expect(identifier).toBe("unknown")
	})
})
