/**
 * Cancellation token system for CLI operations
 * Allows graceful cancellation of long-running operations
 */

import { getLogger } from "../infrastructure/logger"

const logger = getLogger()

/**
 * Cancellation token interface
 */
export interface CancellationToken {
	readonly isCancelled: boolean
	readonly canBeCancelled: boolean
	onCancellationRequested(listener: () => void): void
	throwIfCancellationRequested(): void
}

/**
 * Cancellation token source
 */
export class CancellationTokenSource {
	private _token: MutableCancellationToken
	private _cancelled: boolean = false

	constructor() {
		this._token = new MutableCancellationToken(this)
	}

	get token(): CancellationToken {
		return this._token
	}

	cancel(): void {
		if (!this._cancelled) {
			this._cancelled = true
			this._token.cancel()
			logger.debug("Cancellation requested")
		}
	}

	dispose(): void {
		this.cancel()
	}

	get isCancelled(): boolean {
		return this._cancelled
	}
}

/**
 * Mutable cancellation token (internal use)
 */
class MutableCancellationToken implements CancellationToken {
	private _isCancelled: boolean = false
	private _listeners: Array<() => void> = []

	constructor(_source: CancellationTokenSource) {}

	get isCancelled(): boolean {
		return this._isCancelled
	}

	get canBeCancelled(): boolean {
		return true
	}

	onCancellationRequested(listener: () => void): void {
		if (this._isCancelled) {
			listener()
		} else {
			this._listeners.push(listener)
		}
	}

	throwIfCancellationRequested(): void {
		if (this._isCancelled) {
			throw new CancellationError("Operation was cancelled")
		}
	}

	cancel(): void {
		if (!this._isCancelled) {
			this._isCancelled = true
			const listeners = this._listeners.splice(0)
			for (const listener of listeners) {
				try {
					listener()
				} catch (error) {
					logger.error("Error in cancellation listener", error)
				}
			}
		}
	}
}

/**
 * Cancellation error
 */
export class CancellationError extends Error {
	constructor(message: string = "Operation was cancelled") {
		super(message)
		this.name = "CancellationError"
	}
}

/**
 * Check if error is a cancellation error
 */
export function isCancellationError(error: any): error is CancellationError {
	return error instanceof CancellationError || error?.name === "CancellationError"
}

/**
 * None token (never cancelled)
 */
export const CancellationToken = {
	None: {
		isCancelled: false,
		canBeCancelled: false,
		onCancellationRequested: () => {},
		throwIfCancellationRequested: () => {},
	} as CancellationToken,

	Cancelled: {
		isCancelled: true,
		canBeCancelled: true,
		onCancellationRequested: (listener: () => void) => listener(),
		throwIfCancellationRequested: () => {
			throw new CancellationError()
		},
	} as CancellationToken,
}

/**
 * Execute an operation with timeout and cancellation support
 */
export async function withTimeout<T>(
	operation: (token: CancellationToken) => Promise<T>,
	timeoutMs: number,
	timeoutMessage?: string,
): Promise<T> {
	const source = new CancellationTokenSource()

	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => {
			source.cancel()
			reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`))
		}, timeoutMs)
	})

	try {
		return await Promise.race([operation(source.token), timeoutPromise])
	} finally {
		source.dispose()
	}
}

/**
 * Execute operations in parallel with cancellation support
 */
export async function parallelWithCancellation<T>(
	operations: Array<(token: CancellationToken) => Promise<T>>,
	token: CancellationToken = CancellationToken.None,
): Promise<T[]> {
	token.throwIfCancellationRequested()

	const results = await Promise.all(
		operations.map(async (operation) => {
			try {
				return await operation(token)
			} catch (error) {
				if (isCancellationError(error)) {
					throw error
				}
				throw error
			}
		}),
	)

	return results
}

/**
 * Sleep with cancellation support
 */
export async function sleep(ms: number, token: CancellationToken = CancellationToken.None): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => resolve(), ms)

		token.onCancellationRequested(() => {
			clearTimeout(timeout)
			reject(new CancellationError("Sleep was cancelled"))
		})
	})
}

/**
 * Retry operation with cancellation support
 */
export async function retryWithCancellation<T>(
	operation: (token: CancellationToken) => Promise<T>,
	options: {
		maxRetries: number
		delayMs: number
		backoff?: boolean
		token?: CancellationToken
		onRetry?: (error: any, attempt: number) => void
	},
): Promise<T> {
	const { maxRetries, delayMs, backoff = true, token = CancellationToken.None, onRetry } = options

	let lastError: any
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			token.throwIfCancellationRequested()
			return await operation(token)
		} catch (error) {
			lastError = error

			if (isCancellationError(error)) {
				throw error
			}

			if (attempt < maxRetries) {
				const delay = backoff ? delayMs * 2 ** attempt : delayMs
				logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)

				if (onRetry) {
					onRetry(error, attempt + 1)
				}

				await sleep(delay, token)
			}
		}
	}

	throw lastError
}

/**
 * Global cancellation manager for CLI
 */
export class CancellationManager {
	private sources: Map<string, CancellationTokenSource> = new Map()

	/**
	 * Create a new cancellation token source
	 */
	create(id: string): CancellationToken {
		const source = new CancellationTokenSource()
		this.sources.set(id, source)
		return source.token
	}

	/**
	 * Cancel an operation by ID
	 */
	cancel(id: string): void {
		const source = this.sources.get(id)
		if (source) {
			source.cancel()
			this.sources.delete(id)
		}
	}

	/**
	 * Cancel all operations
	 */
	cancelAll(): void {
		for (const source of this.sources.values()) {
			source.cancel()
		}
		this.sources.clear()
	}

	/**
	 * Clean up a completed operation
	 */
	dispose(id: string): void {
		const source = this.sources.get(id)
		if (source) {
			source.dispose()
			this.sources.delete(id)
		}
	}

	/**
	 * Clean up all sources
	 */
	disposeAll(): void {
		for (const source of this.sources.values()) {
			source.dispose()
		}
		this.sources.clear()
	}
}

/**
 * Get global cancellation manager instance
 */
let cancellationManagerInstance: CancellationManager | null = null

export function getCancellationManager(): CancellationManager {
	if (!cancellationManagerInstance) {
		cancellationManagerInstance = new CancellationManager()
	}
	return cancellationManagerInstance
}
