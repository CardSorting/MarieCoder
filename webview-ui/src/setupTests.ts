import "@testing-library/jest-dom"
import { vi } from "vitest"

// "Official" jest workaround for mocking window.matchMedia()
// https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // Deprecated
		removeListener: vi.fn(), // Deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
})

// Mock VSCode API for webview tests
vi.stubGlobal("acquireVsCodeApi", () => ({
	postMessage: vi.fn(),
	getState: vi.fn(),
	setState: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
	root: null,
	rootMargin: "",
	thresholds: [],
	takeRecords: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}))

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock gRPC client for context tests
vi.mock("./services/grpc-client", () => ({
	UiServiceClient: {
		subscribeToDidBecomeVisible: vi.fn(() => vi.fn()),
		subscribeToFocusChatInput: vi.fn(() => vi.fn()),
		subscribeToRelinquishControl: vi.fn(() => vi.fn()),
		subscribeToPartialMessage: vi.fn(() => vi.fn()),
		initializeWebview: vi.fn(() => Promise.resolve()),
	},
	StateServiceClient: {
		subscribeToState: vi.fn(() => vi.fn()),
		getAvailableTerminalProfiles: vi.fn(() => Promise.resolve({ profiles: [] })),
	},
	TaskServiceClient: {
		subscribeToCurrentTask: vi.fn(() => vi.fn()),
		subscribeToTaskHistory: vi.fn(() => vi.fn()),
	},
	ModelsServiceClient: {
		subscribeToModels: vi.fn(() => vi.fn()),
		subscribeToOpenRouterModels: vi.fn(() => vi.fn()),
		refreshOpenRouterModels: vi.fn(() => Promise.resolve({ models: {} })),
		getLmStudioModels: vi.fn(() => Promise.resolve({ models: [] })),
	},
	McpServiceClient: {
		subscribeToMcpServers: vi.fn(() => vi.fn()),
		subscribeToMcpMarketplaceCatalog: vi.fn(() => vi.fn()),
	},
}))

// Mock debug logger
vi.mock("./utils/debug_logger", () => ({
	debug: {
		log: vi.fn(),
		error: vi.fn(),
	},
	logError: vi.fn(),
}))
