/**
 * Error Handler Tests
 * Test the error handler utility functionality
 */

import { ErrorHandler } from "../../utils/error-handler.js"

describe("ErrorHandler", () => {
	let errorHandler: ErrorHandler

	beforeEach(() => {
		errorHandler = new ErrorHandler()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe("handleError", () => {
		it("should handle generic error", () => {
			const error = new Error("Something went wrong")
			const result = errorHandler.handleError(error)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Something went wrong")
			expect(result.error).toBe("Error")
			expect(result.stack).toBeDefined()
		})

		it("should handle error with context", () => {
			const error = new Error("Database connection failed")
			const result = errorHandler.handleError(error, "Database operation")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Database operation: Database connection failed")
			expect(result.error).toBe("Error")
			expect(result.stack).toBeDefined()
		})

		it("should handle error without message", () => {
			const error = new Error()
			const result = errorHandler.handleError(error)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Unknown error")
			expect(result.error).toBe("Error")
			expect(result.stack).toBeDefined()
		})

		it("should handle non-Error object", () => {
			const error = "String error"
			const result = errorHandler.handleError(error as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("String error")
			expect(result.error).toBe("Unknown")
			expect(result.stack).toBeUndefined()
		})

		it("should handle null error", () => {
			const result = errorHandler.handleError(null as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Unknown error")
			expect(result.error).toBe("Unknown")
			expect(result.stack).toBeUndefined()
		})

		it("should handle undefined error", () => {
			const result = errorHandler.handleError(undefined as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Unknown error")
			expect(result.error).toBe("Unknown")
			expect(result.stack).toBeUndefined()
		})
	})

	describe("handleValidationError", () => {
		it("should handle validation errors", () => {
			const errors = ["Name is required", "Email is invalid"]
			const result = errorHandler.handleValidationError(errors)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Validation failed")
			expect(result.errors).toEqual(errors)
			expect(result.error).toBe("ValidationError")
		})

		it("should handle empty validation errors", () => {
			const errors: string[] = []
			const result = errorHandler.handleValidationError(errors)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Validation failed")
			expect(result.errors).toEqual([])
			expect(result.error).toBe("ValidationError")
		})

		it("should handle single validation error", () => {
			const errors = ["Name is required"]
			const result = errorHandler.handleValidationError(errors)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Validation failed")
			expect(result.errors).toEqual(["Name is required"])
			expect(result.error).toBe("ValidationError")
		})

		it("should handle null validation errors", () => {
			const result = errorHandler.handleValidationError(null as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Validation failed")
			expect(result.errors).toBeNull()
			expect(result.error).toBe("ValidationError")
		})

		it("should handle undefined validation errors", () => {
			const result = errorHandler.handleValidationError(undefined as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Validation failed")
			expect(result.errors).toBeUndefined()
			expect(result.error).toBe("ValidationError")
		})
	})

	describe("handleFileSystemError", () => {
		it("should handle file system error", () => {
			const error = new Error("Permission denied")
			const result = errorHandler.handleFileSystemError(error, "write", "/path/to/file")

			expect(result.success).toBe(false)
			expect(result.message).toBe("File system error during write: Permission denied")
			expect(result.error).toBe("FileSystemError")
			expect(result.operation).toBe("write")
			expect(result.path).toBe("/path/to/file")
		})

		it("should handle file system error without path", () => {
			const error = new Error("File not found")
			const result = errorHandler.handleFileSystemError(error, "read", "")

			expect(result.success).toBe(false)
			expect(result.message).toBe("File system error during read: File not found")
			expect(result.error).toBe("FileSystemError")
			expect(result.operation).toBe("read")
			expect(result.path).toBe("")
		})

		it("should handle file system error with null path", () => {
			const error = new Error("Access denied")
			const result = errorHandler.handleFileSystemError(error, "delete", null as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("File system error during delete: Access denied")
			expect(result.error).toBe("FileSystemError")
			expect(result.operation).toBe("delete")
			expect(result.path).toBeNull()
		})

		it("should handle file system error with undefined path", () => {
			const error = new Error("Directory not found")
			const result = errorHandler.handleFileSystemError(error, "create", undefined as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("File system error during create: Directory not found")
			expect(result.error).toBe("FileSystemError")
			expect(result.operation).toBe("create")
			expect(result.path).toBeUndefined()
		})

		it("should handle non-Error file system error", () => {
			const error = "String error"
			const result = errorHandler.handleFileSystemError(error as any, "copy", "/src/to/dest")

			expect(result.success).toBe(false)
			expect(result.message).toBe("File system error during copy: String error")
			expect(result.error).toBe("FileSystemError")
			expect(result.operation).toBe("copy")
			expect(result.path).toBe("/src/to/dest")
		})
	})

	describe("handleDatabaseError", () => {
		it("should handle database error", () => {
			const error = new Error("Connection timeout")
			const result = errorHandler.handleDatabaseError(error, "query")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Database error during query: Connection timeout")
			expect(result.error).toBe("DatabaseError")
			expect(result.operation).toBe("query")
		})

		it("should handle database error with different operation", () => {
			const error = new Error("Table not found")
			const result = errorHandler.handleDatabaseError(error, "migrate")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Database error during migrate: Table not found")
			expect(result.error).toBe("DatabaseError")
			expect(result.operation).toBe("migrate")
		})

		it("should handle database error with empty operation", () => {
			const error = new Error("Transaction failed")
			const result = errorHandler.handleDatabaseError(error, "")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Database error during : Transaction failed")
			expect(result.error).toBe("DatabaseError")
			expect(result.operation).toBe("")
		})

		it("should handle database error with null operation", () => {
			const error = new Error("Constraint violation")
			const result = errorHandler.handleDatabaseError(error, null as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Database error during null: Constraint violation")
			expect(result.error).toBe("DatabaseError")
			expect(result.operation).toBeNull()
		})

		it("should handle database error with undefined operation", () => {
			const error = new Error("Invalid SQL")
			const result = errorHandler.handleDatabaseError(error, undefined as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Database error during undefined: Invalid SQL")
			expect(result.error).toBe("DatabaseError")
			expect(result.operation).toBeUndefined()
		})

		it("should handle non-Error database error", () => {
			const error = "String error"
			const result = errorHandler.handleDatabaseError(error as any, "insert")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Database error during insert: String error")
			expect(result.error).toBe("DatabaseError")
			expect(result.operation).toBe("insert")
		})
	})

	describe("handleCommandError", () => {
		it("should handle command error", () => {
			const error = new Error("Command execution failed")
			const result = errorHandler.handleCommandError(error, "make:component")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Command 'make:component' failed: Command execution failed")
			expect(result.error).toBe("CommandError")
			expect(result.command).toBe("make:component")
		})

		it("should handle command error with different command", () => {
			const error = new Error("Invalid arguments")
			const result = errorHandler.handleCommandError(error, "db:migrate")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Command 'db:migrate' failed: Invalid arguments")
			expect(result.error).toBe("CommandError")
			expect(result.command).toBe("db:migrate")
		})

		it("should handle command error with empty command", () => {
			const error = new Error("Unknown command")
			const result = errorHandler.handleCommandError(error, "")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Command '' failed: Unknown command")
			expect(result.error).toBe("CommandError")
			expect(result.command).toBe("")
		})

		it("should handle command error with null command", () => {
			const error = new Error("Command not found")
			const result = errorHandler.handleCommandError(error, null as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Command 'null' failed: Command not found")
			expect(result.error).toBe("CommandError")
			expect(result.command).toBeNull()
		})

		it("should handle command error with undefined command", () => {
			const error = new Error("Command execution error")
			const result = errorHandler.handleCommandError(error, undefined as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Command 'undefined' failed: Command execution error")
			expect(result.error).toBe("CommandError")
			expect(result.command).toBeUndefined()
		})

		it("should handle non-Error command error", () => {
			const error = "String error"
			const result = errorHandler.handleCommandError(error as any, "test:command")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Command 'test:command' failed: String error")
			expect(result.error).toBe("CommandError")
			expect(result.command).toBe("test:command")
		})
	})

	describe("handleTemplateError", () => {
		it("should handle template error", () => {
			const error = new Error("Template not found")
			const result = errorHandler.handleTemplateError(error, "component")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Template 'component' error: Template not found")
			expect(result.error).toBe("TemplateError")
			expect(result.template).toBe("component")
		})

		it("should handle template error with different template", () => {
			const error = new Error("Invalid template syntax")
			const result = errorHandler.handleTemplateError(error, "service")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Template 'service' error: Invalid template syntax")
			expect(result.error).toBe("TemplateError")
			expect(result.template).toBe("service")
		})

		it("should handle template error with empty template", () => {
			const error = new Error("Template rendering failed")
			const result = errorHandler.handleTemplateError(error, "")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Template '' error: Template rendering failed")
			expect(result.error).toBe("TemplateError")
			expect(result.template).toBe("")
		})

		it("should handle template error with null template", () => {
			const error = new Error("Template compilation error")
			const result = errorHandler.handleTemplateError(error, null as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Template 'null' error: Template compilation error")
			expect(result.error).toBe("TemplateError")
			expect(result.template).toBeNull()
		})

		it("should handle template error with undefined template", () => {
			const error = new Error("Template validation failed")
			const result = errorHandler.handleTemplateError(error, undefined as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Template 'undefined' error: Template validation failed")
			expect(result.error).toBe("TemplateError")
			expect(result.template).toBeUndefined()
		})

		it("should handle non-Error template error", () => {
			const error = "String error"
			const result = errorHandler.handleTemplateError(error as any, "migration")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Template 'migration' error: String error")
			expect(result.error).toBe("TemplateError")
			expect(result.template).toBe("migration")
		})
	})

	describe("handleProjectError", () => {
		it("should handle project error", () => {
			const error = new Error("Project creation failed")
			const result = errorHandler.handleProjectError(error, "my-project")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Project 'my-project' error: Project creation failed")
			expect(result.error).toBe("ProjectError")
			expect(result.project).toBe("my-project")
		})

		it("should handle project error with different project", () => {
			const error = new Error("Project validation failed")
			const result = errorHandler.handleProjectError(error, "test-app")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Project 'test-app' error: Project validation failed")
			expect(result.error).toBe("ProjectError")
			expect(result.project).toBe("test-app")
		})

		it("should handle project error with empty project", () => {
			const error = new Error("Project initialization failed")
			const result = errorHandler.handleProjectError(error, "")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Project '' error: Project initialization failed")
			expect(result.error).toBe("ProjectError")
			expect(result.project).toBe("")
		})

		it("should handle project error with null project", () => {
			const error = new Error("Project configuration error")
			const result = errorHandler.handleProjectError(error, null as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Project 'null' error: Project configuration error")
			expect(result.error).toBe("ProjectError")
			expect(result.project).toBeNull()
		})

		it("should handle project error with undefined project", () => {
			const error = new Error("Project setup failed")
			const result = errorHandler.handleProjectError(error, undefined as any)

			expect(result.success).toBe(false)
			expect(result.message).toBe("Project 'undefined' error: Project setup failed")
			expect(result.error).toBe("ProjectError")
			expect(result.project).toBeUndefined()
		})

		it("should handle non-Error project error", () => {
			const error = "String error"
			const result = errorHandler.handleProjectError(error as any, "new-project")

			expect(result.success).toBe(false)
			expect(result.message).toBe("Project 'new-project' error: String error")
			expect(result.error).toBe("ProjectError")
			expect(result.project).toBe("new-project")
		})
	})

	describe("error type detection", () => {
		it("should detect ValidationError", () => {
			const error = new Error("Validation failed")
			error.name = "ValidationError"
			const result = errorHandler.handleError(error)

			expect(result.error).toBe("ValidationError")
		})

		it("should detect FileSystemError", () => {
			const error = new Error("File not found")
			error.name = "FileSystemError"
			const result = errorHandler.handleError(error)

			expect(result.error).toBe("FileSystemError")
		})

		it("should detect DatabaseError", () => {
			const error = new Error("Connection failed")
			error.name = "DatabaseError"
			const result = errorHandler.handleError(error)

			expect(result.error).toBe("DatabaseError")
		})

		it("should detect CommandError", () => {
			const error = new Error("Command failed")
			error.name = "CommandError"
			const result = errorHandler.handleError(error)

			expect(result.error).toBe("CommandError")
		})

		it("should detect TemplateError", () => {
			const error = new Error("Template failed")
			error.name = "TemplateError"
			const result = errorHandler.handleError(error)

			expect(result.error).toBe("TemplateError")
		})

		it("should detect ProjectError", () => {
			const error = new Error("Project failed")
			error.name = "ProjectError"
			const result = errorHandler.handleError(error)

			expect(result.error).toBe("ProjectError")
		})

		it("should handle unknown error type", () => {
			const error = new Error("Unknown error")
			error.name = "UnknownError"
			const result = errorHandler.handleError(error)

			expect(result.error).toBe("UnknownError")
		})

		it("should handle error without name", () => {
			const error = new Error("Generic error")
			delete error.name
			const result = errorHandler.handleError(error)

			expect(result.error).toBe("Error")
		})
	})

	describe("error message formatting", () => {
		it("should format error message with context", () => {
			const error = new Error("Operation failed")
			const result = errorHandler.handleError(error, "Database operation")

			expect(result.message).toBe("Database operation: Operation failed")
		})

		it("should format error message without context", () => {
			const error = new Error("Operation failed")
			const result = errorHandler.handleError(error)

			expect(result.message).toBe("Operation failed")
		})

		it("should format error message with empty context", () => {
			const error = new Error("Operation failed")
			const result = errorHandler.handleError(error, "")

			expect(result.message).toBe("Operation failed")
		})

		it("should format error message with null context", () => {
			const error = new Error("Operation failed")
			const result = errorHandler.handleError(error, null as any)

			expect(result.message).toBe("Operation failed")
		})

		it("should format error message with undefined context", () => {
			const error = new Error("Operation failed")
			const result = errorHandler.handleError(error, undefined as any)

			expect(result.message).toBe("Operation failed")
		})
	})
})
