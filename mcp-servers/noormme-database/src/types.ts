/**
 * Enhanced Types for NOORMME Database MCP Server
 * Following NORMIE DEV methodology - clean, type-safe, performant
 */

export interface DatabaseConfig {
	database: string
	wal?: boolean
	cacheSize?: number
	synchronous?: "OFF" | "NORMAL" | "FULL"
	tempStore?: "DEFAULT" | "FILE" | "MEMORY"
	foreignKeys?: boolean
	optimize?: boolean
	timeout?: number
	busyTimeout?: number
}

export interface DatabaseStats {
	totalConnections: number
	activeConnections: number
	queryCount: number
	avgQueryTime: number
	lastOptimized: Date | null
	cacheHits: number
	cacheMisses: number
}

export interface HealthStatus {
	status: "healthy" | "degraded" | "unhealthy"
	details: {
		connected: boolean
		avgQueryTime: number
		lastOptimized: Date | null
		queryCount: number
	}
}

export interface TableInfo {
	name: string
	columns: ColumnInfo[]
	columnCount: number
}

export interface ColumnInfo {
	name: string
	type: string
	primaryKey: boolean
	notNull: boolean
	defaultValue?: any
}

export interface QueryResult {
	rows: any[]
	rowCount: number
	executionTime: number
}

export interface RepositoryOperation {
	table: string
	operation: "create" | "read" | "update" | "delete"
	data?: Record<string, any>
	where?: Record<string, any>
	limit?: number
	offset?: number
}

export interface CustomFindOperation {
	table: string
	column: string
	value: any
	operation?: "equals" | "like" | "in" | "greater" | "less"
}

export interface MCPToolResult {
	success: boolean
	message?: string
	data?: any
	error?: string
}
