/**
 * Types and interfaces for NOORMME Artisan MCP Server
 */

export interface ArtisanCommand {
	name: string
	description: string
	signature: string
	options?: CommandOption[]
	arguments?: CommandArgument[]
	handler: (args: CommandArguments, options: CommandOptions) => Promise<CommandResult>
}

export interface CommandOption {
	name: string
	description: string
	type: "string" | "boolean" | "number"
	default?: any
	required?: boolean
	alias?: string
}

export interface CommandArgument {
	name: string
	description: string
	type: "string" | "number"
	required?: boolean
	default?: any
}

export interface CommandArguments {
	[key: string]: any
}

export interface CommandOptions {
	[key: string]: any
}

export interface CommandResult {
	success: boolean
	message: string
	data?: any
	error?: string
}

export interface ProjectStructure {
	projectPath: string
	hasNextjs: boolean
	hasDatabase: boolean
	hasAuth: boolean
	hasAdmin: boolean
	components: string[]
	services: string[]
	repositories: string[]
	pages: string[]
	apiRoutes: string[]
}

export interface ComponentConfig {
	name: string
	type: "ui" | "page" | "layout" | "feature" | "admin" | "auth"
	path?: string
	withStyles?: boolean
	withTests?: boolean
	withStory?: boolean
	withProps?: boolean
}

export interface ServiceConfig {
	name: string
	tableName?: string
	includeRepository?: boolean
	includeBusinessLogic?: boolean
	includeTests?: boolean
	includeValidation?: boolean
}

export interface MigrationConfig {
	name: string
	table?: string
	action: "create" | "modify" | "drop"
	columns?: ColumnDefinition[]
	indexes?: IndexDefinition[]
	foreignKeys?: ForeignKeyDefinition[]
}

export interface ColumnDefinition {
	name: string
	type: "string" | "text" | "integer" | "bigint" | "boolean" | "date" | "datetime" | "json"
	nullable?: boolean
	default?: any
	unique?: boolean
	primary?: boolean
	autoIncrement?: boolean
	length?: number
}

export interface IndexDefinition {
	name: string
	columns: string[]
	unique?: boolean
	type?: "btree" | "hash" | "gin" | "gist"
}

export interface ForeignKeyDefinition {
	name: string
	column: string
	referencedTable: string
	referencedColumn: string
	onDelete?: "cascade" | "restrict" | "set_null" | "no_action"
	onUpdate?: "cascade" | "restrict" | "set_null" | "no_action"
}

export interface SeedConfig {
	name: string
	table: string
	data: Record<string, any>[]
	truncate?: boolean
}

export interface TestConfig {
	type: "unit" | "integration" | "e2e"
	target: string
	framework?: "jest" | "vitest"
	coverage?: boolean
}

export interface MCPToolResult {
	success: boolean
	message?: string
	data?: any
	error?: string
	output?: string
	files?: string[]
}
