/**
 * Make Component Command Tests
 * Test the make:component command functionality
 */

import { makeComponentCommand } from "../../../commands/make/component.js"
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

describe("make:component", () => {
	beforeEach(() => {
		setupMockFileSystem()
	})

	afterEach(() => {
		teardownMockFileSystem()
		jest.clearAllMocks()
	})

	describe("command definition", () => {
		it("should have correct command properties", () => {
			expect(makeComponentCommand.name).toBe("make:component")
			expect(makeComponentCommand.description).toBe("Create a new React component")
			expect(makeComponentCommand.signature).toBe("make:component <name> [options]")
		})

		it("should have required name argument", () => {
			const nameArg = makeComponentCommand.arguments?.find((arg) => arg.name === "name")
			expect(nameArg).toBeDefined()
			expect(nameArg?.required).toBe(true)
			expect(nameArg?.type).toBe("string")
		})

		it("should have correct options", () => {
			const options = makeComponentCommand.options || []
			const optionNames = options.map((opt) => opt.name)

			expect(optionNames).toContain("type")
			expect(optionNames).toContain("with-tests")
			expect(optionNames).toContain("with-styles")
			expect(optionNames).toContain("with-story")
			expect(optionNames).toContain("with-props")
		})
	})

	describe("handler execution", () => {
		it("should create component successfully", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				type: "ui",
				"with-tests": true,
				"with-styles": false,
				"with-story": false,
				"with-props": true,
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.message).toContain("Component created successfully")
			expect(result.data?.files).toContain("src/components/TestComponent.tsx")
			expect(result.data?.directories).toContain("src/components")
		})

		it("should create component with tests", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				"with-tests": true,
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/components/TestComponent.test.tsx")
		})

		it("should create component with styles", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				"with-styles": true,
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/components/TestComponent.module.css")
		})

		it("should create component with story", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				"with-story": true,
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/components/TestComponent.stories.tsx")
		})

		it("should create component without props interface", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				"with-props": false,
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/components/TestComponent.tsx")
		})

		it("should create component in correct directory based on type", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				type: "page",
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/components/page/TestComponent.tsx")
		})

		it("should handle component name validation", async () => {
			const args: CommandArguments = { name: "test-component" } // Invalid name
			const options: CommandOptions = {}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Component name must start with a capital letter")
		})

		it("should handle file system errors", async () => {
			// Mock file system error
			mockFsExtra.writeFile.mockRejectedValueOnce(new Error("File system error"))

			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Failed to create component")
		})

		it("should handle missing name argument", async () => {
			const args: CommandArguments = {}
			const options: CommandOptions = {}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Component name is required")
		})

		it("should handle empty name argument", async () => {
			const args: CommandArguments = { name: "" }
			const options: CommandOptions = {}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Component name is required")
		})

		it("should handle whitespace-only name argument", async () => {
			const args: CommandArguments = { name: "   " }
			const options: CommandOptions = {}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(false)
			expect(result.message).toContain("Component name is required")
		})
	})

	describe("file generation", () => {
		it("should generate correct component content", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				"with-props": true,
			}

			await makeComponentCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/components/TestComponent.tsx",
				expect.stringContaining("interface TestComponentProps"),
			)
		})

		it("should generate component without props interface", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				"with-props": false,
			}

			await makeComponentCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/components/TestComponent.tsx",
				expect.not.stringContaining("interface TestComponentProps"),
			)
		})

		it("should generate test file content", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				"with-tests": true,
			}

			await makeComponentCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/components/TestComponent.test.tsx",
				expect.stringContaining("describe('TestComponent'"),
			)
		})

		it("should generate styles file content", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				"with-styles": true,
			}

			await makeComponentCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/components/TestComponent.module.css",
				expect.stringContaining(".testComponent"),
			)
		})

		it("should generate story file content", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				"with-story": true,
			}

			await makeComponentCommand.handler!(args, options)

			expect(mockFsExtra.writeFile).toHaveBeenCalledWith(
				"/mock/project/src/components/TestComponent.stories.tsx",
				expect.stringContaining("export default"),
			)
		})
	})

	describe("directory structure", () => {
		it("should create components directory if it does not exist", async () => {
			// Remove components directory
			mockFs.remove("/mock/project/src/components")

			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {}

			await makeComponentCommand.handler!(args, options)

			expect(mockFsExtra.ensureDir).toHaveBeenCalledWith("/mock/project/src/components")
		})

		it("should create type-specific subdirectory", async () => {
			const args: CommandArguments = { name: "TestComponent" }
			const options: CommandOptions = {
				type: "form",
			}

			await makeComponentCommand.handler!(args, options)

			expect(mockFsExtra.ensureDir).toHaveBeenCalledWith("/mock/project/src/components/form")
		})

		it("should handle nested component names", async () => {
			const args: CommandArguments = { name: "UserProfile" }
			const options: CommandOptions = {
				type: "ui",
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/components/UserProfile.tsx")
		})
	})

	describe("component types", () => {
		it("should handle ui component type", async () => {
			const args: CommandArguments = { name: "Button" }
			const options: CommandOptions = {
				type: "ui",
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/components/Button.tsx")
		})

		it("should handle page component type", async () => {
			const args: CommandArguments = { name: "HomePage" }
			const options: CommandOptions = {
				type: "page",
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/components/page/HomePage.tsx")
		})

		it("should handle layout component type", async () => {
			const args: CommandArguments = { name: "MainLayout" }
			const options: CommandOptions = {
				type: "layout",
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/components/layout/MainLayout.tsx")
		})

		it("should handle form component type", async () => {
			const args: CommandArguments = { name: "ContactForm" }
			const options: CommandOptions = {
				type: "form",
			}

			const result = await makeComponentCommand.handler!(args, options)

			expect(result.success).toBe(true)
			expect(result.data?.files).toContain("src/components/form/ContactForm.tsx")
		})
	})
})
