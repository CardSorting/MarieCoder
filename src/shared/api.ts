export type ApiProvider = "anthropic" | "openrouter" | "lmstudio"

export interface ApiHandlerSecrets {
	apiKey?: string // anthropic
	openRouterApiKey?: string
}

export interface ApiHandlerOptions {
	// Global configuration (not mode-specific)
	ulid?: string // Used to identify the task in API requests
	anthropicBaseUrl?: string
	openRouterProviderSorting?: string
	lmStudioBaseUrl?: string
	lmStudioMaxTokens?: string
	requestTimeoutMs?: number
	onRetryAttempt?: (attempt: number, maxRetries: number, delay: number, error: any) => void

	// Plan mode configurations
	planModeApiModelId?: string
	planModeThinkingBudgetTokens?: number
	planModeReasoningEffort?: string
	planModeOpenRouterModelId?: string
	planModeOpenRouterModelInfo?: ModelInfo
	planModeLmStudioModelId?: string

	// Act mode configurations
	actModeApiModelId?: string
	actModeThinkingBudgetTokens?: number
	actModeReasoningEffort?: string
	actModeOpenRouterModelId?: string
	actModeOpenRouterModelInfo?: ModelInfo
	actModeLmStudioModelId?: string
}

export type ApiConfiguration = ApiHandlerOptions &
	ApiHandlerSecrets & {
		planModeApiProvider?: ApiProvider
		actModeApiProvider?: ApiProvider
	}

// Models

interface PriceTier {
	tokenLimit: number // Upper limit (inclusive) of *input* tokens for this price. Use Infinity for the highest tier.
	price: number // Price per million tokens for this tier.
}

export interface ModelInfo {
	maxTokens?: number
	contextWindow?: number
	supportsImages?: boolean
	supportsPromptCache: boolean // this value is hardcoded for now
	inputPrice?: number // Keep for non-tiered input models
	outputPrice?: number // Keep for non-tiered output models
	thinkingConfig?: {
		maxBudget?: number // Max allowed thinking budget tokens
		outputPrice?: number // Output price per million tokens when budget > 0
		outputPriceTiers?: PriceTier[] // Optional: Tiered output price when budget > 0
	}
	cacheWritesPrice?: number
	cacheReadsPrice?: number
	description?: string
	supportsGlobalEndpoint?: boolean
	tiers?: readonly {
		contextWindow: number
		inputPrice?: number
		outputPrice?: number
		cacheWritesPrice?: number
		cacheReadsPrice?: number
	}[]
}

export interface OpenAiCompatibleModelInfo extends ModelInfo {
	temperature?: number
	isR1FormatRequired?: boolean
}

export const CLAUDE_SONNET_1M_SUFFIX = ":1m"
export const CLAUDE_SONNET_1M_TIERS = [
	{
		contextWindow: 200000,
		inputPrice: 3.0,
		outputPrice: 15,
		cacheWritesPrice: 3.75,
		cacheReadsPrice: 0.3,
	},
	{
		contextWindow: Number.MAX_SAFE_INTEGER, // storing infinity in vs storage is not possible, it converts to 'null', which causes crash in webview ModelInfoView
		inputPrice: 6,
		outputPrice: 22.5,
		cacheWritesPrice: 7.5,
		cacheReadsPrice: 0.6,
	},
]

// Anthropic
// https://docs.anthropic.com/en/docs/about-claude/models // prices updated 2025-01-02
export type AnthropicModelId = keyof typeof anthropicModels
export const anthropicDefaultModelId: AnthropicModelId = "claude-sonnet-4-5-20250929"
export const ANTHROPIC_MIN_THINKING_BUDGET = 1_024
export const ANTHROPIC_MAX_THINKING_BUDGET = 6_000
export const anthropicModels = {
	"claude-sonnet-4-5-20250929": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		cacheWritesPrice: 3.75,
		cacheReadsPrice: 0.3,
	},
	"claude-sonnet-4-5-20250929:1m": {
		maxTokens: 8192,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		cacheWritesPrice: 3.75,
		cacheReadsPrice: 0.3,
		tiers: CLAUDE_SONNET_1M_TIERS,
	},
	"claude-sonnet-4-20250514": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		cacheWritesPrice: 3.75,
		cacheReadsPrice: 0.3,
	},
	"claude-sonnet-4-20250514:1m": {
		maxTokens: 8192,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		cacheWritesPrice: 3.75,
		cacheReadsPrice: 0.3,
		tiers: CLAUDE_SONNET_1M_TIERS,
	},
	"claude-opus-4-1-20250805": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 15.0,
		outputPrice: 75.0,
		cacheWritesPrice: 18.75,
		cacheReadsPrice: 1.5,
	},
	"claude-opus-4-20250514": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 15.0,
		outputPrice: 75.0,
		cacheWritesPrice: 18.75,
		cacheReadsPrice: 1.5,
	},
	"claude-3-7-sonnet-20250219": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,

		supportsPromptCache: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		cacheWritesPrice: 3.75,
		cacheReadsPrice: 0.3,
	},
	"claude-3-5-sonnet-20241022": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,

		supportsPromptCache: true,
		inputPrice: 3.0, // $3 per million input tokens
		outputPrice: 15.0, // $15 per million output tokens
		cacheWritesPrice: 3.75, // $3.75 per million tokens
		cacheReadsPrice: 0.3, // $0.30 per million tokens
	},
	"claude-3-5-haiku-20241022": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.8,
		outputPrice: 4.0,
		cacheWritesPrice: 1.0,
		cacheReadsPrice: 0.08,
	},
	"claude-3-opus-20240229": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 15.0,
		outputPrice: 75.0,
		cacheWritesPrice: 18.75,
		cacheReadsPrice: 1.5,
	},
	"claude-3-haiku-20240307": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.25,
		outputPrice: 1.25,
		cacheWritesPrice: 0.3,
		cacheReadsPrice: 0.03,
	},
} as const satisfies Record<string, ModelInfo> // as const assertion makes the object deeply readonly

