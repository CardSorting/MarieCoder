/**
 * Type declarations for Vite worker imports
 * Enables TypeScript support for ?worker and ?worker&url syntax
 */

declare module "*?worker" {
	const WorkerFactory: new () => Worker
	export default WorkerFactory
}

declare module "*?worker&url" {
	const workerUrl: string
	export default workerUrl
}

declare module "*?worker&inline" {
	const WorkerFactory: new () => Worker
	export default WorkerFactory
}
