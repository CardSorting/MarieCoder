/** biome-ignore-all lint/complexity/noThisInStatic: In static methods, this refers to the constructor (the subclass that invoked the method) when we want to refer to the subclass serviceName.
 *
 * NOTE: This file imports PLATFORM_CONFIG directly rather than using the PlatformProvider
 * because it contains static utility methods that are called from various contexts,
 * including non-React code. The configuration is compile-time constant, so direct
 * import is safe and ensures the methods work consistently regardless of React context.
 */
/**
 * Generate a random UUID using the Web Crypto API
 * Replaces uuid package to reduce dependencies
 */
const generateUUID = (): string => {
	// Use crypto.randomUUID() if available (modern browsers and Node 19+)
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID()
	}

	// Fallback implementation (RFC4122 version 4)
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0
		const v = c === "x" ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}

import { debug } from "@/utils/debug_logger"
import { PLATFORM_CONFIG } from "../config/platform.config"

// Default timeout for requests (30 seconds)
const DEFAULT_REQUEST_TIMEOUT_MS = 30000

export interface Callbacks<TResponse> {
	onResponse: (response: TResponse) => void
	onError: (error: Error) => void
	onComplete: () => void
}

export abstract class ProtoBusClient {
	static serviceName: string

	static async makeUnaryRequest<TRequest, TResponse>(
		methodName: string,
		request: TRequest,
		encodeRequest: (_: TRequest) => unknown,
		decodeResponse: (_: { [key: string]: any }) => TResponse,
		timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
	): Promise<TResponse> {
		return new Promise((resolve, reject) => {
			const requestId = generateUUID()
			let timeoutId: NodeJS.Timeout | null = null

			// Set up one-time listener for this specific request
			const handleResponse = (event: MessageEvent) => {
				const message = event.data
				if (message.type === "grpc_response" && message.grpc_response?.request_id === requestId) {
					// Clear timeout and remove listener once we get our response
					if (timeoutId) {
						clearTimeout(timeoutId)
					}
					window.removeEventListener("message", handleResponse)

					if (message.grpc_response.message) {
						const response = PLATFORM_CONFIG.decodeMessage(message.grpc_response.message, decodeResponse)
						resolve(response)
					} else if (message.grpc_response.error) {
						reject(new Error(message.grpc_response.error))
					} else {
						debug.error("Received ProtoBus message with no response or error ", JSON.stringify(message))
						reject(new Error("Received invalid response from extension"))
					}
				}
			}

			// Set up timeout to prevent hanging requests
			timeoutId = setTimeout(() => {
				window.removeEventListener("message", handleResponse)
				const errorMsg = `Request timeout: ${this.serviceName}.${methodName} did not respond within ${timeoutMs}ms. Please check if the extension is running properly.`
				debug.error(errorMsg)
				reject(new Error(errorMsg))
			}, timeoutMs)

			window.addEventListener("message", handleResponse)
			PLATFORM_CONFIG.postMessage({
				type: "grpc_request",
				grpc_request: {
					service: this.serviceName,
					method: methodName,
					message: PLATFORM_CONFIG.encodeMessage(request, encodeRequest),
					request_id: requestId,
					is_streaming: false,
				},
			})
		})
	}

	static makeStreamingRequest<TRequest, TResponse>(
		methodName: string,
		request: TRequest,
		encodeRequest: (_: TRequest) => unknown,
		decodeResponse: (_: { [key: string]: any }) => TResponse,
		callbacks: Callbacks<TResponse>,
		timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
	): () => void {
		const requestId = generateUUID()
		let hasReceivedFirstResponse = false
		let timeoutId: NodeJS.Timeout | null = null

		// Set up listener for streaming responses
		const handleResponse = (event: MessageEvent) => {
			const message = event.data
			if (message.type === "grpc_response" && message.grpc_response?.request_id === requestId) {
				// Clear the initial timeout once we receive the first response
				if (!hasReceivedFirstResponse && timeoutId) {
					clearTimeout(timeoutId)
					timeoutId = null
					hasReceivedFirstResponse = true
				}

				if (message.grpc_response.message) {
					// Process streaming message
					const response = PLATFORM_CONFIG.decodeMessage(message.grpc_response.message, decodeResponse)
					callbacks.onResponse(response)
				} else if (message.grpc_response.error) {
					// Handle error
					if (timeoutId) {
						clearTimeout(timeoutId)
					}
					if (callbacks.onError) {
						callbacks.onError(new Error(message.grpc_response.error))
					}
					// Only remove the event listener on error
					window.removeEventListener("message", handleResponse)
				} else {
					debug.error("Received ProtoBus message with no response or error ", JSON.stringify(message))
				}
				if (message.grpc_response.is_streaming === false) {
					if (timeoutId) {
						clearTimeout(timeoutId)
					}
					if (callbacks.onComplete) {
						callbacks.onComplete()
					}
					// Only remove the event listener when the stream is explicitly ended
					window.removeEventListener("message", handleResponse)
				}
			}
		}

		// Set up timeout for the initial response to prevent hanging streams
		timeoutId = setTimeout(() => {
			if (!hasReceivedFirstResponse) {
				window.removeEventListener("message", handleResponse)
				const errorMsg = `Stream timeout: ${this.serviceName}.${methodName} did not start within ${timeoutMs}ms. Please check if the extension is running properly.`
				debug.error(errorMsg)
				if (callbacks.onError) {
					callbacks.onError(new Error(errorMsg))
				}
			}
		}, timeoutMs)

		window.addEventListener("message", handleResponse)
		PLATFORM_CONFIG.postMessage({
			type: "grpc_request",
			grpc_request: {
				service: this.serviceName,
				method: methodName,
				message: PLATFORM_CONFIG.encodeMessage(request, encodeRequest),
				request_id: requestId,
				is_streaming: true,
			},
		})
		// Return a function to cancel the stream
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
			window.removeEventListener("message", handleResponse)
			PLATFORM_CONFIG.postMessage({
				type: "grpc_request_cancel",
				grpc_request_cancel: {
					request_id: requestId,
				},
			})
			debug.log(`[DEBUG] Sent cancellation for request: ${requestId}`)
		}
	}
}
