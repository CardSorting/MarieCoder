/**
 * Debug logging utility that only logs in development mode
 *
 * This utility helps improve production performance by stripping debug logs
 * from the production bundle. Use these functions instead of console.* for
 * debug statements that should only appear during development.
 *
 * @example
 * ```typescript
 * import { debug, logError } from '@/utils/debug_logger'
 *
 * // Development only - will be stripped in production
 * debug.log('[DEBUG] User clicked button')
 * debug.warn('[WARN] Unusual state detected')
 *
 * // Always logged - for production errors
 * logError('Failed to fetch data:', error)
 * ```
 */

const isDev = process.env.NODE_ENV === "development"

/**
 * Debug logging functions that only execute in development mode
 * These calls will not impact production performance
 */
export const debug = {
	/**
	 * Log debug information (development only)
	 */
	log: (...args: any[]) => {
		if (isDev) {
			console.log(...args)
		}
	},

	/**
	 * Log error information (development only)
	 */
	error: (...args: any[]) => {
		if (isDev) {
			console.error(...args)
		}
	},

	/**
	 * Log warning information (development only)
	 */
	warn: (...args: any[]) => {
		if (isDev) {
			console.warn(...args)
		}
	},

	/**
	 * Log informational messages (development only)
	 */
	info: (...args: any[]) => {
		if (isDev) {
			console.info(...args)
		}
	},

	/**
	 * Log table data (development only)
	 */
	table: (data: any) => {
		if (isDev) {
			console.table(data)
		}
	},

	/**
	 * Start a timer (development only)
	 */
	time: (label: string) => {
		if (isDev) {
			console.time(label)
		}
	},

	/**
	 * End a timer (development only)
	 */
	timeEnd: (label: string) => {
		if (isDev) {
			console.timeEnd(label)
		}
	},
}

/**
 * Log production errors that should always be captured
 * Use this for errors that need to be tracked even in production
 */
export const logError = (...args: any[]) => {
	console.error(...args)
}

/**
 * Log production warnings that should always be captured
 * Use this for warnings that need to be tracked even in production
 */
export const logWarn = (...args: any[]) => {
	console.warn(...args)
}

/**
 * Log production info that should always be captured
 * Use sparingly - only for critical production information
 */
export const logInfo = (...args: any[]) => {
	console.info(...args)
}
