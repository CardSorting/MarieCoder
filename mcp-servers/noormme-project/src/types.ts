/**
 * Enhanced Types for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean, type-safe, performant
 */

export interface ProjectConfig {
	projectName: string
	projectPath: string
	template: "nextjs" | "nextjs-auth" | "nextjs-admin" | "nextjs-saas"
	includeAuth: boolean
	includeAdmin: boolean
	includeTailwind: boolean
	includeTests: boolean
	includeQueue: boolean
	includePayments: boolean
	includeSubscriptions: boolean
	databasePath?: string
	appUrl?: string
	description?: string
	author?: string
	version?: string
}

export interface ComponentConfig {
	name: string
	type: "ui" | "page" | "layout" | "feature" | "admin" | "auth"
	projectPath: string
	includeStyles: boolean
	includeTests: boolean
	includeStorybook?: boolean
}

export interface ServiceConfig {
	name: string
	tableName: string
	projectPath: string
	includeRepository: boolean
	includeBusinessLogic: boolean
	includeValidation: boolean
	includeTests: boolean
}

export interface CursorRulesConfig {
	projectPath: string
	includeAllRules: boolean
	customRules?: string[]
	includeArchitecture: boolean
	includeDatabase: boolean
	includeCodingStyle: boolean
	includeKyselyIntegration: boolean
	includeNextjsPatterns: boolean
}

export interface DatabaseSetupConfig {
	projectPath: string
	databasePath?: string
	schema?: Array<{
		name: string
		sql: string
	}>
	seedData?: Record<string, any[]>
	includeMigrations: boolean
	includeSeedScripts: boolean
}

export interface TemplateFile {
	path: string
	content: string
	isExecutable?: boolean
	isTemplate?: boolean
}

export interface GenerationResult {
	success: boolean
	message: string
	files: string[]
	errors?: string[]
}

export interface MCPToolResult {
	success: boolean
	message?: string
	data?: any
	error?: string
	files?: string[]
	errors?: string[]
}
