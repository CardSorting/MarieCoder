/**
 * Tests for ProjectAnalyzer
 */

import { ProjectAnalyzer } from "../../core/project-analyzer.js"
import { createMockFileSystem } from "../fixtures/mock-fs.js"

// Mock fs-extra
jest.mock("fs-extra", () => ({
	pathExists: jest.fn(),
	readFile: jest.fn(),
	readdir: jest.fn(),
	stat: jest.fn(),
}))

describe("ProjectAnalyzer", () => {
	let analyzer: ProjectAnalyzer
	let mockFs: ReturnType<typeof createMockFileSystem>

	beforeEach(() => {
		mockFs = createMockFileSystem()
		analyzer = new ProjectAnalyzer("/test/project")
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe("constructor", () => {
		it("should initialize with project path", () => {
			expect(analyzer["projectPath"]).toBe("/test/project")
		})
	})

	describe("analyze", () => {
		it("should analyze project structure", async () => {
			// Mock a basic project structure
			mockFs.addFile(
				"/test/project/package.json",
				JSON.stringify({
					name: "test-project",
					dependencies: {
						next: "^14.0.0",
					},
				}),
			)

			const result = await analyzer.analyze()

			expect(result).toBeDefined()
			expect(result.projectPath).toBe("/test/project")
			expect(result.hasNextjs).toBe(true)
			expect(result.hasDatabase).toBe(false)
			expect(result.hasAuth).toBe(false)
			expect(result.hasAdmin).toBe(false)
			expect(Array.isArray(result.components)).toBe(true)
			expect(Array.isArray(result.services)).toBe(true)
			expect(Array.isArray(result.repositories)).toBe(true)
			expect(Array.isArray(result.pages)).toBe(true)
			expect(Array.isArray(result.apiRoutes)).toBe(true)
		})

		it("should handle non-Next.js project", async () => {
			// Mock a non-Next.js project
			mockFs.addFile(
				"/test/project/package.json",
				JSON.stringify({
					name: "test-project",
					dependencies: {},
				}),
			)

			const result = await analyzer.analyze()

			expect(result.hasNextjs).toBe(false)
			expect(result.hasDatabase).toBe(false)
			expect(result.hasAuth).toBe(false)
			expect(result.hasAdmin).toBe(false)
		})

		it("should handle missing package.json", async () => {
			const result = await analyzer.analyze()

			expect(result.hasNextjs).toBe(false)
			expect(result.hasDatabase).toBe(false)
			expect(result.hasAuth).toBe(false)
			expect(result.hasAdmin).toBe(false)
		})
	})
})
