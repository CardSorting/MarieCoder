/**
 * Mock File System
 * Mock implementations for file system operations
 */

import * as path from "path"

export class MockFileSystem {
	private files: Map<string, string> = new Map()
	private directories: Set<string> = new Set()
	private exists: Set<string> = new Set()

	constructor() {
		this.reset()
	}

	reset(): void {
		this.files.clear()
		this.directories.clear()
		this.exists.clear()
	}

	// Mock fs-extra methods
	async pathExists(filePath: string): Promise<boolean> {
		return this.exists.has(path.resolve(filePath))
	}

	async ensureDir(dirPath: string): Promise<void> {
		const resolvedPath = path.resolve(dirPath)
		this.directories.add(resolvedPath)
		this.exists.add(resolvedPath)
	}

	async readFile(filePath: string, _encoding?: BufferEncoding): Promise<string> {
		const resolvedPath = path.resolve(filePath)
		const content = this.files.get(resolvedPath)
		if (content === undefined) {
			throw new Error(`ENOENT: no such file or directory, open '${filePath}'`)
		}
		return content
	}

	async writeFile(filePath: string, data: string, _options?: any): Promise<void> {
		const resolvedPath = path.resolve(filePath)
		this.files.set(resolvedPath, data)
		this.exists.add(resolvedPath)

		// Ensure parent directory exists
		const parentDir = path.dirname(resolvedPath)
		this.directories.add(parentDir)
		this.exists.add(parentDir)
	}

