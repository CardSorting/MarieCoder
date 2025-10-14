/**
 * Web Workers Index
 * Centralized exports for all web workers with Vite bundling
 *
 * Vite automatically bundles workers imported with ?worker suffix
 * This eliminates CDN dependencies and enables faster cold starts
 */

// Import worker with Vite's ?worker syntax for proper bundling
import MarkdownWorkerUrl from "./markdown_worker?worker&url"

/**
 * Markdown worker URL for use with WebWorkerPool
 * This is the bundled worker script URL that includes all dependencies
 */
export const MARKDOWN_WORKER_URL = MarkdownWorkerUrl

/**
 * Get markdown worker script URL
 * Use this with WebWorkerPool configuration
 *
 * @example
 * ```typescript
 * const { executeTask } = useWebWorker({
 *   workerScript: getMarkdownWorkerScript(),
 *   debug: false
 * })
 * ```
 */
export function getMarkdownWorkerScript(): string {
	return MARKDOWN_WORKER_URL
}
