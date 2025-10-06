/**
 * Test Fixtures
 * Common test data and mock objects
 */

import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult } from "../types.js"

export const mockProjectStructure = {
	projectPath: "/mock/project",
	hasNextjs: true,
	hasDatabase: true,
	hasAuth: true,
	hasAdmin: true,
	components: ["src/components/ui/Button.tsx", "src/components/ui/Input.tsx", "src/components/auth/LoginForm.tsx"],
	services: ["src/lib/services/UserService.ts", "src/lib/services/AuthService.ts"],
	repositories: ["src/lib/repositories/UserRepository.ts", "src/lib/repositories/AuthRepository.ts"],
	pages: ["src/app/page.tsx", "src/app/dashboard/page.tsx", "src/app/admin/page.tsx"],
	apiRoutes: ["src/app/api/users/route.ts", "src/app/api/auth/route.ts"],
}

export const mockPackageJson = {
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
}

export const mockCommandResult: CommandResult = {
	success: true,
	message: "Command executed successfully",
	data: {
		files: ["src/components/TestComponent.tsx"],
		directories: ["src/components"],
	},
}

export const mockCommandArguments: CommandArguments = {
	name: "TestComponent",
	type: "ui",
}

export const mockCommandOptions: CommandOptions = {
	"with-tests": true,
	"with-styles": false,
	"with-story": false,
}

export const mockArtisanCommand: ArtisanCommand = {
	name: "make:component",
	description: "Create a new React component",
	signature: "make:component <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the component",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "type",
			description: "Type of component",
			type: "string",
			default: "ui",
		},
		{
			name: "with-tests",
			description: "Include test file",
			type: "boolean",
			default: true,
		},
	],
	handler: jest.fn().mockResolvedValue(mockCommandResult),
}

export const mockMigrationFiles = [
	"20240101000000_create_users_table.ts",
	"20240101000001_create_posts_table.ts",
	"20240101000002_add_email_to_users.ts",
]

export const mockSeederFiles = ["UserSeeder.ts", "RoleSeeder.ts", "PermissionSeeder.ts"]

export const mockComponentContent = `import React from 'react'

interface TestComponentProps {
  // Add props here
}

export function TestComponent(props: TestComponentProps) {
  return (
    <div>
      <h1>TestComponent</h1>
      {/* Component content */}
    </div>
  )
}

export default TestComponent
`

export const mockServiceContent = `import { BaseService } from '../base/BaseService'
import { TestServiceRepository } from '../repositories/TestServiceRepository'

export class TestServiceService extends BaseService {
  private repository: TestServiceRepository

  constructor() {
    super()
    this.repository = new TestServiceRepository()
  }

  async create(data: CreateTestServiceData): Promise<TestService> {
    try {
      // Validate input data
      this.validateCreateData(data)
      
      // Create record
      const testService = await this.repository.create(data)
      
      return testService
    } catch (error) {
      throw new Error(\`Failed to create testService: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }

  private validateCreateData(data: CreateTestServiceData): void {
    if (!data) {
      throw new Error('Data is required')
    }
  }
}

// Types
export interface TestService {
  id: string
  createdAt: string
  updatedAt: string
}

export interface CreateTestServiceData {
  // Add create data fields here
}
`

export const mockPageContent = `export default function TestPagePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">TestPage</h1>
      <p>Welcome to the TestPage page!</p>
    </div>
  )
}
`

export const mockApiContent = `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // GET logic
    const data = {
      message: 'TestApi API endpoint',
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // POST logic
    const result = {
      id: Date.now(),
      ...body,
      createdAt: new Date().toISOString()
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    )
  }
}
`

export const mockTestContent = `import React from 'react'
import { render, screen } from '@testing-library/react'
import { TestComponent } from './TestComponent'

describe('TestComponent', () => {
  it('renders without crashing', () => {
    render(<TestComponent />)
    expect(screen.getByText('TestComponent')).toBeInTheDocument()
  })

  it('displays the component title', () => {
    render(<TestComponent />)
    const title = screen.getByRole('heading', { name: 'TestComponent' })
    expect(title).toBeInTheDocument()
  })
})
`

export const mockMigrationContent = `/**
 * Migration: create_test_table
 * Create test_table table
 */

import { Kysely, sql } from 'kysely'
import type { Database } from '../../../types/database.js'

export const CreateTestTableMigration = {
  name: 'create_test_table',
  version: '2024-01-01T00:00:00.000Z',
  
  /**
   * Run the migration
   */
  async up(db: Kysely<Database>): Promise<void> {
    await db.schema
      .createTable('test_table')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('created_at', 'text', (col) => col.notNull())
      .addColumn('updated_at', 'text', (col) => col.notNull())
      .execute()
  },

  /**
   * Rollback the migration
   */
  async down(db: Kysely<Database>): Promise<void> {
    await db.schema.dropTable('test_table').execute()
  }
}

export default CreateTestTableMigration
`

export const mockSeederContent = `/**
 * Seeder: TestSeeder
 * Seed test_table table
 */

import { Kysely } from 'kysely'
import type { Database } from '../../types/database.js'

export class TestSeeder {
  name = 'TestSeeder'
  table = 'test_table'
  
  data = [
    {
      // Add seed data here
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]

  /**
   * Run the seeder
   */
  async run(db: Kysely<Database>): Promise<void> {
    await db.insertInto('test_table').values(this.data).execute()
  }

  /**
   * Rollback the seeder
   */
  async rollback(db: Kysely<Database>): Promise<void> {
    await db.deleteFrom('test_table').execute()
  }
}

export default TestSeeder
`

export const mockEnvContent = `# Database
DATABASE_URL="./app.db"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Authentication
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
`

export const mockReadmeContent = `# test-project

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
`

export const mockGitignoreContent = `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

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
`

export const mockNextConfigContent = `/** @type {import('next').NextConfig} */
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

export const mockTsConfigContent = `{
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
}
`

export const mockTailwindConfigContent = `/** @type {import('tailwindcss').Config} */
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

export const mockGlobalCssContent = `@tailwind base;
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

export const mockLayoutContent = `import type { Metadata } from 'next'
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
`

export const mockHomePageContent = `export default function Home() {
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
`

export const mockDbConfigContent = `import { Kysely, SqliteDialect } from 'kysely'
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

export const mockDbTypesContent = `// This file is auto-generated by NOORMME
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

export const mockAuthConfigContent = `import NextAuth from 'next-auth'
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
`

export const mockMiddlewareContent = `import { auth } from '@/lib/auth'
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
`
