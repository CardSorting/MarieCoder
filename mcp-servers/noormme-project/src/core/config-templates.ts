/**
 * Configuration Templates for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean, optimized configuration templates
 */

export class ConfigTemplates {
	/**
	 * Get package.json template
	 */
	getPackageJsonTemplate(): string {
		return `{
	"name": "<%= projectName %>",
	"version": "<%= version || '0.1.0' %>",
	"private": true,
	"description": "<%= description || 'A Next.js project with NOORMME integration' %>",
	"author": "<%= author || 'Your Name' %>",
	"scripts": {
		"dev": "next dev",
		"build": "next build",
		"start": "next start",
		"lint": "next lint",
		"type-check": "tsc --noEmit",
		"db:generate": "noormme generate",
		"db:migrate": "noormme migrate",
		"db:seed": "noormme seed"
	},
	"dependencies": {
		"next": "^14.0.0",
		"react": "^18.2.0",
		"react-dom": "^18.2.0",
		"typescript": "^5.0.0",
		"noormme": "^0.0.1",
		"kysely": "^0.27.2"<% if (includeTailwind) { %>,
		"tailwindcss": "^3.3.0",
		"autoprefixer": "^10.4.16",
		"postcss": "^8.4.31"<% } %><% if (includeAuth) { %>,
		"next-auth": "^4.24.5",
		"@auth/core": "^0.18.0"<% } %>
	},
	"devDependencies": {
		"@types/node": "^20.0.0",
		"@types/react": "^18.2.0",
		"@types/react-dom": "^18.2.0",
		"eslint": "^8.0.0",
		"eslint-config-next": "^14.0.0"<% if (includeTests) { %>,
		"@testing-library/react": "^13.4.0",
		"@testing-library/jest-dom": "^6.1.0",
		"jest": "^29.7.0",
		"jest-environment-jsdom": "^29.7.0"<% } %>
	}
}`
	}

	/**
	 * Get tsconfig.json template
	 */
	getTsConfigTemplate(): string {
		return `{
	"compilerOptions": {
		"target": "es5",
		"lib": ["dom", "dom.iterable", "es6"],
		"allowJs": true,
		"skipLibCheck": true,
		"strict": true,
		"noEmit": true,
		"esModuleInterop": true,
		"module": "esnext",
		"moduleResolution": "bundler",
		"resolveJsonModule": true,
		"isolatedModules": true,
		"jsx": "preserve",
		"incremental": true,
		"plugins": [
			{
				"name": "next"
			}
		],
		"baseUrl": ".",
		"paths": {
			"@/*": ["./src/*"]
		}
	},
	"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
	"exclude": ["node_modules"]
}`
	}

	/**
	 * Get Next.js config template
	 */
	getNextConfigTemplate(): string {
		return `/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		appDir: true,
	},
	images: {
		domains: ['localhost'],
	},
	env: {
		NOORMME_DATABASE_URL: process.env.NOORMME_DATABASE_URL || './database.sqlite',
	},
}

module.exports = nextConfig`
	}

	/**
	 * Get Tailwind config template
	 */
	getTailwindConfigTemplate(): string {
		return `/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				background: 'var(--background)',
				foreground: 'var(--foreground)',
				primary: {
					DEFAULT: 'var(--primary)',
					foreground: 'var(--primary-foreground)',
				},
				secondary: {
					DEFAULT: 'var(--secondary)',
					foreground: 'var(--secondary-foreground)',
				},
				muted: {
					DEFAULT: 'var(--muted)',
					foreground: 'var(--muted-foreground)',
				},
				accent: {
					DEFAULT: 'var(--accent)',
					foreground: 'var(--accent-foreground)',
				},
				destructive: {
					DEFAULT: 'var(--destructive)',
					foreground: 'var(--destructive-foreground)',
				},
				border: 'var(--border)',
				input: 'var(--input)',
				ring: 'var(--ring)',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
		},
	},
	plugins: [],
}`
	}

	/**
	 * Get PostCSS config template
	 */
	getPostCssConfigTemplate(): string {
		return `module.exports = {
	plugins: {
		tailwindcss: {},
		autoprefixer: {},
	},
}`
	}

	/**
	 * Get environment example template
	 */
	getEnvExampleTemplate(): string {
		return `# Database
NOORMME_DATABASE_URL=./database.sqlite

# Application
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

<% if (includeAuth) { %># Authentication Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret<% } %>

<% if (includePayments) { %># Payment Processing
STRIPE_PUBLIC_KEY=your-stripe-public-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret<% } %>

<% if (includeQueue) { %># Queue System
REDIS_URL=redis://localhost:6379
QUEUE_CONCURRENCY=5<% } %>`
	}

	/**
	 * Get .gitignore template
	 */
	getGitIgnoreTemplate(): string {
		return `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# database
*.sqlite
*.sqlite3
*.db

# logs
logs
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
Thumbs.db
.DS_Store`
	}

	/**
	 * Get middleware template (for auth)
	 */
	getMiddlewareTemplate(): string {
		return `import { withAuth } from "next-auth/middleware"

export default withAuth(
	function middleware(req) {
		// Add custom middleware logic here
	},
	{
		callbacks: {
			authorized: ({ token, req }) => {
				// Add authorization logic here
				return !!token
			},
		},
	}
)

export const config = {
	matcher: [
		"/dashboard/:path*",
		"/admin/:path*",
		"/api/protected/:path*",
	]
}`
	}

	/**
	 * Get auth providers template
	 */
	getAuthProvidersTemplate(): string {
		return `import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		}),
		GitHubProvider({
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id
			}
			return token
		},
		async session({ session, token }) {
			if (token) {
				session.user.id = token.id as string
			}
			return session
		},
	},
	pages: {
		signIn: '/auth/signin',
		signUp: '/auth/signup',
	},
	session: {
		strategy: 'jwt',
	},
}`
	}

	/**
	 * Get auth types template
	 */
	getAuthTypesTemplate(): string {
		return `import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
	interface Session {
		user: {
			id: string
		} & DefaultSession["user"]
	}

	interface User extends DefaultUser {
		id: string
	}
}

declare module "next-auth/jwt" {
	interface JWT extends DefaultJWT {
		id: string
	}
}`
	}
}
