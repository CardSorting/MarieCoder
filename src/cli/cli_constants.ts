/**
 * CLI Constants - Centralized configuration values
 *
 * Following MarieCoder standards: All magic numbers extracted to named constants
 * for better maintainability and self-documenting code.
 *
 * @module cli_constants
 * @description Provides centralized configuration constants used throughout the CLI.
 * This ensures a single source of truth for timeout values, limits, and formatting options.
 *
 * @example
 * ```typescript
 * import { TIMEOUTS, OUTPUT_LIMITS } from './cli_constants'
 *
 * // Use timeout constants
 * setTimeout(handler, TIMEOUTS.APPROVAL_REQUEST)
 *
 * // Use output limits
 * const maxLines = OUTPUT_LIMITS.DEFAULT_LINE_LIMIT
 * ```
 */

/**
 * Timeout values (in milliseconds)
 */
export const TIMEOUTS = {
	/** Approval request timeout (5 minutes) */
	APPROVAL_REQUEST: 5 * 60 * 1000,

	/** User input timeout (5 minutes) */
	USER_INPUT: 5 * 60 * 1000,

	/** Shell integration timeout (30 seconds) */
	SHELL_INTEGRATION: 30 * 1000,

	/** Connection pool queue timeout (30 seconds) */
	CONNECTION_POOL_QUEUE: 30 * 1000,

	/** Task completion check interval (500ms) */
	TASK_CHECK_INTERVAL: 500,

	/** Message processing interval (100ms) */
	MESSAGE_CHECK_INTERVAL: 100,
} as const

/**
 * Terminal output limits
 */
export const OUTPUT_LIMITS = {
	/** Maximum lines per terminal command output */
	DEFAULT_LINE_LIMIT: 500,

	/** Maximum partial content length for streaming */
	MAX_PARTIAL_LENGTH: 500,

	/** Maximum lines to show in file change diff */
	FILE_CHANGE_PREVIEW_LINES: 50,

	/** Minimum lines to show in file change diff */
	FILE_CHANGE_MIN_LINES: 20,

	/** Maximum parameter value length in tool display */
	TOOL_PARAM_MAX_LENGTH: 100,

	/** Terminal width for formatting (default) */
	DEFAULT_TERMINAL_WIDTH: 80,

	/** Content width for boxes (accounting for borders) */
	BOX_CONTENT_WIDTH: 76,
} as const

/**
 * Streaming and throttling configuration
 */
export const STREAMING = {
	/** Minimum time between stream updates (milliseconds) */
	THROTTLE_MS: 100,

	/** Spinner animation frame duration (milliseconds) */
	SPINNER_FRAME_DURATION: 80,

	/** Progress bar render throttle (milliseconds) */
	PROGRESS_BAR_THROTTLE: 100,
} as const

/**
 * API and connection pool defaults
 */
export const API_LIMITS = {
	/** Default maximum concurrent API connections */
	MAX_CONCURRENT_REQUESTS: 10,

	/** Default requests per minute limit */
	REQUESTS_PER_MINUTE: 60,

	/** Default requests per second limit */
	REQUESTS_PER_SECOND: 10,

	/** Deduplication cache TTL (1 minute) */
	DEDUPLICATION_TTL: 60 * 1000,
} as const

/**
 * Temperature and token defaults
 */
export const MODEL_DEFAULTS = {
	/** Default temperature for model responses */
	TEMPERATURE: 0.0,

	/** Default max tokens (none specified means provider default) */
	MAX_TOKENS: undefined,
} as const

/**
 * File and task history limits
 */
export const HISTORY = {
	/** Default task history limit (number of tasks to keep) */
	TASK_HISTORY_LIMIT: 100,

	/** File permissions for secrets file (read/write for owner only) */
	SECRETS_FILE_MODE: 0o600,
} as const

/**
 * Visual formatting constants
 */
export const FORMATTING = {
	/** Default separator character */
	SEPARATOR_CHAR: "─",

	/** Default separator length */
	SEPARATOR_LENGTH: 80,

	/** Progress bar width (characters) */
	PROGRESS_BAR_WIDTH: 40,

	/** Thinking block preview length when collapsed */
	THINKING_PREVIEW_LENGTH: 70,

	/** Maximum context lines to show before diff changes */
	DIFF_CONTEXT_LINES: 3,
} as const

/**
 * Rate limiting time windows (milliseconds)
 */
export const RATE_LIMIT_WINDOWS = {
	/** One second in milliseconds */
	ONE_SECOND: 1000,

	/** One minute in milliseconds */
	ONE_MINUTE: 60 * 1000,
} as const

/**
 * Sleep and retry configuration
 */
export const RETRY = {
	/** Standard polling sleep interval (100ms) */
	POLLING_INTERVAL: 100,

	/** Connection pool shutdown check interval (100ms) */
	SHUTDOWN_CHECK_INTERVAL: 100,
} as const
