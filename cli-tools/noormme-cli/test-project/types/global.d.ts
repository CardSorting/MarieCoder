/**
 * Global type declarations for NOORMME Next.js Template
 */

declare global {
	namespace JSX {
		interface IntrinsicElements {
			[elemName: string]: any
		}
	}
}

// Extend NextAuth types
declare module "next-auth" {
	interface Session {
		user: {
			id: string
			email: string
			name: string
			image?: string
			roles?: Array<{
				id: string
				name: string
				description?: string
			}>
		}
	}

	interface User {
		id: string
		email: string
		name: string
		image?: string
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		id: string
		email: string
		name: string
		image?: string
		roles?: Array<{
			id: string
			name: string
			description?: string
		}>
	}
}

// Extend Node.js process.env
declare namespace NodeJS {
	interface ProcessEnv {
		NEXTAUTH_SECRET: string
		NEXTAUTH_URL: string
		DATABASE_URL: string
		GOOGLE_CLIENT_ID: string
		GOOGLE_CLIENT_SECRET: string
		GITHUB_CLIENT_ID: string
		GITHUB_CLIENT_SECRET: string
		STRIPE_SECRET_KEY: string
		STRIPE_PUBLISHABLE_KEY: string
		STRIPE_WEBHOOK_SECRET: string
		PAYPAL_CLIENT_ID: string
		PAYPAL_CLIENT_SECRET: string
		PAYPAL_WEBHOOK_SECRET: string
		// Queue System Configuration
		QUEUE_CONCURRENCY?: string
		QUEUE_INTERVAL?: string
		QUEUE_BATCH_SIZE?: string
		QUEUE_CLEANUP_DAYS?: string
		QUEUE_IN_MEMORY_CONCURRENCY?: string
		QUEUE_IN_MEMORY_INTERVAL?: string
		QUEUE_IN_MEMORY_TIMEOUT?: string
		QUEUE_CLEANUP_INTERVAL?: string
		// Email Configuration
		EMAIL_FROM?: string
		EMAIL_API_KEY?: string
		// Image Processing Configuration
		IMAGE_OUTPUT_DIR?: string
		IMAGE_TEMP_DIR?: string
	}
}

export {}
