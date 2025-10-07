import { ApiStream } from "../transform/stream"
import { BaseProvider, BaseProviderOptions } from "./base-provider"

/**
 * HTTP-based provider options
 */
export interface HttpProviderOptions extends BaseProviderOptions {
	apiKey?: string
	baseUrl?: string
	headers?: Record<string, string>
	timeout?: number
}

/**
 * Base class for HTTP-based API providers
 * Handles common HTTP patterns like authentication, headers, and error handling
 */
export abstract class HttpProvider extends BaseProvider {
	protected httpOptions: HttpProviderOptions

	constructor(options: HttpProviderOptions) {
		super(options)
		this.httpOptions = options
	}

	/**
	 * Create HTTP client with common configuration
	 */
	protected createClient(): any {
		const clientConfig: any = {
			baseURL: this.httpOptions.baseUrl,
			timeout: this.httpOptions.timeout || 30000,
			headers: {
				"Content-Type": "application/json",
				...this.httpOptions.headers,
			},
		}

		// Add authentication if API key is provided
		if (this.httpOptions.apiKey) {
			clientConfig.headers.Authorization = this.getAuthHeader()
		}

		return this.createHttpClient(clientConfig)
	}

	/**
	 * Get authentication header (to be overridden by subclasses)
	 */
	protected getAuthHeader(): string {
		return `Bearer ${this.httpOptions.apiKey}`
	}

	/**
	 * Abstract method to create the specific HTTP client
	 */
	protected abstract createHttpClient(config: any): any

	/**
	 * Make HTTP request with error handling
	 */
	protected async makeRequest<T>(requestConfig: any): Promise<T> {
		try {
			const client = this.ensureClient()
			const response = await client.request(requestConfig)
			return response.data
		} catch (error: any) {
			this.handleApiError(error, "HTTP request")
		}
	}

	/**
	 * Create streaming request
	 */
	protected async createStreamingRequest(requestConfig: any): Promise<ApiStream> {
		try {
			const client = this.ensureClient()
			const response = await client.request({
				...requestConfig,
				responseType: "stream",
			})

			return this.processStreamResponse(response)
		} catch (error: any) {
			this.handleApiError(error, "streaming request")
		}
	}

	/**
	 * Process streaming response (to be overridden by subclasses)
	 */
	protected abstract processStreamResponse(response: any): ApiStream

	/**
	 * Validate HTTP provider options
	 */
	protected validateHttpOptions(): void {
		this.validateRequiredOptions(["apiKey"])
	}
}
