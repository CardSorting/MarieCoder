/**
 * Jest Test Setup
 * Following NORMIE DEV methodology - clean, unified, production-ready
 */

import "@testing-library/jest-dom"
import { TextDecoder, TextEncoder } from "util"

// Mock Next.js router
jest.mock("next/navigation", () => ({
	useRouter() {
		return {
			push: jest.fn(),
			replace: jest.fn(),
			prefetch: jest.fn(),
			back: jest.fn(),
			forward: jest.fn(),
			refresh: jest.fn(),
		}
	},
	useSearchParams() {
		return new URLSearchParams()
	},
	usePathname() {
		return "/"
	},
}))

// Mock Next.js image component
jest.mock("next/image", () => ({
	__esModule: true,
	default: (props: any) => {
		// eslint-disable-next-line @next/next/no-img-element
		return <img {...props} />
	},
}))

// Mock Next.js Link component
jest.mock("next/link", () => ({
	__esModule: true,
	default: ({ children, href, ...props }: any) => {
		return (
      <a href={href}
		...props
		>
		children
		</a>
		)
	},
}))

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
process.env.DATABASE_URL = ":memory:"
process.env.NEXTAUTH_URL = "http://localhost:3000"
process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
process.env.APP_NAME = "NOORMME SAAS Test"
process.env.NODE_ENV = "test"

// Global test utilities
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock console methods in test environment
if (process.env.NODE_ENV === "test") {
	global.console = {
		...console,
		log: jest.fn(),
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	}
}

// Mock fetch for API testing
global.fetch = jest.fn()

// Setup and teardown for each test
beforeEach(() => {
	// Clear all mocks before each test
	jest.clearAllMocks()

	// Reset fetch mock
	;(fetch as jest.Mock).mockClear()
})

afterEach(() => {
	// Clean up after each test
	jest.restoreAllMocks()
})

// Global test timeout
jest.setTimeout(10000)
