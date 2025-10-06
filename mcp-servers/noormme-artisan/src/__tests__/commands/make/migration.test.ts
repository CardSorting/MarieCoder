/**
 * Make Migration Command Tests
 * Test the make:migration command functionality
 */

import { makeMigrationCommand } from "../../../commands/make/migration.js"
import { CommandArguments, CommandOptions } from "../../../types.js"
import {
	mockFs,
	mockFsExtra,
	mockPath,
	mockProcessCwd,
	setupMockFileSystem,
	teardownMockFileSystem,
} from "../../fixtures/index.js"

// Mock the dependencies
jest.mock("fs-extra", () => mockFsExtra)
jest.mock("path", () => mockPath)
jest.mock("process", () => ({
	cwd: mockProcessCwd,
}))

describe("make:migration", () => {
	beforeEach(() => {
		setupMockFileSystem()
	})

	afterEach(() => {
		teardownMockFileSystem()
		jest.clearAllMocks()
	})

	describe("command definition", () => {
		it("should have correct command properties", () => {
			expect(makeMigrationCommand.name).toBe("make:migration")
			expect(makeMigrationCommand.description).toBe("Create a new database migration")
			expect(makeMigrationCommand.signature).toBe("make:migration <name> [options]")
		})

		it("should have required name argument", () => {
			const nameArg = makeMigrationCommand.arguments?.find((arg) => arg.name === "name")
			expect(nameArg).toBeDefined()
			expect(nameArg?.required).toBe(true)
			expect(nameArg?.type).toBe("string")
		})

		it("should have correct options", () => {
			const options = makeMigrationCommand.options || []
			const optionNames = options.map((opt) => opt.name)

			expect(optionNames).toContain("action")
			expect(optionNames).toContain("table")
			expect(optionNames).toContain("columns")
		})
	})

	describe("handler execution", () => {
		it("should create migration successfully", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
				columns: [
					{
						name: "id",
						type: "integer",
						primaryKey: true,
						autoIncrement: true,
					},
					{
						name: "name",
						type: "text",
						nullable: false,
					},
				],
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.message).toContain("Migration created successfully")
			expect(result.data?.files).toContain("src/lib/database/migrations/20240101000000_create_test_table.ts")
			expect(result.data?.directories).toContain("src/lib/database/migrations")
		})

		it("should create migration with create action", async () => {
			const args: CommandArguments = {
				name: "create_users_table",
				table: "users",
			}
			const options: CommandOptions = {
				action: "create",
				columns: [
					{
						name: "id",
						type: "integer",
						primaryKey: true,
						autoIncrement: true,
					},
					{
						name: "email",
						type: "text",
						nullable: false,
						unique: true,
					},
				],
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/lib/database/migrations/20240101000000_create_users_table.ts")
		})

		it("should create migration with modify action", async () => {
			const args: CommandArguments = {
				name: "add_email_to_users",
				table: "users",
			}
			const options: CommandOptions = {
				action: "modify",
				columns: [
					{
						name: "email",
						type: "text",
						nullable: false,
						unique: true,
					},
				],
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/lib/database/migrations/20240101000000_add_email_to_users.ts")
		})

		it("should create migration with drop action", async () => {
			const args: CommandArguments = {
				name: "drop_old_table",
				table: "old_table",
			}
			const options: CommandOptions = {
				action: "drop",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/lib/database/migrations/20240101000000_drop_old_table.ts")
		})

		it("should handle migration name validation", async () => {
			const args: CommandArguments = {
				name: "CreateTable", // Invalid name - should be lowercase
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Migration name can only contain lowercase letters and underscores")
		})

		it("should handle table name validation", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "TestTable", // Invalid name - should be lowercase
			}
			const options: CommandOptions = {
				action: "create",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Table name can only contain lowercase letters and underscores")
		})

		it("should handle file system errors", async () => {
			// Mock file system error
			mockFsExtra.writeFile.mockRejectedValueOnce(new Error("File system error"))

			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Failed to create migration")
		})

		it("should handle missing name argument", async () => {
			const args: CommandArguments = {
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Migration name is required")
		})

		it("should handle missing table argument", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Table name is required")
		})

		it("should handle empty name argument", async () => {
			const args: CommandArguments = {
				name: "",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Migration name is required")
		})

		it("should handle empty table argument", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "",
			}
			const options: CommandOptions = {
				action: "create",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Table name is required")
		})
	})

	describe("file generation", () => {
		it("should generate correct migration content for create action", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
				columns: [
					{
						name: "id",
						type: "integer",
						primaryKey: true,
						autoIncrement: true,
					},
					{
						name: "name",
						type: "text",
						nullable: false,
					},
				],
			}

			await makeMigrationCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/database/migrations/20240101000000_create_test_table.ts",
				expect.stringContaining("createTable('test_table')"),
			)
		})

		it("should generate correct migration content for modify action", async () => {
			const args: CommandArguments = {
				name: "add_email_to_users",
				table: "users",
			}
			const options: CommandOptions = {
				action: "modify",
				columns: [
					{
						name: "email",
						type: "text",
						nullable: false,
						unique: true,
					},
				],
			}

			await makeMigrationCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/database/migrations/20240101000000_add_email_to_users.ts",
				expect.stringContaining("alterTable('users')"),
			)
		})

		it("should generate correct migration content for drop action", async () => {
			const args: CommandArguments = {
				name: "drop_old_table",
				table: "old_table",
			}
			const options: CommandOptions = {
				action: "drop",
			}

			await makeMigrationCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/database/migrations/20240101000000_drop_old_table.ts",
				expect.stringContaining("dropTable('old_table')"),
			)
		})

		it("should generate migration with proper imports", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			await makeMigrationCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/database/migrations/20240101000000_create_test_table.ts",
				expect.stringContaining("import { Kysely, sql } from 'kysely'"),
			)
		})

		it("should generate migration with proper structure", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			await makeMigrationCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/database/migrations/20240101000000_create_test_table.ts",
				expect.stringContaining("export const CreateTestTableMigration"),
			)
		})

		it("should generate migration with proper up and down methods", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			await makeMigrationCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/database/migrations/20240101000000_create_test_table.ts",
				expect.stringContaining("async up(db: Kysely<Database>): Promise<void>"),
			)
		})
	})

	describe("directory structure", () => {
		it("should create migrations directory if it does not exist", async () => {
			// Remove migrations directory
			mockFs.remove("/mock/project/src/lib/database/migrations")

			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			await makeMigrationCommand.handler!(args, options)

			expect(mockFsExtra.ensureDir).toHaveBeenCalledWith("/mock/project/src/lib/database/migrations")
		})

		it("should create database directory if it does not exist", async () => {
			// Remove database directory
			mockFs.remove("/mock/project/src/lib/database")

			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			await makeMigrationCommand.handler!(args, options)

			expect(mockFsExtra.ensureDir).toHaveBeenCalledWith("/mock/project/src/lib/database/migrations")
		})
	})

	describe("migration naming", () => {
		it("should generate migration with timestamp prefix", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
			}

			await makeMigrationCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/database/migrations/20240101000000_create_test_table.ts",
				expect.any(String),
			)
		})

		it("should handle migration name with underscores", async () => {
			const args: CommandArguments = {
				name: "create_user_profiles_table",
				table: "user_profiles",
			}
			const options: CommandOptions = {
				action: "create",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/lib/database/migrations/20240101000000_create_user_profiles_table.ts")
		})

		it("should handle migration name with multiple words", async () => {
			const args: CommandArguments = {
				name: "add_created_at_to_posts",
				table: "posts",
			}
			const options: CommandOptions = {
				action: "modify",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/lib/database/migrations/20240101000000_add_created_at_to_posts.ts")
		})
	})

	describe("column handling", () => {
		it("should handle columns with all properties", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
				columns: [
					{
						name: "id",
						type: "integer",
						primaryKey: true,
						autoIncrement: true,
						nullable: false,
						unique: false,
						defaultValue: undefined,
					},
					{
						name: "email",
						type: "text",
						primaryKey: false,
						autoIncrement: false,
						nullable: false,
						unique: true,
						defaultValue: undefined,
					},
					{
						name: "status",
						type: "text",
						primaryKey: false,
						autoIncrement: false,
						nullable: true,
						unique: false,
						defaultValue: "active",
					},
				],
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
		})

		it("should handle columns with minimal properties", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
				columns: [
					{
						name: "id",
						type: "integer",
					},
					{
						name: "name",
						type: "text",
					},
				],
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
		})

		it("should handle empty columns array", async () => {
			const args: CommandArguments = {
				name: "create_test_table",
				table: "test_table",
			}
			const options: CommandOptions = {
				action: "create",
				columns: [],
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
		})
	})

	describe("migration types", () => {
		it("should handle create table migration", async () => {
			const args: CommandArguments = {
				name: "create_users_table",
				table: "users",
			}
			const options: CommandOptions = {
				action: "create",
				columns: [
					{
						name: "id",
						type: "integer",
						primaryKey: true,
						autoIncrement: true,
					},
					{
						name: "email",
						type: "text",
						nullable: false,
						unique: true,
					},
					{
						name: "password",
						type: "text",
						nullable: false,
					},
				],
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
		})

		it("should handle modify table migration", async () => {
			const args: CommandArguments = {
				name: "add_phone_to_users",
				table: "users",
			}
			const options: CommandOptions = {
				action: "modify",
				columns: [
					{
						name: "phone",
						type: "text",
						nullable: true,
					},
				],
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
		})

		it("should handle drop table migration", async () => {
			const args: CommandArguments = {
				name: "drop_old_table",
				table: "old_table",
			}
			const options: CommandOptions = {
				action: "drop",
			}

			const result = await makeMigrationCommand.handler!(args, options)

			expect(result.success).toBe(true)
		})
	})
})
