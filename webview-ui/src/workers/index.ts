/**
 * Web Workers Index
 * Centralized exports for all web workers with Vite bundling
 *
 * Vite automatically bundles workers imported with ?worker suffix
 * This creates a Worker constructor that uses blob: URLs (CSP-compliant)
 */

// Import worker with Vite's ?worker&inline syntax to force blob URL creation
// Using &inline ensures workers are embedded as blob URLs even in dev mode (CSP-compliant)
import MarkdownWorker from "./markdown_worker?worker&inline"

/**
 * Markdown worker constructor for use with WebWorkerPool
 * This creates workers using blob: URLs which are CSP-compliant
 */
export const MARKDOWN_WORKER_CONSTRUCTOR = MarkdownWorker

/**
 * Create a markdown worker instance
 * Use this with WebWorkerPool configuration
 *
 * @example
 * ```typescript
 * const { executeTask } = useWebWorker({
 *   workerConstructor: createMarkdownWorker,
 *   debug: false
 * })
 * ```
 */
export function createMarkdownWorker(): Worker {
	return new MarkdownWorker()
}
