/**
 * APIOptions Component Tests
 *
 * Tests for the API configuration options component
 */

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockExtensionState, mockVSCodeAPI } from "@/__tests__/test-utils"
import { useExtensionState } from "@/context/ExtensionStateContext"
import ApiOptions from "../ApiOptions"

// Mock the ExtensionStateContext
vi.mock("@/context/ExtensionStateContext", async (importOriginal) => {
	const actual = (await importOriginal()) as any
	return {
		...actual,
		useExtensionState: vi.fn(),
	}
})

// Mock the ModelsContext to prevent gRPC errors
vi.mock("@/context/ModelsContext", () => ({
	useModels: vi.fn(() => ({
		openRouterModels: {
			"anthropic/claude-3.5-sonnet": {
				id: "anthropic/claude-3.5-sonnet",
				name: "Claude 3.5 Sonnet",
				maxTokens: 8000,
				contextWindow: 200000,
				supportsImages: true,
				supportsPromptCache: false,
				inputPrice: 3,
				outputPrice: 15,
			},
		},
		openRouterModelsLoading: false,
		openRouterModelsError: null,
	})),
	ModelsContextProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe("ApiOptions Component - Anthropic Provider", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockVSCodeAPI()

		const mockState = createMockExtensionState({
			apiConfiguration: {
				planModeApiProvider: "anthropic",
				actModeApiProvider: "anthropic",
				anthropicApiKey: "",
				planModeApiModelId: "claude-sonnet-4-20250514",
				actModeApiModelId: "claude-sonnet-4-20250514",
			},
		})

		vi.mocked(useExtensionState).mockReturnValue(mockState as any)
	})

	it("renders API Provider selector", () => {
		render(<ApiOptions currentMode="plan" showModelOptions={true} />)
		const providerSelector = screen.getByTestId("provider-selector-input")
		expect(providerSelector).toBeInTheDocument()
	})

	it("renders Anthropic API Key input", () => {
		render(<ApiOptions currentMode="plan" showModelOptions={true} />)
		// Anthropic provider should render its own API key input
		const apiKeyInput = screen.getByPlaceholderText("Enter API Key...")
		expect(apiKeyInput).toBeInTheDocument()
	})

	it("renders Anthropic Model Select when showModelOptions is true", () => {
		render(<ApiOptions currentMode="plan" showModelOptions={true} />)
		const modelIdSelect = screen.getByLabelText("Model")
		expect(modelIdSelect).toBeInTheDocument()
	})

	it("does not render model options when showModelOptions is false", () => {
		render(<ApiOptions currentMode="plan" showModelOptions={false} />)
		const modelIdSelect = screen.queryByLabelText("Model")
		expect(modelIdSelect).not.toBeInTheDocument()
	})
})

describe("ApiOptions Component - OpenRouter Provider", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockVSCodeAPI()

		const mockState = createMockExtensionState({
			apiConfiguration: {
				planModeApiProvider: "openrouter",
				actModeApiProvider: "openrouter",
				openRouterApiKey: "test-key",
				planModeOpenRouterModelId: "anthropic/claude-3.5-sonnet",
				actModeOpenRouterModelId: "anthropic/claude-3.5-sonnet",
				planModeOpenRouterModelInfo: {
					maxTokens: 8000,
					contextWindow: 128000,
					supportsImages: true,
					supportsPromptCache: false,
					inputPrice: 0,
					outputPrice: 0,
				},
				actModeOpenRouterModelInfo: {
					maxTokens: 8000,
					contextWindow: 128000,
					supportsImages: true,
					supportsPromptCache: false,
					inputPrice: 0,
					outputPrice: 0,
				},
			},
			openRouterModels: {
				"anthropic/claude-3.5-sonnet": {
					id: "anthropic/claude-3.5-sonnet",
					name: "Claude 3.5 Sonnet",
					maxTokens: 8000,
					contextWindow: 200000,
					supportsImages: true,
					supportsPromptCache: false,
					inputPrice: 3,
					outputPrice: 15,
				},
			},
			refreshOpenRouterModels: vi.fn(),
			favoritedModelIds: [],
		})

		vi.mocked(useExtensionState).mockReturnValue(mockState as any)
	})

	it("renders API Provider selector", () => {
		render(<ApiOptions currentMode="plan" showModelOptions={true} />)
		const providerSelector = screen.getByTestId("provider-selector-input")
		expect(providerSelector).toBeInTheDocument()
	})

	it("renders OpenRouter API Key input", () => {
		render(<ApiOptions currentMode="plan" showModelOptions={true} />)
		const apiKeyInput = screen.getByPlaceholderText("Enter API Key...")
		expect(apiKeyInput).toBeInTheDocument()
	})

	it("renders OpenRouter Model Picker when showModelOptions is true", () => {
		render(<ApiOptions currentMode="plan" showModelOptions={true} />)
		// OpenRouter uses a custom model picker, not a simple input
		// Check for the model label which is part of the picker UI
		const modelLabel = screen.getByText("Model")
		expect(modelLabel).toBeInTheDocument()
	})
})

describe("ApiOptions Component - LM Studio Provider", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockVSCodeAPI()

		const mockState = createMockExtensionState({
			apiConfiguration: {
				planModeApiProvider: "lmstudio",
				actModeApiProvider: "lmstudio",
				lmStudioBaseUrl: "http://localhost:1234",
				planModeLmStudioModelId: "test-model",
				actModeLmStudioModelId: "test-model",
			},
		})

		vi.mocked(useExtensionState).mockReturnValue(mockState as any)
	})

	it("renders API Provider selector", () => {
		render(<ApiOptions currentMode="plan" showModelOptions={true} />)
		const providerSelector = screen.getByTestId("provider-selector-input")
		expect(providerSelector).toBeInTheDocument()
	})

	it("renders LM Studio Base URL checkbox", () => {
		render(<ApiOptions currentMode="plan" showModelOptions={true} />)
		const baseUrlCheckbox = screen.getByText("Use custom base URL")
		expect(baseUrlCheckbox).toBeInTheDocument()
	})

	it("renders LM Studio Model selector when showModelOptions is true", () => {
		render(<ApiOptions currentMode="plan" showModelOptions={true} />)
		// LM Studio should have a model dropdown
		const modelLabel = screen.getByText("Model")
		expect(modelLabel).toBeInTheDocument()
	})
})

describe("ApiOptions Component - Error Messages", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockVSCodeAPI()

		const mockState = createMockExtensionState({
			apiConfiguration: {
				planModeApiProvider: "anthropic",
				actModeApiProvider: "anthropic",
			},
		})

		vi.mocked(useExtensionState).mockReturnValue(mockState as any)
	})

	it("displays API error message when provided", () => {
		render(<ApiOptions apiErrorMessage="Invalid API key" currentMode="plan" showModelOptions={true} />)
		expect(screen.getByText("Invalid API key")).toBeInTheDocument()
	})

	it("displays model ID error message when provided", () => {
		render(<ApiOptions currentMode="plan" modelIdErrorMessage="Invalid model ID" showModelOptions={true} />)
		expect(screen.getByText("Invalid model ID")).toBeInTheDocument()
	})

	it("displays both error messages when both are provided", () => {
		render(
			<ApiOptions
				apiErrorMessage="Invalid API key"
				currentMode="plan"
				modelIdErrorMessage="Invalid model ID"
				showModelOptions={true}
			/>,
		)
		expect(screen.getByText("Invalid API key")).toBeInTheDocument()
		expect(screen.getByText("Invalid model ID")).toBeInTheDocument()
	})
})
