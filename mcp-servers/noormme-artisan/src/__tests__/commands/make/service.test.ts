/**
 * Make Service Command Tests
 * Test the make:service command functionality
 */

import { makeServiceCommand } from "../../../commands/make/service.js"
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

describe("make:service", () => {
	beforeEach(() => {
		setupMockFileSystem()
	})

	afterEach(() => {
		teardownMockFileSystem()
		jest.clearAllMocks()
	})

	describe("command definition", () => {
		it("should have correct command properties", () => {
			expect(makeServiceCommand.name).toBe("make:service")
			expect(makeServiceCommand.description).toBe("Create a new service class")
			expect(makeServiceCommand.signature).toBe("make:service <name> [options]")
		})

		it("should have required name argument", () => {
			const nameArg = makeServiceCommand.arguments?.find((arg) => arg.name === "name")
			expect(nameArg).toBeDefined()
			expect(nameArg?.required).toBe(true)
			expect(nameArg?.type).toBe("string")
		})

		it("should have correct options", () => {
			const options = makeServiceCommand.options || []
			const optionNames = options.map((opt) => opt.name)

			expect(optionNames).toContain("with-repository")
			expect(optionNames).toContain("with-tests")
			expect(optionNames).toContain("with-validation")
		})
	})

	describe("handler execution", () => {
		it("should create service successfully", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": true,
				"with-tests": true,
				"with-validation": true,
			}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.message).toContain("Service created successfully")
			expect(result.data?.files).toContain("src/lib/services/TestService.ts")
			expect(result.data?.directories).toContain("src/lib/services")
		})

		it("should create service with repository", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": true,
			}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/lib/repositories/TestServiceRepository.ts")
		})

		it("should create service with tests", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-tests": true,
			}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/lib/services/TestService.test.ts")
		})

		it("should create service with validation", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-validation": true,
			}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/lib/validation/TestServiceSchema.ts")
		})

		it("should create service without repository", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": false,
			}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).not.toContain("src/lib/repositories/TestServiceRepository.ts")
		})

		it("should create service without tests", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-tests": false,
			}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).not.toContain("src/lib/services/TestService.test.ts")
		})

		it("should create service without validation", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-validation": false,
			}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).not.toContain("src/lib/validation/TestServiceSchema.ts")
		})

		it("should handle service name validation", async () => {
			const args: CommandArguments = { name: "test-service" } // Invalid name
			const options: CommandOptions = {}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Service name must start with a capital letter")
		})

		it("should handle file system errors", async () => {
			// Mock file system error
			mockFsExtra.writeFile.mockRejectedValueOnce(new Error("File system error"))

			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Failed to create service")
		})

		it("should handle missing name argument", async () => {
			const args: CommandArguments = {}
			const options: CommandOptions = {}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Service name is required")
		})

		it("should handle empty name argument", async () => {
			const args: CommandArguments = { name: "" }
			const options: CommandOptions = {}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Service name is required")
		})

		it("should handle whitespace-only name argument", async () => {
			const args: CommandArguments = { name: "   " }
			const options: CommandOptions = {}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Service name is required")
		})
	})

	describe("file generation", () => {
		it("should generate correct service content", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/services/TestService.ts",
				expect.stringContaining("class TestServiceService"),
			)
		})

		it("should generate service without repository", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": false,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/services/TestService.ts",
				expect.not.stringContaining("TestServiceRepository"),
			)
		})

		it("should generate repository file content", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/repositories/TestServiceRepository.ts",
				expect.stringContaining("class TestServiceRepository"),
			)
		})

		it("should generate test file content", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-tests": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/services/TestService.test.ts",
				expect.stringContaining("describe('TestServiceService'"),
			)
		})

		it("should generate validation schema file content", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-validation": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/validation/TestServiceSchema.ts",
				expect.stringContaining("export const TestServiceSchema"),
			)
		})
	})

	describe("directory structure", () => {
		it("should create services directory if it does not exist", async () => {
			// Remove services directory
			mockFs.remove("/mock/project/src/lib/services")

			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.ensureDir).toHaveBeenCalledWith("/mock/project/src/lib/services")
		})

		it("should create repositories directory if it does not exist", async () => {
			// Remove repositories directory
			mockFs.remove("/mock/project/src/lib/repositories")

			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.ensureDir).toHaveBeenCalledWith("/mock/project/src/lib/repositories")
		})

		it("should create validation directory if it does not exist", async () => {
			// Remove validation directory
			mockFs.remove("/mock/project/src/lib/validation")

			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-validation": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.ensureDir).toHaveBeenCalledWith("/mock/project/src/lib/validation")
		})

		it("should handle nested service names", async () => {
			const args: CommandArguments = { name: "UserProfileService" }
			const options: CommandOptions = {}

			const result = await makeServiceCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/lib/services/UserProfileService.ts")
		})
	})

	describe("service structure", () => {
		it("should generate service with proper imports", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/services/TestService.ts",
				expect.stringContaining("import { BaseService }"),
			)
		})

		it("should generate service with proper class structure", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/services/TestService.ts",
				expect.stringContaining("export class TestServiceService"),
			)
		})

		it("should generate service with proper types", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/services/TestService.ts",
				expect.stringContaining("export interface TestService"),
			)
		})

		it("should generate service with proper error handling", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/services/TestService.ts",
				expect.stringContaining("try {"),
			)
		})
	})

	describe("repository integration", () => {
		it("should generate repository with proper imports", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/repositories/TestServiceRepository.ts",
				expect.stringContaining("import { BaseRepository }"),
			)
		})

		it("should generate repository with proper class structure", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/repositories/TestServiceRepository.ts",
				expect.stringContaining("export class TestServiceRepository"),
			)
		})

		it("should generate repository with proper methods", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-repository": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/repositories/TestServiceRepository.ts",
				expect.stringContaining("async findById"),
			)
		})
	})

	describe("validation integration", () => {
		it("should generate validation schema with proper imports", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-validation": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/validation/TestServiceSchema.ts",
				expect.stringContaining("import { z }"),
			)
		})

		it("should generate validation schema with proper structure", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-validation": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/validation/TestServiceSchema.ts",
				expect.stringContaining("export const TestServiceSchema"),
			)
		})

		it("should generate validation schema with proper types", async () => {
			const args: CommandArguments = { name: "TestService" }
			const options: CommandOptions = {
				"with-validation": true,
			}

			await makeServiceCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/lib/validation/TestServiceSchema.ts",
				expect.stringContaining("export type TestServiceData"),
			)
		})
	})
})
