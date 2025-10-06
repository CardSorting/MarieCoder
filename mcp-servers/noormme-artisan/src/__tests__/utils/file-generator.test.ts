/**
 * File Generator Tests
 * Tests for the FileGenerator utility class
 */

import { FileGenerator } from "../../utils/file-generator"
import { setupMockFileSystem, teardownMockFileSystem } from "../fixtures/mock-fs"

// Mock fs-extra
jest.mock("fs-extra", () => ({
	ensureDir: jest.fn(),
	writeFile: jest.fn(),
	readFile: jest.fn(),
	readJson: jest.fn(),
	writeJson: jest.fn(),
	pathExists: jest.fn(),
	readdir: jest.fn(),
	remove: jest.fn(),
	copy: jest.fn(),
	move: jest.fn(),
	stat: jest.fn(),
	mkdirp: jest.fn(),
	outputFile: jest.fn(),
	outputJson: jest.fn(),
	readFileSync: jest.fn(),
	writeFileSync: jest.fn(),
	existsSync: jest.fn(),
	mkdirSync: jest.fn(),
	rmdirSync: jest.fn(),
	unlinkSync: jest.fn(),
}))

describe("FileGenerator", () => {
	let fileGenerator: FileGenerator

	beforeEach(() => {
		setupMockFileSystem()
		fileGenerator = new FileGenerator({
			baseDir: "/mock/project",
			overwrite: false,
			createDirectories: true,
		})
	})

	afterEach(() => {
		teardownMockFileSystem()
		jest.clearAllMocks()
	})

	describe("generateFile", () => {
		it("should generate a single file successfully", async () => {
			const result = await fileGenerator.generateFile(
				"src/components/TestComponent.tsx",
				"export const TestComponent = () => <div>Test</div>",
				{ name: "TestComponent" },
			)

			expect(typeof result).toBe("string")
			expect(result).toBe("src/components/TestComponent.tsx")
		})

		it("should throw error when file exists and overwrite is false", async () => {
			const fs = require("fs-extra")
			fs.pathExists.mockResolvedValue(true)

			await expect(
				fileGenerator.generateFile(
					"src/components/TestComponent.tsx",
					"export const TestComponent = () => <div>Test</div>",
				),
			).rejects.toThrow("File src/components/TestComponent.tsx already exists")
		})

		it("should overwrite file when overwrite is true", async () => {
			const fs = require("fs-extra")
			fs.pathExists.mockResolvedValue(true)

			const generator = new FileGenerator({
				baseDir: "/mock/project",
				overwrite: true,
			})

			const result = await generator.generateFile(
				"src/components/TestComponent.tsx",
				"export const TestComponent = () => <div>Test</div>",
			)

			expect(result).toBe("src/components/TestComponent.tsx")
		})
	})

	describe("generateFiles", () => {
		it("should generate multiple files successfully", async () => {
			const files = [
				{
					path: "src/components/TestComponent.tsx",
					template: "export const TestComponent = () => <div>Test</div>",
				},
				{
					path: "src/components/TestComponent.test.tsx",
					template: 'import { TestComponent } from "./TestComponent"',
				},
			]

			const result = await fileGenerator.generateFiles(files)

			expect(Array.isArray(result)).toBe(true)
			expect(result).toHaveLength(2)
			expect(result).toContain("src/components/TestComponent.tsx")
			expect(result).toContain("src/components/TestComponent.test.tsx")
		})
	})

	describe("generateComponent", () => {
		it("should generate component file successfully", async () => {
			const result = await fileGenerator.generateComponent({
				name: "TestComponent",
				type: "ui",
				withTests: true,
				withStyles: false,
				withStory: false,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBeGreaterThan(0)
			expect(result).toContain("src/components/ui/TestComponent.tsx")
		})

		it("should generate component with tests", async () => {
			const result = await fileGenerator.generateComponent({
				name: "TestComponent",
				withTests: true,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result).toContain("src/components/ui/TestComponent.test.tsx")
		})

		it("should generate component with styles", async () => {
			const result = await fileGenerator.generateComponent({
				name: "TestComponent",
				withStyles: true,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result).toContain("src/components/ui/TestComponent.module.css")
		})

		it("should generate component with story", async () => {
			const result = await fileGenerator.generateComponent({
				name: "TestComponent",
				withStory: true,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result).toContain("src/components/ui/TestComponent.stories.tsx")
		})

		it("should generate component in correct directory based on type", async () => {
			const result = await fileGenerator.generateComponent({
				name: "TestComponent",
				type: "page",
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result).toContain("src/components/page/TestComponent.tsx")
		})

		it("should handle file system errors", async () => {
			const fs = require("fs-extra")
			fs.writeFile.mockRejectedValueOnce(new Error("File system error"))

			await expect(
				fileGenerator.generateComponent({
					name: "TestComponent",
				}),
			).rejects.toThrow("File system error")
		})
	})

	describe("generateService", () => {
		it("should generate service file successfully", async () => {
			const result = await fileGenerator.generateService({
				name: "TestService",
				withRepository: true,
				withTests: true,
				withValidation: true,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBeGreaterThan(0)
			expect(result).toContain("src/lib/services/TestService.ts")
		})

		it("should generate service with repository", async () => {
			const result = await fileGenerator.generateService({
				name: "TestService",
				withRepository: true,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result).toContain("src/lib/services/TestService.ts")
		})

		it("should generate service with tests", async () => {
			const result = await fileGenerator.generateService({
				name: "TestService",
				withTests: true,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result).toContain("src/lib/services/TestService.test.ts")
		})

		it("should handle file system errors", async () => {
			const fs = require("fs-extra")
			fs.writeFile.mockRejectedValueOnce(new Error("File system error"))

			await expect(
				fileGenerator.generateService({
					name: "TestService",
				}),
			).rejects.toThrow("File system error")
		})
	})

	describe("generatePage", () => {
		it("should generate page file successfully", async () => {
			const result = await fileGenerator.generatePage({
				name: "TestPage",
				withTests: true,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBeGreaterThan(0)
			expect(result).toContain("src/app/test-page/page.tsx")
		})

		it("should generate page with tests", async () => {
			const result = await fileGenerator.generatePage({
				name: "TestPage",
				withTests: true,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result).toContain("src/app/test-page/page.test.tsx")
		})

		it("should handle file system errors", async () => {
			const fs = require("fs-extra")
			fs.writeFile.mockRejectedValueOnce(new Error("File system error"))

			await expect(
				fileGenerator.generatePage({
					name: "TestPage",
				}),
			).rejects.toThrow("File system error")
		})
	})

	describe("generateApiRoute", () => {
		it("should generate API route file successfully", async () => {
			const result = await fileGenerator.generateApiRoute({
				name: "TestApi",
				withTests: true,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBeGreaterThan(0)
			expect(result).toContain("src/app/api/test-api/route.ts")
		})

		it("should generate API route with tests", async () => {
			const result = await fileGenerator.generateApiRoute({
				name: "TestApi",
				withTests: true,
			})

			expect(Array.isArray(result)).toBe(true)
			expect(result).toContain("src/app/api/test-api/route.test.ts")
		})

		it("should handle file system errors", async () => {
			const fs = require("fs-extra")
			fs.writeFile.mockRejectedValueOnce(new Error("File system error"))

			await expect(
				fileGenerator.generateApiRoute({
					name: "TestApi",
				}),
			).rejects.toThrow("File system error")
		})
	})

	describe("constructor", () => {
		it("should create FileGenerator with default options", () => {
			const generator = new FileGenerator({
				baseDir: "/test",
			})

			expect(generator).toBeInstanceOf(FileGenerator)
		})

		it("should create FileGenerator with custom options", () => {
			const generator = new FileGenerator({
				baseDir: "/test",
				overwrite: true,
				createDirectories: false,
			})

			expect(generator).toBeInstanceOf(FileGenerator)
		})
	})
})
