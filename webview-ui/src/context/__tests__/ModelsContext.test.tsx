/**
 * Tests for ModelsContext
 *
 * Validates the models context functionality including:
 * - Provider initialization
 * - Model lists for different providers
 * - State management
 * - Refresh functions
 */

import type { ModelInfo } from "@shared/api"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ModelsContextProvider, useModelsState } from "../ModelsContext"

describe("ModelsContext", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("Provider Initialization", () => {
		it("should initialize with default state", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			expect(result.current.openRouterModels).toBeDefined()
			expect(result.current.openAiModels).toEqual([])
			expect(result.current.requestyModels).toBeDefined()
			expect(result.current.groqModels).toBeDefined()
			expect(result.current.basetenModels).toBeDefined()
			expect(result.current.huggingFaceModels).toEqual({})
			expect(result.current.vercelAiGatewayModels).toBeDefined()
		})

		it("should provide setter functions", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			expect(typeof result.current.setRequestyModels).toBe("function")
			expect(typeof result.current.setGroqModels).toBe("function")
			expect(typeof result.current.setBasetenModels).toBe("function")
			expect(typeof result.current.setHuggingFaceModels).toBe("function")
			expect(typeof result.current.setVercelAiGatewayModels).toBe("function")
		})

		it("should provide refresh function", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			expect(typeof result.current.refreshOpenRouterModels).toBe("function")
		})
	})

	describe("Hook Error Handling", () => {
		it("should throw error when used outside provider", () => {
			// Suppress console errors for this test
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			expect(() => {
				renderHook(() => useModelsState())
			}).toThrow("useModelsState must be used within a ModelsContextProvider")

			consoleSpy.mockRestore()
		})
	})

	describe("Requesty Models", () => {
		it("should update requesty models", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const mockModels: Record<string, ModelInfo> = {
				"model-1": {
					maxTokens: 4096,
					contextWindow: 128000,
					supportsImages: true,
					supportsPromptCache: false,
					inputPrice: 0.003,
					outputPrice: 0.015,
				},
				"model-2": {
					maxTokens: 8192,
					contextWindow: 200000,
					supportsImages: false,
					supportsPromptCache: true,
					inputPrice: 0.005,
					outputPrice: 0.025,
				},
			}

			act(() => {
				result.current.setRequestyModels(mockModels)
			})

			expect(result.current.requestyModels).toEqual(mockModels)
		})

		it("should overwrite existing requesty models", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const initialModels: Record<string, ModelInfo> = {
				"model-1": {
					maxTokens: 4096,
					contextWindow: 128000,
					supportsImages: true,
					supportsPromptCache: false,
					inputPrice: 0.003,
					outputPrice: 0.015,
				},
			}

			const updatedModels: Record<string, ModelInfo> = {
				"model-2": {
					maxTokens: 8192,
					contextWindow: 200000,
					supportsImages: false,
					supportsPromptCache: true,
					inputPrice: 0.005,
					outputPrice: 0.025,
				},
			}

			act(() => {
				result.current.setRequestyModels(initialModels)
			})

			act(() => {
				result.current.setRequestyModels(updatedModels)
			})

			expect(result.current.requestyModels).toEqual(updatedModels)
		})
	})

	describe("Groq Models", () => {
		it("should update groq models", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const mockModels: Record<string, ModelInfo> = {
				"groq-model-1": {
					maxTokens: 4096,
					contextWindow: 128000,
					supportsImages: false,
					supportsPromptCache: false,
					inputPrice: 0.0001,
					outputPrice: 0.0002,
				},
			}

			act(() => {
				result.current.setGroqModels(mockModels)
			})

			expect(result.current.groqModels).toEqual(mockModels)
		})
	})

	describe("Baseten Models", () => {
		it("should update baseten models", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const mockModels: Record<string, ModelInfo> = {
				"baseten-model-1": {
					maxTokens: 4096,
					contextWindow: 128000,
					supportsImages: true,
					supportsPromptCache: false,
					inputPrice: 0.002,
					outputPrice: 0.01,
				},
			}

			act(() => {
				result.current.setBasetenModels(mockModels)
			})

			expect(result.current.basetenModels).toEqual(mockModels)
		})
	})

	describe("HuggingFace Models", () => {
		it("should update huggingface models", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const mockModels: Record<string, ModelInfo> = {
				"hf-model-1": {
					maxTokens: 2048,
					contextWindow: 64000,
					supportsImages: false,
					supportsPromptCache: false,
					inputPrice: 0.001,
					outputPrice: 0.005,
				},
			}

			act(() => {
				result.current.setHuggingFaceModels(mockModels)
			})

			expect(result.current.huggingFaceModels).toEqual(mockModels)
		})

		it("should start with empty huggingface models", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			expect(result.current.huggingFaceModels).toEqual({})
		})
	})

	describe("Vercel AI Gateway Models", () => {
		it("should update vercel ai gateway models", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const mockModels: Record<string, ModelInfo> = {
				"vercel-model-1": {
					maxTokens: 4096,
					contextWindow: 128000,
					supportsImages: true,
					supportsPromptCache: false,
					inputPrice: 0.003,
					outputPrice: 0.015,
				},
			}

			act(() => {
				result.current.setVercelAiGatewayModels(mockModels)
			})

			expect(result.current.vercelAiGatewayModels).toEqual(mockModels)
		})
	})

	describe("Multiple Model Updates", () => {
		it("should handle updating multiple model providers", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const requestyModels: Record<string, ModelInfo> = {
				"requesty-1": {
					maxTokens: 4096,
					contextWindow: 128000,
					supportsImages: true,
					supportsPromptCache: false,
					inputPrice: 0.003,
					outputPrice: 0.015,
				},
			}

			const groqModels: Record<string, ModelInfo> = {
				"groq-1": {
					maxTokens: 8192,
					contextWindow: 200000,
					supportsImages: false,
					supportsPromptCache: true,
					inputPrice: 0.0001,
					outputPrice: 0.0002,
				},
			}

			act(() => {
				result.current.setRequestyModels(requestyModels)
				result.current.setGroqModels(groqModels)
			})

			expect(result.current.requestyModels).toEqual(requestyModels)
			expect(result.current.groqModels).toEqual(groqModels)
		})
	})

	describe("Empty State Handling", () => {
		it("should handle clearing models", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const mockModels: Record<string, ModelInfo> = {
				"model-1": {
					maxTokens: 4096,
					contextWindow: 128000,
					supportsImages: true,
					supportsPromptCache: false,
					inputPrice: 0.003,
					outputPrice: 0.015,
				},
			}

			act(() => {
				result.current.setRequestyModels(mockModels)
			})

			expect(Object.keys(result.current.requestyModels)).toHaveLength(1)

			act(() => {
				result.current.setRequestyModels({})
			})

			expect(result.current.requestyModels).toEqual({})
		})
	})

	describe("Model Info Properties", () => {
		it("should preserve model info properties", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const modelWithAllProperties: Record<string, ModelInfo> = {
				"full-model": {
					maxTokens: 4096,
					contextWindow: 128000,
					supportsImages: true,
					supportsPromptCache: true,
					inputPrice: 0.003,
					outputPrice: 0.015,
					description: "A full-featured model",
				},
			}

			act(() => {
				result.current.setRequestyModels(modelWithAllProperties)
			})

			const model = result.current.requestyModels["full-model"]
			expect(model.maxTokens).toBe(4096)
			expect(model.contextWindow).toBe(128000)
			expect(model.supportsImages).toBe(true)
			expect(model.supportsPromptCache).toBe(true)
			expect(model.inputPrice).toBe(0.003)
			expect(model.outputPrice).toBe(0.015)
			expect(model.description).toBe("A full-featured model")
		})

		it("should handle models with minimal properties", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const minimalModel: Record<string, ModelInfo> = {
				"minimal-model": {
					maxTokens: 2048,
					contextWindow: 64000,
					supportsImages: false,
					supportsPromptCache: false,
					inputPrice: 0.001,
					outputPrice: 0.005,
				},
			}

			act(() => {
				result.current.setRequestyModels(minimalModel)
			})

			const model = result.current.requestyModels["minimal-model"]
			expect(model.maxTokens).toBe(2048)
			expect(model.contextWindow).toBe(64000)
			expect(model.supportsImages).toBe(false)
			expect(model.supportsPromptCache).toBe(false)
		})
	})

	describe("Large Model Collections", () => {
		it("should handle many models", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const manyModels: Record<string, ModelInfo> = {}
			for (let i = 0; i < 50; i++) {
				manyModels[`model-${i}`] = {
					maxTokens: 4096,
					contextWindow: 128000,
					supportsImages: i % 2 === 0,
					supportsPromptCache: i % 3 === 0,
					inputPrice: 0.001 * (i + 1),
					outputPrice: 0.005 * (i + 1),
				}
			}

			act(() => {
				result.current.setRequestyModels(manyModels)
			})

			expect(Object.keys(result.current.requestyModels)).toHaveLength(50)
			expect(result.current.requestyModels["model-0"].supportsImages).toBe(true)
			expect(result.current.requestyModels["model-1"].supportsImages).toBe(false)
		})
	})

	describe("State Independence", () => {
		it("should maintain independent state for different providers", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			const requestyModels: Record<string, ModelInfo> = {
				"requesty-1": {
					maxTokens: 4096,
					contextWindow: 128000,
					supportsImages: true,
					supportsPromptCache: false,
					inputPrice: 0.003,
					outputPrice: 0.015,
				},
			}

			const groqModels: Record<string, ModelInfo> = {
				"groq-1": {
					maxTokens: 8192,
					contextWindow: 200000,
					supportsImages: false,
					supportsPromptCache: true,
					inputPrice: 0.0001,
					outputPrice: 0.0002,
				},
			}

			act(() => {
				result.current.setRequestyModels(requestyModels)
			})

			act(() => {
				result.current.setGroqModels(groqModels)
			})

			// Updating one should not affect the other
			expect(result.current.requestyModels).toEqual(requestyModels)
			expect(result.current.groqModels).toEqual(groqModels)

			act(() => {
				result.current.setRequestyModels({})
			})

			// Groq models should remain unchanged
			expect(result.current.requestyModels).toEqual({})
			expect(result.current.groqModels).toEqual(groqModels)
		})
	})

	describe("Refresh Operations", () => {
		it("should call refresh function without errors", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			expect(() => {
				result.current.refreshOpenRouterModels()
			}).not.toThrow()
		})
	})

	describe("Performance Considerations", () => {
		it("should handle rapid updates", () => {
			const { result } = renderHook(() => useModelsState(), {
				wrapper: ModelsContextProvider,
			})

			act(() => {
				for (let i = 0; i < 10; i++) {
					result.current.setRequestyModels({
						[`model-${i}`]: {
							maxTokens: 4096 * (i + 1),
							contextWindow: 128000,
							supportsImages: true,
							supportsPromptCache: false,
							inputPrice: 0.003,
							outputPrice: 0.015,
						},
					})
				}
			})

			expect(Object.keys(result.current.requestyModels)).toHaveLength(1)
			expect(result.current.requestyModels["model-9"]).toBeDefined()
		})
	})
})
