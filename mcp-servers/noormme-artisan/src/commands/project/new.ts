/**
 * New Project Command
 * Creates a new NOORMME Next.js project with proper structure
 */

import fs from "fs-extra"
import path from "path"
import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult } from "../../types.js"

export const newProjectCommand: ArtisanCommand = {
	name: "new:project",
	description: "Create a new NOORMME Next.js project",
	signature: "new:project <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the project",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "template",
			description: "Project template (basic, full, admin, api)",
			type: "string",
			default: "basic",
			alias: "t",
		},
		{
			name: "with-auth",
			description: "Include authentication setup",
			type: "boolean",
			default: false,
		},
		{
			name: "with-admin",
			description: "Include admin panel",
			type: "boolean",
			default: false,
		},
		{
			name: "with-database",
			description: "Include database setup",
			type: "boolean",
			default: true,
		},
		{
			name: "with-tests",
			description: "Include test setup",
			type: "boolean",
			default: true,
		},
		{
			name: "with-tailwind",
			description: "Include Tailwind CSS",
			type: "boolean",
			default: true,
		},
	],
	handler: async (args: CommandArguments, options: CommandOptions): Promise<CommandResult> => {
		try {
			const config = {
				name: args.name as string,
				template: options.template || "basic",
				withAuth: options["with-auth"] || false,
				withAdmin: options["with-admin"] || false,
				withDatabase: options["with-database"] !== false,
				withTests: options["with-tests"] !== false,
				withTailwind: options["with-tailwind"] !== false,
			}

			const result = await createProject(config)

			return {
				success: true,
				message: `Project "${config.name}" created successfully`,
				data: result,
			}
		} catch (error) {
			return {
				success: false,
				message: `Failed to create project "${args.name}"`,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	},
}

async function createProject(config: any): Promise<{ files: string[]; directories: string[] }> {
	const files: string[] = []
	const directories: string[] = []
	const projectPath = path.join(process.cwd(), config.name)

	// Check if directory already exists
	if (await fs.pathExists(projectPath)) {
		throw new Error(`Directory "${config.name}" already exists`)
	}

	// Create project directory
	await fs.ensureDir(projectPath)
	directories.push(projectPath)

	// Create basic project structure
	await createBasicStructure(projectPath, config, files, directories)

	// Create package.json
	const packageJson = generatePackageJson(config)
	const packageJsonPath = path.join(projectPath, "package.json")
	await fs.writeFile(packageJsonPath, packageJson)
	files.push(packageJsonPath)

	// Create Next.js configuration
	const nextConfig = generateNextConfig(config)
	const nextConfigPath = path.join(projectPath, "next.config.js")
	await fs.writeFile(nextConfigPath, nextConfig)
	files.push(nextConfigPath)

	// Create TypeScript configuration
	const tsConfig = generateTsConfig(config)
	const tsConfigPath = path.join(projectPath, "tsconfig.json")
	await fs.writeFile(tsConfigPath, tsConfig)
	files.push(tsConfigPath)

	// Create Tailwind configuration if enabled
	if (config.withTailwind) {
		const tailwindConfig = generateTailwindConfig(config)
		const tailwindConfigPath = path.join(projectPath, "tailwind.config.js")
		await fs.writeFile(tailwindConfigPath, tailwindConfig)
		files.push(tailwindConfigPath)

		const globalCss = generateGlobalCss(config)
		const globalCssPath = path.join(projectPath, "src/app/globals.css")
		await fs.writeFile(globalCssPath, globalCss)
		files.push(globalCssPath)
	}

	// Create environment files
	const envExample = generateEnvExample(config)
	const envExamplePath = path.join(projectPath, ".env.example")
	await fs.writeFile(envExamplePath, envExample)
	files.push(envExamplePath)

	// Create README
	const readme = generateReadme(config)
	const readmePath = path.join(projectPath, "README.md")
	await fs.writeFile(readmePath, readme)
	files.push(readmePath)

	// Create .gitignore
	const gitignore = generateGitignore(config)
	const gitignorePath = path.join(projectPath, ".gitignore")
	await fs.writeFile(gitignorePath, gitignore)
	files.push(gitignorePath)

	return { files, directories }
}

async function createBasicStructure(projectPath: string, config: any, files: string[], directories: string[]): Promise<void> {
	// Create main directories
	const dirs = [
		"src/app",
		"src/components",
		"src/components/ui",
		"src/lib",
		"src/lib/services",
		"src/lib/repositories",
		"src/lib/database",
		"src/lib/database/migrations",
		"src/lib/database/seeders",
		"src/types",
		"public",
	]

	if (config.withAuth) {
		dirs.push("src/app/(auth)")
		dirs.push("src/app/api/auth")
		dirs.push("src/components/auth")
	}

	if (config.withAdmin) {
		dirs.push("src/app/admin")
		dirs.push("src/components/admin")
	}

	if (config.withTests) {
		dirs.push("src/__tests__")
		dirs.push("src/__tests__/fixtures")
		dirs.push("src/__tests__/mocks")
	}

	for (const dir of dirs) {
		const fullPath = path.join(projectPath, dir)
		await fs.ensureDir(fullPath)
		directories.push(fullPath)
	}

	// Create main layout
	const layout = generateLayout(config)
	const layoutPath = path.join(projectPath, "src/app/layout.tsx")
	await fs.writeFile(layoutPath, layout)
	files.push(layoutPath)

	// Create main page
	const page = generatePage(config)
	const pagePath = path.join(projectPath, "src/app/page.tsx")
	await fs.writeFile(pagePath, page)
	files.push(pagePath)

	// Create database configuration if enabled
	if (config.withDatabase) {
		const dbConfig = generateDbConfig(config)
		const dbConfigPath = path.join(projectPath, "src/lib/db.ts")
		await fs.writeFile(dbConfigPath, dbConfig)
		files.push(dbConfigPath)

		const dbTypes = generateDbTypes(config)
		const dbTypesPath = path.join(projectPath, "src/types/database.ts")
		await fs.writeFile(dbTypesPath, dbTypes)
		files.push(dbTypesPath)
	}

	// Create authentication setup if enabled
	if (config.withAuth) {
		const authConfig = generateAuthConfig(config)
		const authConfigPath = path.join(projectPath, "src/lib/auth.ts")
		await fs.writeFile(authConfigPath, authConfig)
		files.push(authConfigPath)

		const middleware = generateMiddleware(config)
		const middlewarePath = path.join(projectPath, "src/middleware.ts")
		await fs.writeFile(middlewarePath, middleware)
		files.push(middlewarePath)
	}
}

function generatePackageJson(config: any): string {
	const dependencies: Record<string, string> = {
		next: "^14.0.0",
		react: "^18.0.0",
		"react-dom": "^18.0.0",
	}

	const devDependencies: Record<string, string> = {
		"@types/node": "^20.0.0",
		"@types/react": "^18.0.0",
		"@types/react-dom": "^18.0.0",
		typescript: "^5.0.0",
		eslint: "^8.0.0",
		"eslint-config-next": "^14.0.0",
	}

	if (config.withTailwind) {
		dependencies["tailwindcss"] = "^3.0.0"
		dependencies["autoprefixer"] = "^10.0.0"
		dependencies["postcss"] = "^8.0.0"
		devDependencies["@tailwindcss/typography"] = "^0.5.0"
	}

	if (config.withDatabase) {
		dependencies["kysely"] = "^0.27.0"
		dependencies["better-sqlite3"] = "^9.0.0"
		devDependencies["@types/better-sqlite3"] = "^7.6.0"
	}

	if (config.withAuth) {
		dependencies["next-auth"] = "^4.24.0"
		devDependencies["@types/next-auth"] = "^4.24.0"
	}

	if (config.withTests) {
		devDependencies["jest"] = "^29.0.0"
		devDependencies["@testing-library/react"] = "^14.0.0"
		devDependencies["@testing-library/jest-dom"] = "^6.0.0"
		devDependencies["jest-environment-jsdom"] = "^29.0.0"
	}

	return JSON.stringify(
		{
			name: config.name,
			version: "0.1.0",
			private: true,
			scripts: {
				dev: "next dev",
				build: "next build",
				start: "next start",
				lint: "next lint",
				...(config.withTests && {
					test: "jest",
					"test:watch": "jest --watch",
					"test:coverage": "jest --coverage",
				}),
			},
			dependencies,
			devDependencies,
		},
		null,
		2,
	)
}

function generateNextConfig(_config: any): string {
	return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
`
}

function generateTsConfig(_config: any): string {
	return JSON.stringify(
		{
			compilerOptions: {
				target: "es5",
				lib: ["dom", "dom.iterable", "es6"],
				allowJs: true,
				skipLibCheck: true,
				strict: true,
				noEmit: true,
				esModuleInterop: true,
				module: "esnext",
				moduleResolution: "bundler",
				resolveJsonModule: true,
				isolatedModules: true,
				jsx: "preserve",
				incremental: true,
				plugins: [
					{
						name: "next",
					},
				],
				baseUrl: ".",
				paths: {
					"@/*": ["./src/*"],
				},
			},
			include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
			exclude: ["node_modules"],
		},
		null,
		2,
	)
}

function generateTailwindConfig(_config: any): string {
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
      },
    },
  },
  plugins: [],
}
`
}

function generateGlobalCss(_config: any): string {
	return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
`
}

function generateEnvExample(config: any): string {
	let env = `# Database
DATABASE_URL="./app.db"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
`

	if (config.withAuth) {
		env += `
# Authentication
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
`
	}

	return env
}

function generateReadme(config: any): string {
	return `# ${config.name}

A NOORMME Next.js project built with modern development practices.

## Features

- ⚡ Next.js 14 with App Router
- 🎨 Tailwind CSS for styling
- 🔒 ${config.withAuth ? "NextAuth.js for authentication" : "No authentication (add with \`artisan install:auth\`)"}
- 🗄️ ${config.withDatabase ? "SQLite database with Kysely" : "No database (add with \`artisan install:database\`)"}
- 🧪 ${config.withTests ? "Jest and Testing Library" : "No tests (add with \`artisan install:test\`)"}
- 📱 Responsive design
- 🚀 TypeScript for type safety

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   \`\`\`

3. ${config.withDatabase ? "Initialize the database:" : "Start the development server:"}
   \`\`\`bash
   ${config.withDatabase ? "npm run db:migrate\n   npm run db:seed\n   " : ""}npm run dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run start\` - Start production server
- \`npm run lint\` - Run ESLint
${config.withTests ? "- `npm run test` - Run tests\n- `npm run test:watch` - Run tests in watch mode\n- `npm run test:coverage` - Run tests with coverage" : ""}

## Project Structure

\`\`\`
src/
├── app/                    # Next.js App Router
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   └── ${config.withAuth ? "auth/" : ""}${config.withAdmin ? "admin/" : ""}    # Feature-specific components
├── lib/                   # Utility libraries
│   ├── services/          # Business logic services
│   ├── repositories/      # Data access layer
│   └── database/          # Database configuration
└── types/                 # TypeScript type definitions
\`\`\`

## Development

This project follows the NOORMME development methodology:
- Clean, maintainable code
- Type-safe database operations
- Modern React patterns
- Comprehensive testing

## License

MIT
`
}

function generateGitignore(_config: any): string {
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

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# database
*.db
*.sqlite
*.sqlite3

# IDE
.vscode/
.idea/
*.swp
*.swo
`
}

function generateLayout(config: any): string {
	return `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
${config.withTailwind ? "import './globals.css'" : ""}

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${config.name}',
  description: 'A NOORMME Next.js application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
`
}

function generatePage(config: any): string {
	return `export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        Welcome to ${config.name}
      </h1>
      <p className="text-center text-gray-600 mb-8">
        A NOORMME Next.js application built with modern development practices.
      </p>
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Get started by editing <code className="bg-gray-100 px-2 py-1 rounded">src/app/page.tsx</code>
        </p>
      </div>
    </div>
  )
}
`
}

function generateDbConfig(_config: any): string {
	return `import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import type { Database as DatabaseType } from '@/types/database'

const db = new Database('./app.db')

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = -64000')
db.pragma('temp_store = MEMORY')
db.pragma('foreign_keys = ON')

export const kysely = new Kysely<DatabaseType>({
  dialect: new SqliteDialect({
    database: db,
  }),
})

export default kysely
`
}

function generateDbTypes(_config: any): string {
	return `// This file is auto-generated by NOORMME
// Run 'artisan db:generate-types' to update

export interface Database {
  // Add your table types here
  // Example:
  // users: {
  //   id: string
  //   email: string
  //   name: string
  //   createdAt: string
  //   updatedAt: string
  // }
}
`
}

function generateAuthConfig(_config: any): string {
	return `import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'

export const { handlers, auth, signIn, signOut } = NextAuth({
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
    async session({ session, token }) {
      return session
    },
    async jwt({ token, account, profile }) {
      return token
    },
  },
})
`
}

function generateMiddleware(_config: any): string {
	return `import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  // Add your middleware logic here
  if (req.nextUrl.pathname.startsWith('/admin') && !req.auth) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
`
}
