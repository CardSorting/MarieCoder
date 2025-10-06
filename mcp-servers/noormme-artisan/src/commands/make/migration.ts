/**
 * Make Migration Command
 * Creates new database migrations
 */

import fs from "fs-extra"
import path from "path"
import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult, MigrationConfig } from "../../types.js"

export const makeMigrationCommand: ArtisanCommand = {
	name: "make:migration",
	description: "Create a new database migration",
	signature: "make:migration <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the migration",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "table",
			description: "Table name for the migration",
			type: "string",
			alias: "t",
		},
		{
			name: "action",
			description: "Migration action (create, modify, drop)",
			type: "string",
			default: "create",
			alias: "a",
		},
		{
			name: "columns",
			description: "Comma-separated list of columns",
			type: "string",
			alias: "c",
		},
	],
	handler: async (args: CommandArguments, options: CommandOptions): Promise<CommandResult> => {
		try {
			const config: MigrationConfig = {
				name: args.name as string,
				table: options.table as string,
				action: (options.action as "create" | "modify" | "drop") || "create",
				columns: parseColumns(options.columns as string),
			}

			const result = await createMigration(config)

			return {
				success: true,
				message: `Migration "${config.name}" created successfully`,
				data: result,
			}
		} catch (error) {
			return {
				success: false,
				message: `Failed to create migration "${args.name}"`,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	},
}

async function createMigration(config: MigrationConfig): Promise<{ file: string }> {
	const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "")
	const migrationName = config.name.toLowerCase().replace(/[^a-z0-9]/g, "_")
	const fileName = `${timestamp}_${migrationName}.ts`

	const migrationsDir = path.join(process.cwd(), "src/lib/database/migrations")
	await fs.ensureDir(migrationsDir)

	const migrationPath = path.join(migrationsDir, fileName)
	const migrationContent = generateMigrationContent(config)

	await fs.writeFile(migrationPath, migrationContent)

	return { file: migrationPath }
}

function parseColumns(columnsString?: string) {
	if (!columnsString) {
		return undefined
	}

	return columnsString.split(",").map((col) => {
		const [name, type] = col.trim().split(":")
		return {
			name: name.trim(),
			type: (type?.trim() as any) || "string",
		}
	})
}

function generateMigrationContent(config: MigrationConfig): string {
	const pascalName = toPascalCase(config.name)
	const tableName = config.table || "table_name"

	const upMethod = generateUpMethod(config)
	const downMethod = generateDownMethod(config)

	return `/**
 * Migration: ${config.name}
 * ${config.action.charAt(0).toUpperCase() + config.action.slice(1)} ${tableName} table
 */

import { Kysely, sql } from 'kysely'
import type { Database } from '../../../types/database.js'

export const ${pascalName}Migration = {
  name: '${config.name}',
  version: '${new Date().toISOString()}',
  
  /**
   * Run the migration
   */
  async up(db: Kysely<Database>): Promise<void> {
${upMethod}
  },

  /**
   * Rollback the migration
   */
  async down(db: Kysely<Database>): Promise<void> {
${downMethod}
  }
}

export default ${pascalName}Migration
`
}

function generateUpMethod(config: MigrationConfig): string {
	const tableName = config.table || "table_name"

	switch (config.action) {
		case "create":
			return generateCreateTableUp(tableName, config.columns)
		case "modify":
			return generateModifyTableUp(tableName, config.columns)
		case "drop":
			return generateDropTableUp(tableName)
		default:
			return `    // TODO: Implement ${config.action} migration for ${tableName}`
	}
}

function generateDownMethod(config: MigrationConfig): string {
	const tableName = config.table || "table_name"

	switch (config.action) {
		case "create":
			return generateCreateTableDown(tableName)
		case "modify":
			return generateModifyTableDown(tableName, config.columns)
		case "drop":
			return generateDropTableDown(tableName)
		default:
			return `    // TODO: Implement ${config.action} rollback for ${tableName}`
	}
}

function generateCreateTableUp(tableName: string, columns?: any[]): string {
	let content = `    await db.schema\n`
	content += `      .createTable('${tableName}')\n`

	if (columns && columns.length > 0) {
		for (const column of columns) {
			content += `      .addColumn('${column.name}', '${getColumnType(column.type)}'`

			if (column.name === "id") {
				content += `, (col) => col.primaryKey().autoIncrement()`
			}

			content += `\n`
		}
	} else {
		// Default columns
		content += `      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())\n`
		content += `      .addColumn('created_at', 'text', (col) => col.notNull())\n`
		content += `      .addColumn('updated_at', 'text', (col) => col.notNull())\n`
	}

	content += `      .execute()`

	return content
}

function generateCreateTableDown(tableName: string): string {
	return `    await db.schema.dropTable('${tableName}').execute()`
}

function generateModifyTableUp(tableName: string, columns?: any[]): string {
	if (!columns || columns.length === 0) {
		return `    // TODO: Add columns to ${tableName}`
	}

	let content = ""
	for (const column of columns) {
		content += `    await db.schema\n`
		content += `      .alterTable('${tableName}')\n`
		content += `      .addColumn('${column.name}', '${getColumnType(column.type)}')\n`
		content += `      .execute()\n\n`
	}

	return content.trim()
}

function generateModifyTableDown(tableName: string, columns?: any[]): string {
	if (!columns || columns.length === 0) {
		return `    // TODO: Remove columns from ${tableName}`
	}

	let content = ""
	for (const column of columns) {
		content += `    await db.schema\n`
		content += `      .alterTable('${tableName}')\n`
		content += `      .dropColumn('${column.name}')\n`
		content += `      .execute()\n\n`
	}

	return content.trim()
}

function generateDropTableUp(tableName: string): string {
	return `    await db.schema.dropTable('${tableName}').execute()`
}

function generateDropTableDown(tableName: string): string {
	return (
		`    await db.schema\n` +
		`      .createTable('${tableName}')\n` +
		`      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())\n` +
		`      .addColumn('created_at', 'text', (col) => col.notNull())\n` +
		`      .addColumn('updated_at', 'text', (col) => col.notNull())\n` +
		`      .execute()`
	)
}

function getColumnType(type: string): string {
	const typeMap: Record<string, string> = {
		string: "text",
		text: "text",
		integer: "integer",
		bigint: "integer",
		boolean: "integer",
		date: "text",
		datetime: "text",
		json: "text",
	}

	return typeMap[type] || "text"
}

function toPascalCase(str: string): string {
	return str
		.split(/[-_\s]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("")
}
