import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { Logger } from "@services/logging/Logger"
import ReconnectingEventSource from "reconnecting-eventsource"
import { z } from "zod"
import { ServerConfigSchema } from "./schemas"
import type { Transport } from "./types"

/**
 * Factory for creating MCP transport connections
 *
 * This service creates and configures different types of transport connections
 * for MCP servers (stdio, SSE, streamableHttp). Each transport type requires
 * different setup and error handling.
 *
 * Responsibilities:
 * - Create stdio transports with process management
 * - Create SSE transports with reconnection logic
 * - Create streamableHttp transports
 * - Configure error handlers for each transport type
 * - Handle stderr streams for stdio transports
 * - Configure transport-specific options
 *
 * @example
 * ```typescript
 * const factory = new McpTransportFactory()
 * const transport = await factory.createTransport(config, serverName, onError, onClose)
 * ```
 */
export class McpTransportFactory {
	/**
	 * Create a transport based on server configuration
	 *
	 * Creates the appropriate transport type (stdio, SSE, streamableHttp) based
	 * on the server configuration. Sets up error handlers, close handlers, and
	 * starts the transport if necessary.
	 *
	 * @param config - Server configuration with transport details
	 * @param serverName - Name of the server (for logging)
	 * @param onError - Error handler callback
	 * @param onClose - Close handler callback
	 * @param onStderr - Stderr handler callback (stdio only)
	 * @returns Promise<Transport> - Configured and started transport
	 * @throws Error if unknown transport type
	 */
	async createTransport(
		config: z.infer<typeof ServerConfigSchema>,
		serverName: string,
		onError: (error: Error) => Promise<void>,
		onClose?: () => Promise<void>,
		onStderr?: (output: string) => Promise<void>,
	): Promise<Transport> {
		switch (config.type) {
			case "stdio":
				return await this.createStdioTransport(config, serverName, onError, onClose, onStderr)

			case "sse":
				return this.createSseTransport(config, onError)

			case "streamableHttp":
				return this.createStreamableHttpTransport(config, onError)

			default:
				throw new Error(`Unknown transport type: ${(config as any).type}`)
		}
	}

	/**
	 * Create stdio transport
	 *
	 * Creates a stdio transport that spawns a child process. Handles:
	 * - Process spawning with environment variables
	 * - Stderr stream monitoring
	 * - Error and close event handling
	 * - Transport startup
	 *
	 * @private
	 */
	private async createStdioTransport(
		config: Extract<z.infer<typeof ServerConfigSchema>, { type: "stdio" }>,
		serverName: string,
		onError: (error: Error) => Promise<void>,
		onClose?: () => Promise<void>,
		onStderr?: (output: string) => Promise<void>,
	): Promise<StdioClientTransport> {
		const transport = new StdioClientTransport({
			command: config.command,
			args: config.args,
			cwd: config.cwd,
			env: {
				...getDefaultEnvironment(),
				...(config.env || {}),
			},
			stderr: "pipe",
		})

		// Set up error handler
		transport.onerror = async (error) => {
			Logger.error(`Transport error for "${serverName}"`, error instanceof Error ? error : new Error(String(error)))
			await onError(error instanceof Error ? error : new Error(String(error)))
		}

		// Set up close handler
		transport.onclose = async () => {
			if (onClose) {
				await onClose()
			}
		}

		// Start the transport
		await transport.start()

		// Monitor stderr stream
		const stderrStream = transport.stderr
		if (stderrStream) {
			stderrStream.on("data", async (data: Buffer) => {
				const output = data.toString()
				const isInfoLog = !/\berror\b/i.test(output)

				if (isInfoLog) {
					Logger.info(`Server "${serverName}" info: ${output}`)
				} else {
					Logger.error(`Server "${serverName}" stderr: ${output}`)
					if (onStderr) {
						await onStderr(output)
					}
				}
			})
		} else {
			Logger.error(`No stderr stream for ${serverName}`)
		}

		// Prevent duplicate start calls
		transport.start = async () => {}

		return transport
	}

	/**
	 * Create SSE transport
	 *
	 * Creates a Server-Sent Events transport with reconnection logic.
	 * Configures headers, credentials, and reconnection parameters.
	 *
	 * @private
	 */
	private createSseTransport(
		config: Extract<z.infer<typeof ServerConfigSchema>, { type: "sse" }>,
		onError: (error: Error) => Promise<void>,
	): SSEClientTransport {
		const sseOptions = {
			requestInit: {
				headers: config.headers,
			},
		}

		const reconnectingEventSourceOptions = {
			max_retry_time: 5000,
			withCredentials: !!config.headers?.["Authorization"],
		}

		// Set global EventSource to use ReconnectingEventSource
		global.EventSource = ReconnectingEventSource

		const transport = new SSEClientTransport(new URL(config.url), {
			...sseOptions,
			eventSourceInit: reconnectingEventSourceOptions,
		})

		// Set up error handler
		transport.onerror = async (error) => {
			Logger.error(`SSE transport error`, error instanceof Error ? error : new Error(String(error)))
			await onError(error instanceof Error ? error : new Error(String(error)))
		}

		return transport
	}

	/**
	 * Create streamableHttp transport
	 *
	 * Creates an HTTP transport with streamable response handling.
	 * Configures headers for authentication if needed.
	 *
	 * @private
	 */
	private createStreamableHttpTransport(
		config: Extract<z.infer<typeof ServerConfigSchema>, { type: "streamableHttp" }>,
		onError: (error: Error) => Promise<void>,
	): StreamableHTTPClientTransport {
		const transport = new StreamableHTTPClientTransport(new URL(config.url), {
			requestInit: {
				headers: config.headers,
			},
		})

		// Set up error handler
		transport.onerror = async (error) => {
			Logger.error(`HTTP transport error`, error instanceof Error ? error : new Error(String(error)))
			await onError(error instanceof Error ? error : new Error(String(error)))
		}

		return transport
	}
}
