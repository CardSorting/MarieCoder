/**
 * Test Utilities
 *
 * Provides custom render methods and test helpers for the webview-ui
 */

import { type RenderHookOptions, type RenderOptions, render, renderHook } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { vi } from "vitest"
import { ExtensionStateContextProvider } from "@/context/ExtensionStateContext"

/**
 * Mock VSCode API
 */
export const mockVSCodeAPI = () => {
	const postMessage = vi.fn()
	const getState = vi.fn()
	const setState = vi.fn()

	const api = {
		postMessage,
		getState,
		setState,
	}

	vi.stubGlobal("acquireVsCodeApi", () => api)
	// @ts-expect-error - vscode is not defined in the global namespace in test environment
	global.vscode = api

	return api
}

/**
 * Default mock state for ExtensionState
 */
export const createMockExtensionState = (overrides = {}) => ({
	// Settings
	apiConfiguration: {
		apiProvider: "anthropic",
		apiKey: "test-key",
		anthropicApiKey: "",
		openRouterApiKey: "",
		openRouterModelId: "",
		openRouterModelInfo: {
			maxTokens: 8000,
			contextWindow: 128000,
			supportsImages: true,
			supportsPromptCache: false,
			inputPrice: 0,
			outputPrice: 0,
		},
		awsAccessKey: "",
		awsSecretKey: "",
		awsRegion: "",
		awsUseCrossRegionInference: false,
		vertexProjectId: "",
		vertexRegion: "",
		openAiBaseUrl: "",
		openAiApiKey: "",
		openAiModelId: "",
		ollamaModelId: "",
		ollamaBaseUrl: "",
		lmStudioModelId: "",
		lmStudioBaseUrl: "",
		geminiApiKey: "",
		openAiNativeApiKey: "",
		azureApiVersion: "",
		openAiStreamingEnabled: false,
		fireworksApiKey: "",
		fireworksModelId: "",
		nebiusApiKey: "",
		nebiusModelId: "",
		planModeApiProvider: "anthropic",
		actModeApiProvider: "anthropic",
		requestyApiKey: "",
		planModeRequestyModelId: "",
		actModeRequestyModelId: "",
	},
	customInstructions: "",
	alwaysAllowReadOnly: false,
	alwaysAllowWrite: false,
	alwaysAllowExecute: false,
	alwaysAllowBrowser: false,
	alwaysAllowMcp: false,
	requestDelaySeconds: 5,
	planActSeparateModelsSetting: false,
	autoApproveRepeatedTasks: false,
	soundEnabled: true,
	diffEnabled: true,
	browserEnabled: false,
	browserSettings: {
		mode: "api",
		headless: false,
	},
	terminalOutputLineLimit: 500,
	writeDelayMs: 300,
	experimentalTerminalMode: false,
	experimentalDiffStrategy: "unified",
	mcpEnabled: false,
	contextVerbosity: "normal",
	didHydrateState: true,

	// UI State
	showSettings: false,
	showHistory: false,
	showMcp: false,
	mcpTab: "installed",
	showAnnouncement: false,
	showWelcome: false,

	// Task State
	currentTaskItem: null,
	taskHistory: [],

	// Models State
	requestyModels: {},
	lastShownAnnouncementId: "",

	// MCP State
	mcpServers: [],

	// Methods
	setApiConfiguration: vi.fn(),
	setCustomInstructions: vi.fn(),
	setAlwaysAllowReadOnly: vi.fn(),
	setAlwaysAllowWrite: vi.fn(),
	setAlwaysAllowExecute: vi.fn(),
	setAlwaysAllowBrowser: vi.fn(),
	setAlwaysAllowMcp: vi.fn(),
	setRequestDelaySeconds: vi.fn(),
	setPlanActSeparateModelsSetting: vi.fn(),
	setAutoApproveRepeatedTasks: vi.fn(),
	setSoundEnabled: vi.fn(),
	setDiffEnabled: vi.fn(),
	setBrowserEnabled: vi.fn(),
	setBrowserSettings: vi.fn(),
	setTerminalOutputLineLimit: vi.fn(),
	setWriteDelayMs: vi.fn(),
	setExperimentalTerminalMode: vi.fn(),
	setExperimentalDiffStrategy: vi.fn(),
	setMcpEnabled: vi.fn(),
	setContextVerbosity: vi.fn(),
	navigateToSettings: vi.fn(),
	hideSettings: vi.fn(),
	navigateToHistory: vi.fn(),
	hideHistory: vi.fn(),
	navigateToMcpView: vi.fn(),
	closeMcpView: vi.fn(),
	showAnnouncementById: vi.fn(),
	hideAnnouncement: vi.fn(),
	showWelcomeView: vi.fn(),
	hideWelcome: vi.fn(),
	selectTask: vi.fn(),
	clearTask: vi.fn(),
	deleteTask: vi.fn(),
	exportTask: vi.fn(),
	addToHistory: vi.fn(),
	clearHistory: vi.fn(),
	setLastShownAnnouncementId: vi.fn(),
	refreshMcpServers: vi.fn(),

	...overrides,
})

/**
 * All providers wrapper for testing
 */
interface AllProvidersProps {
	children: ReactNode
}

export const AllProviders = ({ children }: AllProvidersProps) => {
	return <ExtensionStateContextProvider>{children}</ExtensionStateContextProvider>
}

/**
 * Custom render that includes all providers
 */
export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => {
	return render(ui, {
		wrapper: AllProviders,
		...options,
	})
}

/**
 * Custom renderHook that includes all providers
 */
export const renderHookWithProviders = <TProps, TResult>(
	hook: (props: TProps) => TResult,
	options?: Omit<RenderHookOptions<TProps>, "wrapper">,
) => {
	return renderHook(hook, {
		wrapper: AllProviders,
		...options,
	})
}

/**
 * Wait for async updates
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Create a mock file for testing
 */
export const createMockFile = (name: string, content: string, type = "text/plain") => {
	const blob = new Blob([content], { type })
	return new File([blob], name, { type })
}

/**
 * Mock IntersectionObserver for components that use it
 */
export const mockIntersectionObserver = () => {
	const mockIntersectionObserver = vi.fn()
	mockIntersectionObserver.mockReturnValue({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	})
	window.IntersectionObserver = mockIntersectionObserver as any
	return mockIntersectionObserver
}

/**
 * Mock ResizeObserver for components that use it
 */
export const mockResizeObserver = () => {
	const mockResizeObserver = vi.fn()
	mockResizeObserver.mockReturnValue({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	})
	window.ResizeObserver = mockResizeObserver as any
	return mockResizeObserver
}

// Re-export everything from React Testing Library
export * from "@testing-library/react"
export { vi } from "vitest"
