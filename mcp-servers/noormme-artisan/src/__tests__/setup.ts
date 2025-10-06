/**
 * Test Setup
 * Global test configuration and utilities
 */

import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util"

// Note: Next.js modules are not mocked since we're testing the MCP server in isolation

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

// Mock path
jest.mock("path", () => ({
	join: jest.fn((...args) => args.join("/")),
	dirname: jest.fn((path) => path.split("/").slice(0, -1).join("/")),
	basename: jest.fn((path) => path.split("/").pop()),
	extname: jest.fn((path) => {
		const parts = path.split(".")
		return parts.length > 1 ? "." + parts.pop() : ""
	}),
	resolve: jest.fn((...args) => args.join("/")),
	relative: jest.fn((from, to) => to.replace(from, "")),
	sep: "/",
	delimiter: ":",
}))

// Mock process
Object.defineProperty(process, "cwd", {
	value: jest.fn(() => "/mock/project"),
	writable: true,
})

// Global test utilities
global.TextEncoder = NodeTextEncoder as any
global.TextDecoder = NodeTextDecoder as any

// Mock console methods to reduce noise in tests
global.console = {
	...console,
	log: jest.fn(),
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
}

// Test environment setup
process.env.NODE_ENV = "test"
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
process.env.DATABASE_URL = ":memory:"

// Global test timeout
jest.setTimeout(10000)

// Clean up after each test
afterEach(() => {
	jest.clearAllMocks()
})

// Global test helpers
declare global {
	namespace jest {
		interface Matchers<R> {
			toBeValidArtisanError(): R
			toHaveValidFileStructure(): R
		}
	}
}

// Custom matchers
expect.extend({
	toBeValidArtisanError(received) {
		const pass =
			received &&
			typeof received === "object" &&
			typeof received.code === "string" &&
			typeof received.message === "string" &&
			received.name === "ArtisanError"

		return {
			message: () => `expected ${received} to be a valid ArtisanError`,
			pass,
		}
	},

	toHaveValidFileStructure(received) {
		const pass = Array.isArray(received) && received.every((file) => typeof file === "string" && file.length > 0)

		return {
			message: () => `expected ${received} to be an array of valid file paths`,
			pass,
		}
	},
})
