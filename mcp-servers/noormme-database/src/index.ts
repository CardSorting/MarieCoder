#!/usr/bin/env node
/**
 * NOORMME Database MCP Server
 * Enhanced database operations with Kysely integration
 * Following NORMIE DEV methodology - clean, performant, type-safe
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js"
import { DatabaseManager } from "./database-manager.js"
import { RepositoryService } from "./repository-service.js"
import { DatabaseConfig, MCPToolResult } from "./types.js"

class NoormmeDatabaseServer {
	private server: Server
	private dbManager: DatabaseManager | null = null
	private repositoryService: RepositoryService | null = null

	constructor() {
		this.server = new Server(
			{
				name: "noormme-database",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
				},
			},
		)

		this.setupToolHandlers()
		this.setupErrorHandling()
	}

	private setupToolHandlers() {
		// List available tools
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			return {
				tools: [
					{
						name: "initialize_database",
						description: "Initialize NOORMME database with WAL mode optimization and enhanced features",
						inputSchema: {
							type: "object",
							properties: {
								database: {
									type: "string",
									description: "Path to SQLite database file",
								},
								enableWALMode: {
									type: "boolean",
									description: "Enable WAL mode for better concurrency",
									default: true,
								},
								enableForeignKeys: {
									type: "boolean",
									description: "Enable foreign key constraints",
									default: true,
								},
								cacheSize: {
									type: "number",
									description: "Cache size in KB (negative values = KB, positive = pages)",
									default: -64000,
								},
								synchronous: {
									type: "string",
									enum: ["OFF", "NORMAL", "FULL"],
									description: "Synchronous mode for durability",
									default: "NORMAL",
								},
								tempStore: {
									type: "string",
									enum: ["DEFAULT", "FILE", "MEMORY"],
									description: "Temporary storage location",
									default: "MEMORY",
								},
								timeout: {
									type: "number",
									description: "Connection timeout in milliseconds",
									default: 30000,
								},
								busyTimeout: {
									type: "number",
									description: "Busy timeout in milliseconds",
									default: 5000,
								},
							},
							required: ["database"],
						},
					},
					{
						name: "get_tables",
						description: "Get list of all tables in the database with detailed information",
						inputSchema: {
							type: "object",
							properties: {},
						},
					},
					{
						name: "get_table_info",
						description: "Get detailed information about a specific table including columns and constraints",
						inputSchema: {
							type: "object",
							properties: {
								tableName: {
									type: "string",
									description: "Name of the table to inspect",
								},
							},
							required: ["tableName"],
						},
					},
					{
						name: "execute_query",
						description: "Execute a raw SQL query on the database with parameter binding",
						inputSchema: {
							type: "object",
							properties: {
								sql: {
									type: "string",
									description: "SQL query to execute",
								},
								params: {
									type: "array",
									description: "Query parameters for parameterized queries",
									items: { type: "string" },
									default: [],
								},
							},
							required: ["sql"],
						},
					},
					{
						name: "repository_operation",
						description: "Perform CRUD operations using the enhanced repository pattern with Kysely",
						inputSchema: {
							type: "object",
							properties: {
								table: {
									type: "string",
									description: "Table name",
								},
								operation: {
									type: "string",
									enum: ["create", "read", "update", "delete"],
									description: "Operation type",
								},
								data: {
									type: "object",
									description: "Data for create/update operations",
								},
								where: {
									type: "object",
									description: "Where conditions for read/update/delete operations",
								},
								limit: {
									type: "number",
									description: "Limit number of results",
								},
								offset: {
									type: "number",
									description: "Offset for pagination",
								},
							},
							required: ["table", "operation"],
						},
					},
					{
						name: "custom_find",
						description: "Find records using custom finder methods with various operators",
						inputSchema: {
							type: "object",
							properties: {
								table: {
									type: "string",
									description: "Table name",
								},
								column: {
									type: "string",
									description: "Column name to search",
								},
								value: {
									description: "Value to search for",
								},
								operation: {
									type: "string",
									enum: ["equals", "like", "in", "greater", "less"],
									default: "equals",
									description: "Search operation type",
								},
							},
							required: ["table", "column", "value"],
						},
					},
					{
						name: "find_by_id",
						description: "Find a record by its ID (common pattern)",
						inputSchema: {
							type: "object",
							properties: {
								table: {
									type: "string",
									description: "Table name",
								},
								id: {
									description: "ID value to search for",
								},
							},
							required: ["table", "id"],
						},
					},
					{
						name: "find_all",
						description: "Find all records with optional conditions and pagination",
						inputSchema: {
							type: "object",
							properties: {
								table: {
									type: "string",
									description: "Table name",
								},
								conditions: {
									type: "object",
									description: "Optional conditions to filter results",
								},
								limit: {
									type: "number",
									description: "Limit number of results",
								},
								offset: {
									type: "number",
									description: "Offset for pagination",
								},
							},
							required: ["table"],
						},
					},
					{
						name: "count_records",
						description: "Count records in a table with optional conditions",
						inputSchema: {
							type: "object",
							properties: {
								table: {
									type: "string",
									description: "Table name",
								},
								conditions: {
									type: "object",
									description: "Optional conditions to filter count",
								},
							},
							required: ["table"],
						},
					},
					{
						name: "check_exists",
						description: "Check if a record exists based on conditions",
						inputSchema: {
							type: "object",
							properties: {
								table: {
									type: "string",
									description: "Table name",
								},
								conditions: {
									type: "object",
									description: "Conditions to check existence",
								},
							},
							required: ["table", "conditions"],
						},
					},
					{
						name: "upsert_record",
						description: "Create or update a record (upsert operation)",
						inputSchema: {
							type: "object",
							properties: {
								table: {
									type: "string",
									description: "Table name",
								},
								data: {
									type: "object",
									description: "Data to insert or update",
								},
								conflictColumns: {
									type: "array",
									items: { type: "string" },
									description: "Columns to check for conflicts",
								},
							},
							required: ["table", "data", "conflictColumns"],
						},
					},
					{
						name: "get_health",
						description: "Get comprehensive database health and configuration status",
						inputSchema: {
							type: "object",
							properties: {},
						},
					},
					{
						name: "optimize_database",
						description: "Optimize database performance, analyze tables, and vacuum",
						inputSchema: {
							type: "object",
							properties: {},
						},
					},
					{
						name: "get_stats",
						description: "Get detailed database statistics and performance metrics",
						inputSchema: {
							type: "object",
							properties: {},
						},
					},
				],
			}
		})

		// Handle tool calls
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params

			try {
				let result: any
				switch (name) {
					case "initialize_database":
						result = await this.initializeDatabase(args)
						break
					case "get_tables":
						result = await this.getTables()
						break
					case "get_table_info":
						result = await this.getTableInfo(args)
						break
					case "execute_query":
						result = await this.executeQuery(args)
						break
					case "repository_operation":
						result = await this.repositoryOperation(args)
						break
					case "custom_find":
						result = await this.customFind(args)
						break
					case "find_by_id":
						result = await this.findById(args)
						break
					case "find_all":
						result = await this.findAll(args)
						break
					case "count_records":
						result = await this.countRecords(args)
						break
					case "check_exists":
						result = await this.checkExists(args)
						break
					case "upsert_record":
						result = await this.upsertRecord(args)
						break
					case "get_health":
						result = await this.getHealth()
						break
					case "optimize_database":
						result = await this.optimizeDatabase()
						break
					case "get_stats":
						result = await this.getStats()
						break
					default:
						throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`)
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(result, null, 2),
						},
					],
				}
			} catch (error) {
				console.error(`❌ Tool execution failed for ${name}:`, error)
				throw new McpError(
					ErrorCode.InternalError,
					`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		})
	}

	private async initializeDatabase(args: any): Promise<MCPToolResult> {
		const config: DatabaseConfig = {
			database: args.database,
			wal: args.enableWALMode ?? true,
			foreignKeys: args.enableForeignKeys ?? true,
			cacheSize: args.cacheSize ?? -64000,
			synchronous: args.synchronous ?? "NORMAL",
			tempStore: args.tempStore ?? "MEMORY",
			timeout: args.timeout ?? 30000,
			busyTimeout: args.busyTimeout ?? 5000,
		}

		this.dbManager = DatabaseManager.getInstance(config)
		await this.dbManager.initialize()

		this.repositoryService = new RepositoryService(this.dbManager.getKysely())

		const health = await this.dbManager.healthCheck()
		const tables = await this.dbManager.getTables()

		return {
			success: true,
			message: "NOORMME database initialized successfully with enhanced features",
			data: {
				health,
				tables: tables.map((t) => ({
					name: t.name,
					columns: t.columns.length,
					columnNames: t.columns.map((c) => c.name),
				})),
				config: {
					wal: config.wal,
					foreignKeys: config.foreignKeys,
					cacheSize: config.cacheSize,
					synchronous: config.synchronous,
					tempStore: config.tempStore,
				},
			},
		}
	}

	private async getTables(): Promise<MCPToolResult> {
		this.ensureDatabaseInitialized()

		const tables = await this.dbManager!.getTables()

		return {
			success: true,
			data: {
				tables: tables.map((t) => ({
					name: t.name,
					columns: t.columns.map((c) => ({
						name: c.name,
						type: c.type,
						primaryKey: c.primaryKey,
						notNull: c.notNull,
						defaultValue: c.defaultValue,
					})),
					columnCount: t.columns.length,
				})),
			},
		}
	}

	private async getTableInfo(args: any): Promise<MCPToolResult> {
		this.ensureDatabaseInitialized()

		const tableInfo = await this.dbManager!.getTableInfo(args.tableName)

		return {
			success: true,
			data: {
				table: tableInfo,
			},
		}
	}

	private async executeQuery(args: any): Promise<MCPToolResult> {
		this.ensureDatabaseInitialized()

		const result = await this.dbManager!.executeQuery(args.sql, args.params || [])

		return {
			success: true,
			data: {
				result: result.rows,
				rowCount: result.rowCount,
				executionTime: result.executionTime,
			},
		}
	}

	private async repositoryOperation(args: any): Promise<MCPToolResult> {
		this.ensureRepositoryInitialized()

		const result = await this.repositoryService!.repositoryOperation(args)

		return {
			success: true,
			data: {
				result: result.rows,
				rowCount: result.rowCount,
				executionTime: result.executionTime,
			},
		}
	}

	private async customFind(args: any): Promise<MCPToolResult> {
		this.ensureRepositoryInitialized()

		const result = await this.repositoryService!.customFind(args)

		return {
			success: true,
			data: {
				result: result.rows,
				rowCount: result.rowCount,
				executionTime: result.executionTime,
			},
		}
	}

	private async findById(args: any): Promise<MCPToolResult> {
		this.ensureRepositoryInitialized()

		const result = await this.repositoryService!.findById(args.table, args.id)

		return {
			success: true,
			data: {
				result,
				found: result !== null,
			},
		}
	}

	private async findAll(args: any): Promise<MCPToolResult> {
		this.ensureRepositoryInitialized()

		const result = await this.repositoryService!.findAll(args.table, args.conditions, args.limit, args.offset)

		return {
			success: true,
			data: {
				result,
				count: result.length,
			},
		}
	}

	private async countRecords(args: any): Promise<MCPToolResult> {
		this.ensureRepositoryInitialized()

		const count = await this.repositoryService!.count(args.table, args.conditions)

		return {
			success: true,
			data: {
				count,
			},
		}
	}

	private async checkExists(args: any): Promise<MCPToolResult> {
		this.ensureRepositoryInitialized()

		const exists = await this.repositoryService!.exists(args.table, args.conditions)

		return {
			success: true,
			data: {
				exists,
			},
		}
	}

	private async upsertRecord(args: any): Promise<MCPToolResult> {
		this.ensureRepositoryInitialized()

		const result = await this.repositoryService!.upsert(args.table, args.data, args.conflictColumns)

		return {
			success: true,
			data: {
				result,
			},
		}
	}

	private async getHealth(): Promise<MCPToolResult> {
		this.ensureDatabaseInitialized()

		const health = await this.dbManager!.healthCheck()

		return {
			success: true,
			data: {
				health,
			},
		}
	}

	private async optimizeDatabase(): Promise<MCPToolResult> {
		this.ensureDatabaseInitialized()

		await this.dbManager!.optimize()

		return {
			success: true,
			message: "Database optimized successfully with ANALYZE and VACUUM",
		}
	}

	private async getStats(): Promise<MCPToolResult> {
		this.ensureDatabaseInitialized()

		const stats = await this.dbManager!.getStats()

		return {
			success: true,
			data: {
				stats,
			},
		}
	}

	private ensureDatabaseInitialized(): void {
		if (!this.dbManager) {
			throw new Error("Database not initialized. Call initialize_database first.")
		}
	}

	private ensureRepositoryInitialized(): void {
		if (!this.repositoryService) {
			throw new Error("Repository service not initialized. Call initialize_database first.")
		}
	}

	private setupErrorHandling(): void {
		this.server.onerror = (error) => {
			console.error("[NOORMME Database MCP Error]", error)
		}

		process.on("SIGINT", async () => {
			if (this.dbManager) {
				await this.dbManager.close()
			}
			await this.server.close()
			process.exit(0)
		})
	}

	async run(): Promise<void> {
		const transport = new StdioServerTransport()
		await this.server.connect(transport)
		console.error("🚀 NOORMME Database MCP Server running on stdio")
	}
}

// Start the server
const server = new NoormmeDatabaseServer()
server.run().catch((error) => {
	console.error("❌ Failed to start NOORMME Database MCP Server:", error)
	process.exit(1)
})
