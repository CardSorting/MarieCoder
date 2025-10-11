/**
 * Fetch utilities for HTTP requests with timeout support
 *
 * Replaces axios with native fetch API for better performance and smaller bundle size.
 */

export interface FetchOptions extends Omit<RequestInit, "signal"> {
	/** Timeout in milliseconds */
	timeout?: number
}

/**
 * Performs a fetch request with automatic timeout handling
 *
 * @param url - The URL to fetch
 * @param options - Fetch options with optional timeout
 * @returns Promise resolving to parsed JSON response
 * @throws Error if request fails or times out
 *
 * @example
 * ```typescript
 * const data = await fetchWithTimeout('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key: 'value' }),
 *   timeout: 10000
 * })
 * ```
 */
export async function fetchWithTimeout<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
	const { timeout = 10000, ...fetchOptions } = options

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeout)

	try {
		const response = await fetch(url, {
			...fetchOptions,
			signal: controller.signal,
		})

		if (!response.ok) {
			const errorText = await response.text().catch(() => response.statusText)
			throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
		}

		const data = await response.json()
		return data as T
	} catch (error: any) {
		if (error.name === "AbortError") {
			throw new Error(`Request timeout after ${timeout}ms: ${url}`)
		}
		throw error
	} finally {
		clearTimeout(timeoutId)
	}
}

/**
 * Performs a GET request with timeout
 */
export async function fetchGet<T = any>(url: string, timeout = 10000): Promise<T> {
	return fetchWithTimeout<T>(url, { method: "GET", timeout })
}

/**
 * Performs a POST request with JSON body and timeout
 */
export async function fetchPost<T = any>(url: string, body: any, timeout = 10000): Promise<T> {
	return fetchWithTimeout<T>(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
		timeout,
	})
}
