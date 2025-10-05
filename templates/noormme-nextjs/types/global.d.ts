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
	}
}

export {}