// OpenRouter
// https://openrouter.ai/models?order=newest&supported_parameters=tools
export const openRouterDefaultModelId = "anthropic/claude-sonnet-4.5" // will always exist in openRouterModels
export const openRouterClaudeSonnet41mModelId = `anthropic/claude-sonnet-4${CLAUDE_SONNET_1M_SUFFIX}`
export const openRouterClaudeSonnet451mModelId = `anthropic/claude-sonnet-4.5${CLAUDE_SONNET_1M_SUFFIX}`
export const openRouterDefaultModelInfo: ModelInfo = {
	maxTokens: 8192,
	contextWindow: 200_000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3,
	description:
		"Claude Sonnet 4.5 delivers superior intelligence across coding, agentic search, and AI agent capabilities. It's a powerful choice for agentic coding, and can complete tasks across the entire software development lifecycle—from initial planning to bug fixes, maintenance to large refactors. It offers strong performance in both planning and solving for complex coding tasks, making it an ideal choice to power end-to-end software development processes.\n\nRead more in the [blog post here](https://www.anthropic.com/claude/sonnet)",
}

// Cline custom model - code-supernova
export const clineCodeSupernovaModelInfo: ModelInfo = {
	contextWindow: 1000000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 0,
	outputPrice: 0,
	cacheReadsPrice: 0,
	cacheWritesPrice: 0,
	description: "A versatile agentic coding stealth model that supports image inputs.",
}

// LMStudio (OpenAI-compatible local server)
export const openAiModelInfoSaneDefaults: OpenAiCompatibleModelInfo = {
	maxTokens: -1,
	contextWindow: 128_000,
	supportsImages: true,
	supportsPromptCache: false,
	isR1FormatRequired: false,
	inputPrice: 0,
	outputPrice: 0,
	temperature: 0,
}

// Gemini
export type GeminiModelId = keyof typeof geminiModels
export const geminiModels = {
	"gemini-2.5-pro": {
		maxTokens: 65536,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 2.5,
		outputPrice: 15,
		cacheReadsPrice: 0.625,
	},
} as const satisfies Record<string, ModelInfo>

// Vercel AI Gateway
export const vercelAiGatewayDefaultModelId = "anthropic/claude-sonnet-4"
export const vercelAiGatewayDefaultModelInfo: ModelInfo = {
	maxTokens: 8192,
	contextWindow: 200_000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3,
}

// Groq
export type GroqModelId = keyof typeof groqModels
export const groqDefaultModelId: GroqModelId = "llama-3.1-70b-versatile"
export const groqModels = {
	"llama-3.1-70b-versatile": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.59,
		outputPrice: 0.79,
	},
} as const satisfies Record<string, ModelInfo>

// Requesty
export const requestyDefaultModelId = "anthropic/claude-3-7-sonnet-latest"
export const requestyDefaultModelInfo: ModelInfo = {
	maxTokens: 8192,
	contextWindow: 200_000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3,
}

// Baseten
export const basetenModels = {
	"llama-3.1-70b-instruct": {
		maxTokens: 8192,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.5,
		outputPrice: 0.75,
	},
} as const satisfies Record<string, ModelInfo>
export type BasetenModelId = keyof typeof basetenModels
export const basetenDefaultModelId = "llama-3.1-70b-instruct" satisfies BasetenModelId