	async readdir(dirPath: string): Promise<string[]> {
		const resolvedPath = path.resolve(dirPath)
		if (!this.directories.has(resolvedPath)) {
			throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`)
		}

		const files: string[] = []
		for (const filePath of this.files.keys()) {
			if (path.dirname(filePath) === resolvedPath) {
				files.push(path.basename(filePath))
			}
		}

		for (const dirPath of this.directories) {
			if (path.dirname(dirPath) === resolvedPath && dirPath !== resolvedPath) {
				files.push(path.basename(dirPath))
			}
		}

		return files
	}

	async mkdir(dirPath: string, _options?: any): Promise<void> {
		const resolvedPath = path.resolve(dirPath)
		this.directories.add(resolvedPath)
		this.exists.add(resolvedPath)
	}

	async remove(filePath: string): Promise<void> {
		const resolvedPath = path.resolve(filePath)
		this.files.delete(resolvedPath)
		this.exists.delete(resolvedPath)
	}

	async copy(src: string, dest: string): Promise<void> {
		const srcPath = path.resolve(src)
		const destPath = path.resolve(dest)

		if (this.files.has(srcPath)) {
			const content = this.files.get(srcPath)!
			this.files.set(destPath, content)
			this.exists.add(destPath)
		} else if (this.directories.has(srcPath)) {
			this.directories.add(destPath)
			this.exists.add(destPath)
		} else {
			throw new Error(`ENOENT: no such file or directory, copy '${src}'`)
		}
	}

	async move(src: string, dest: string): Promise<void> {
		await this.copy(src, dest)
		await this.remove(src)
	}

	// Helper methods for test setup
	addFile(filePath: string, content: string): void {
		const resolvedPath = path.resolve(filePath)
		this.files.set(resolvedPath, content)
		this.exists.add(resolvedPath)

		// Ensure parent directory exists
		const parentDir = path.dirname(resolvedPath)
		this.directories.add(parentDir)
		this.exists.add(parentDir)
	}

	addDirectory(dirPath: string): void {
		const resolvedPath = path.resolve(dirPath)
		this.directories.add(resolvedPath)
		this.exists.add(resolvedPath)
	}

	getFileContent(filePath: string): string | undefined {
		const resolvedPath = path.resolve(filePath)
		return this.files.get(resolvedPath)
	}

	hasFile(filePath: string): boolean {
		const resolvedPath = path.resolve(filePath)
		return this.files.has(resolvedPath)
	}

	hasDirectory(dirPath: string): boolean {
		const resolvedPath = path.resolve(dirPath)
		return this.directories.has(resolvedPath)
	}

	getAllFiles(): string[] {
		return Array.from(this.files.keys())
	}

	getAllDirectories(): string[] {
		return Array.from(this.directories)
	}

	// Mock path methods
	join(...paths: string[]): string {
		return path.join(...paths)
	}

	resolve(...paths: string[]): string {
		return path.resolve(...paths)
	}

	dirname(filePath: string): string {
		return path.dirname(filePath)
	}

	basename(filePath: string, ext?: string): string {
		return path.basename(filePath, ext)
	}

	extname(filePath: string): string {
		return path.extname(filePath)
	}
}

// Create a singleton instance
export const mockFs = new MockFileSystem()

// Mock fs-extra module
export const mockFsExtra = {
	pathExists: jest.fn().mockImplementation((filePath: string) => mockFs.pathExists(filePath)),
	ensureDir: jest.fn().mockImplementation((dirPath: string) => mockFs.ensureDir(dirPath)),
	readFile: jest.fn().mockImplementation((filePath: string, encoding?: BufferEncoding) => mockFs.readFile(filePath, encoding)),
	writeFile: jest
		.fn()
		.mockImplementation((filePath: string, data: string, options?: any) => mockFs.writeFile(filePath, data, options)),
	readdir: jest.fn().mockImplementation((dirPath: string) => mockFs.readdir(dirPath)),
	mkdir: jest.fn().mockImplementation((dirPath: string, options?: any) => mockFs.mkdir(dirPath, options)),
	remove: jest.fn().mockImplementation((filePath: string) => mockFs.remove(filePath)),
	copy: jest.fn().mockImplementation((src: string, dest: string) => mockFs.copy(src, dest)),
	move: jest.fn().mockImplementation((src: string, dest: string) => mockFs.move(src, dest)),
}

// Mock path module
export const mockPath = {
	join: jest.fn().mockImplementation((...paths: string[]) => mockFs.join(...paths)),
	resolve: jest.fn().mockImplementation((...paths: string[]) => mockFs.resolve(...paths)),
	dirname: jest.fn().mockImplementation((filePath: string) => mockFs.dirname(filePath)),
	basename: jest.fn().mockImplementation((filePath: string, ext?: string) => mockFs.basename(filePath, ext)),
	extname: jest.fn().mockImplementation((filePath: string) => mockFs.extname(filePath)),
	sep: path.sep,
	delimiter: path.delimiter,
}

// Mock process.cwd
export const mockProcessCwd = jest.fn().mockReturnValue("/mock/project")

// Mock process.env
export const mockProcessEnv = {
	NODE_ENV: "test",
	DATABASE_URL: "./test.db",
	NEXTAUTH_URL: "http://localhost:3000",
	NEXTAUTH_SECRET: "test-secret",
}

// Setup function for tests
export function setupMockFileSystem(): void {
	// Reset the mock file system
	mockFs.reset()

	// Setup default project structure
	mockFs.addDirectory("/mock/project")
	mockFs.addDirectory("/mock/project/src")
	mockFs.addDirectory("/mock/project/src/app")
	mockFs.addDirectory("/mock/project/src/components")
	mockFs.addDirectory("/mock/project/src/lib")
	mockFs.addDirectory("/mock/project/src/lib/services")
	mockFs.addDirectory("/mock/project/src/lib/repositories")
	mockFs.addDirectory("/mock/project/src/lib/database")
	mockFs.addDirectory("/mock/project/src/lib/database/migrations")
	mockFs.addDirectory("/mock/project/src/lib/database/seeders")

	// Add package.json
	mockFs.addFile(
		"/mock/project/package.json",
		JSON.stringify(
			{
				name: "test-project",
				version: "0.1.0",
				private: true,
				scripts: {
					dev: "next dev",
					build: "next build",
					start: "next start",
					lint: "next lint",
				},
				dependencies: {
					next: "^14.0.0",
					react: "^18.0.0",
					"react-dom": "^18.0.0",
				},
				devDependencies: {
					"@types/node": "^20.0.0",
					"@types/react": "^18.0.0",
					typescript: "^5.0.0",
				},
			},
			null,
			2,
		),
	)

	// Add next.config.js
	mockFs.addFile(
		"/mock/project/next.config.js",
		`/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
`,
	)

	// Add tsconfig.json
	mockFs.addFile(
		"/mock/project/tsconfig.json",
		JSON.stringify(
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
					plugins: [{ name: "next" }],
					baseUrl: ".",
					paths: { "@/*": ["./src/*"] },
				},
				include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
				exclude: ["node_modules"],
			},
			null,
			2,
		),
	)

	// Add tailwind.config.js
	mockFs.addFile(
		"/mock/project/tailwind.config.js",
		`/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`,
	)

	// Add .env.example
	mockFs.addFile(
		"/mock/project/.env.example",
		`# Database
DATABASE_URL="./app.db"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Authentication
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
`,
	)

	// Add .gitignore
	mockFs.addFile(
		"/mock/project/.gitignore",
		`# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

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
`,
	)

	// Add README.md
	mockFs.addFile(
		"/mock/project/README.md",
		`# test-project

A NOORMME Next.js project built with modern development practices.

## Features

- ⚡ Next.js 14 with App Router
- 🎨 Tailwind CSS for styling
- 🔒 NextAuth.js for authentication
- 🗄️ SQLite database with Kysely
- 🧪 Jest and Testing Library
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

3. Initialize the database:
   \`\`\`bash
   npm run db:migrate
   npm run db:seed
   \`\`\`

4. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run start\` - Start production server
- \`npm run lint\` - Run ESLint
- \`npm run test\` - Run tests
- \`npm run test:watch\` - Run tests in watch mode
- \`npm run test:coverage\` - Run tests with coverage

## License

MIT
`,
	)

	// Add app layout
	mockFs.addFile(
		"/mock/project/src/app/layout.tsx",
		`import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'test-project',
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
`,
	)

	// Add app page
	mockFs.addFile(
		"/mock/project/src/app/page.tsx",
		`export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        Welcome to test-project
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
`,
	)

	// Add globals.css
	mockFs.addFile(
		"/mock/project/src/app/globals.css",
		`@tailwind base;
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
`,
	)

	// Add database config
	mockFs.addFile(
		"/mock/project/src/lib/db.ts",
		`import { Kysely, SqliteDialect } from 'kysely'
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
`,
	)

	// Add database types
	mockFs.addFile(
		"/mock/project/src/types/database.ts",
		`// This file is auto-generated by NOORMME
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
`,
	)

	// Add auth config
	mockFs.addFile(
		"/mock/project/src/lib/auth.ts",
		`import NextAuth from 'next-auth'
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
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = user?.id || token?.sub
      }
      return session
    },
    async jwt({ token, account, profile, user }) {
      if (account) {
        token.accessToken = account.access_token
      }
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
})
`,
	)

	// Add middleware
	mockFs.addFile(
		"/mock/project/src/middleware.ts",
		`import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin') && !req.auth) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }
  
  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith('/dashboard') && !req.auth) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }
  
  // Redirect authenticated users away from auth pages
  if (req.auth && req.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
`,
	)
}

// Teardown function for tests
export function teardownMockFileSystem(): void {
	mockFs.reset()
}
