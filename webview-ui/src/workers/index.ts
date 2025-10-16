/**
 * Web Workers Index
 * Centralized exports for all web workers with Vite bundling
 *
 * Vite automatically bundles workers imported with ?worker suffix
 * This creates a Worker constructor that uses blob: URLs (CSP-compliant)
 */

// Import worker with Vite's ?worker syntax (creates Worker constructor with blob URL)
// This is CSP-compliant as it uses blob: URLs which are allowed in worker-src
import MarkdownWorker from "./markdown_worker?worker"

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
