/**
 * Utility functions for standalone clients
 */

import { StreamingCallbacks } from "@/hosts/host-provider-types"

/**
 * Converts an async iterator to streaming callbacks
 * Used for gRPC streaming responses in standalone mode
 */
export function asyncIteratorToCallbacks<T>(asyncIterator: AsyncIterable<T>, callbacks: StreamingCallbacks<T>): () => void {
	let cancelled = false

	// Start consuming the async iterator
	;(async () => {
		try {
			for await (const response of asyncIterator) {
				if (cancelled) {
					break
				}
				callbacks.onResponse(response)
			}
		} catch (error) {
			console.error("Error in async iterator:", error)
		}
	})()

	// Return a cancellation function
	return () => {
		cancelled = true
	}
}
