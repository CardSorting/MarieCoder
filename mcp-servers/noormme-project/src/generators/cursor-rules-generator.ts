/**
 * Cursor Rules Generator for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean, comprehensive IDE rules
 */

import path from "path"
import { FileManager } from "../core/file-manager.js"
import { CursorRulesConfig, GenerationResult, TemplateFile } from "../types.js"

export class CursorRulesGenerator {
	private fileManager: FileManager
	// private templateEngine: TemplateEngine

	constructor() {
		this.fileManager = new FileManager()
		// this.templateEngine = new TemplateEngine()
	}

	/**
	 * Generate Cursor IDE rules
	 */
	async generate(config: CursorRulesConfig): Promise<GenerationResult> {
		try {
			console.log("📝 Generating Cursor IDE rules")

			// Validate configuration
			this.validateConfig(config)

			// Generate rules files
			const files: TemplateFile[] = []

			// Core architecture rules
			if (config.includeArchitecture || config.includeAllRules) {
				const archPath = this.getRulePath(config, "noormme-architecture.md")
				files.push(await this.generateArchitectureRules(config, archPath))
			}

			// Database rules
			if (config.includeDatabase || config.includeAllRules) {
				const dbPath = this.getRulePath(config, "noormme-database.md")
				files.push(await this.generateDatabaseRules(config, dbPath))
			}

			// Coding style rules
			if (config.includeCodingStyle || config.includeAllRules) {
				const stylePath = this.getRulePath(config, "noormme-coding-style.md")
				files.push(await this.generateCodingStyleRules(config, stylePath))
			}

			// Kysely integration rules
			if (config.includeKyselyIntegration || config.includeAllRules) {
				const kyselyPath = this.getRulePath(config, "noormme-kysely-integration.md")
				files.push(await this.generateKyselyRules(config, kyselyPath))
			}

			// Next.js patterns rules
			if (config.includeNextjsPatterns || config.includeAllRules) {
				const nextjsPath = this.getRulePath(config, "noormme-nextjs-patterns.md")
				files.push(await this.generateNextjsRules(config, nextjsPath))
			}

			// Custom rules
			if (config.customRules && config.customRules.length > 0) {
				const customPath = this.getRulePath(config, "custom-rules.md")
				files.push(await this.generateCustomRules(config, customPath))
			}

			// Write files
			await this.fileManager.writeFiles(files)

			console.log("✅ Cursor IDE rules generated successfully")

			return {
				success: true,
				message: "Cursor IDE rules generated successfully",
				files: files.map((f) => f.path),
			}
		} catch (error) {
			console.error("❌ Cursor rules generation failed:", error)
			return {
				success: false,
				message: `Cursor rules generation failed: ${error instanceof Error ? error.message : String(error)}`,
				files: [],
				errors: [error instanceof Error ? error.message : String(error)],
			}
		}
	}

	/**
	 * Validate configuration
	 */
	private validateConfig(config: CursorRulesConfig): void {
		if (!config.projectPath || typeof config.projectPath !== "string") {
			throw new Error("Project path is required and must be a string")
		}

		if (config.customRules && !Array.isArray(config.customRules)) {
			throw new Error("Custom rules must be an array of strings")
		}
	}

	/**
	 * Get rule file path
	 */
	private getRulePath(config: CursorRulesConfig, fileName: string): string {
		return path.join(config.projectPath, ".cursor", "rules", fileName)
	}

	/**
	 * Generate architecture rules
	 */
	private async generateArchitectureRules(_config: CursorRulesConfig, filePath: string): Promise<TemplateFile> {
		const content = `# NOORMME Architecture Guidelines

## Core Principles

### NORMIE DEV Methodology - STRICT ENFORCEMENT
**CRITICAL**: This methodology is MANDATORY for all architectural decisions. No exceptions.

#### The Three-Step Process:
1. **Thank** - Acknowledge what taught us valuable lessons
2. **Let Go** - Eliminate ALL legacy systems, backward compatibility, and technical debt
3. **Organize** - Keep only what sparks joy with proven patterns

#### What We Thank and Let Go:
- ❌ **Legacy Services** - Delete old implementations completely
- ❌ **Backward Compatibility** - No legacy wrappers or compatibility layers
- ❌ **Technical Debt** - Remove all accumulated complexity
- ❌ **Duplicate Code** - Eliminate redundant implementations
- ❌ **Complex Abstractions** - Remove unnecessary layers
- ❌ **Legacy Patterns** - Abandon outdated architectural approaches

#### What We Keep (Sparks Joy):
- ✅ **Clean, Unified Services** - Single responsibility, clear interfaces
- ✅ **Modern Patterns** - Current best practices only
- ✅ **Type Safety** - Full TypeScript compliance
- ✅ **Performance** - Optimized, efficient implementations
- ✅ **Maintainability** - Easy to understand and modify
- ✅ **Developer Experience** - Delightful to work with

### Composition over Creation
- Use existing excellent tools (Next.js, Kysely, NextAuth, SQLite)
- Apply proven organizational patterns (Django, Laravel, Rails)
- Compose solutions instead of creating new frameworks
- Maintain flexibility and avoid lock-in

## Architectural Layers

### Layer 1: Core Tools (Existing)
- Next.js: App Router, Server Components, Server Actions
- Kysely: Type-safe SQL query builder
- NextAuth: Authentication for Next.js
- SQLite: Simple, reliable database with WAL mode
- TypeScript: Full type safety

### Layer 2: NOORMME Automation (New)
- Auto-Discovery: Schema introspection and type generation
- Repository Pattern: Type-safe CRUD operations
- Performance Optimization: WAL mode, caching, index recommendations
- CLI Tools: Database management and project scaffolding

### Layer 3: Organizational Patterns (New)
- Django Structure: Organized folders, clear separation of concerns
- Laravel Services: Service classes, repository patterns
- Rails Conventions: Naming conventions, file organization
- Next.js Patterns: App Router, Server Components

### Layer 4: Templates (New)
- Project Templates: Pre-organized Next.js projects
- Code Templates: Common patterns and utilities
- Configuration Templates: Smart defaults and conventions

## Migration Strategy - ZERO TOLERANCE FOR LEGACY

### When Refactoring Systems:
1. **DELETE** all legacy files immediately
2. **REPLACE** with clean, unified implementations
3. **NO** backward compatibility wrappers
4. **NO** legacy service exports
5. **NO** gradual migration - complete replacement only

### Enforcement Rules:
- **MANDATORY**: Delete legacy files when creating new implementations
- **FORBIDDEN**: Creating compatibility layers or wrappers
- **REQUIRED**: Update all imports to use new services immediately
- **PROHIBITED**: Maintaining old and new systems simultaneously

## Implementation Guidelines

### Modular Architecture
- Organize code into distinct modules within \`src/\` directory
- Separate concerns: database, services, components, utilities
- Use dependency injection for loose coupling
- Ensure all modules are stateless and pure functions where possible

### Service Layer Pattern
- Encapsulate business logic in service classes
- Use repository pattern for data access
- Implement middleware for cross-cutting concerns
- Follow single responsibility principle

### Error Handling
- Use standardized error types with actionable messages
- Implement error recovery mechanisms
- Provide comprehensive error documentation
- Handle errors gracefully with user-friendly messages

### Clean Architecture Enforcement
- **Single Source of Truth**: One service per domain
- **No Duplication**: Eliminate redundant implementations
- **Clear Interfaces**: Well-defined, type-safe APIs
- **Modern Patterns**: Use current best practices only
- **Performance First**: Optimize for speed and efficiency

## Decision Framework - NORMIE DEV Questions

### For Every Architectural Decision, Ask:

#### 1. Does This Spark Joy?
- **Developer Experience**: Is this delightful to work with?
- **Performance**: Does this improve speed and efficiency?
- **Maintainability**: Is this easy to understand and modify?
- **Simplicity**: Does this reduce complexity?

#### 2. Can We Let Go of Legacy?
- **Legacy Systems**: Can we delete old implementations?
- **Backward Compatibility**: Can we remove compatibility layers?
- **Technical Debt**: Can we eliminate accumulated complexity?
- **Duplicate Code**: Can we consolidate redundant implementations?

#### 3. How Do We Organize What Remains?
- **Proven Patterns**: Use established, battle-tested approaches
- **Clear Structure**: Organize with logical, intuitive hierarchies
- **Type Safety**: Ensure full TypeScript compliance
- **Documentation**: Provide clear, actionable guidance

### Final Rule:
**If it doesn't spark joy, thank it for its service and let it go. If it sparks joy, organize it with proven patterns.**`

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Generate database rules
	 */
	private async generateDatabaseRules(_config: CursorRulesConfig, filePath: string): Promise<TemplateFile> {
		const content = `# NOORMME Database Guidelines

## NORMIE DEV Principle
**CRITICAL**: Database code must spark joy. Delete legacy patterns, keep only what works beautifully with Kysely's full capabilities.

## Kysely Integration Strategy

### Core Philosophy
**LEVERAGE KYSELY FULLY** - Don't recreate query building, use Kysely's native capabilities:
- ✅ **Direct Kysely Access** - Expose Kysely's query builders directly
- ✅ **Type Safety** - Use Kysely's generics and type inference
- ✅ **Native Methods** - Use \`selectFrom()\`, \`insertInto()\`, \`updateTable()\`, \`deleteFrom()\`
- ❌ **Custom Wrappers** - Don't wrap Kysely's core functionality
- ❌ **Recreating Logic** - Don't rebuild what Kysely already provides

## Repository Pattern with Kysely

### Base Repository - Leveraging Kysely Fully
\`\`\`typescript
export abstract class BaseRepository<T extends keyof Database> {
  protected tableName: T
  protected db: Kysely<Database>

  // ✅ CORRECT - Direct Kysely usage with proper error handling
  async findById(id: string): Promise<Database[T] | null> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new ValidationError("Valid ID is required", "Please provide a valid record ID")
      }

      let query = this.db
        .selectFrom(this.tableName)
        .selectAll()
        .where("id" as any, "=", id)

      const result = await query.executeTakeFirst()
      return (result as unknown as Database[T]) || null
    } catch (error) {
      if (error instanceof NOORMError) {
        throw error
      }
      throw new NOORMError(
        \`Failed to find \${String(this.tableName)} by ID: \${error instanceof Error ? error.message : "Unknown error"}\`,
        "FIND_BY_ID_ERROR",
        "Please check the ID and try again"
      )
    }
  }
}
\`\`\`

## Type Safety with Kysely

### Proper Type Assertions
\`\`\`typescript
// ✅ CORRECT - Use proper type assertions for Kysely's complex types
const result = await this.db
  .selectFrom(this.tableName)
  .selectAll()
  .where("id" as any, "=", id)
  .executeTakeFirst()

return (result as unknown as Database[T]) || null

// ✅ CORRECT - For raw SQL queries
await this.db.executeQuery({
  sql: \`SELECT * FROM users WHERE email = ?\`,
  parameters: [email]
} as any)
\`\`\`

## Error Handling Integration

### NOORMError Integration
\`\`\`typescript
// ✅ CORRECT - Comprehensive error handling
try {
  const result = await this.db
    .selectFrom(this.tableName)
    .selectAll()
    .where("id" as any, "=", id)
    .executeTakeFirst()

  if (!result) {
    throw new NotFoundError(
      \`\${String(this.tableName)} record not found\`,
      "Please check the ID and try again"
    )
  }

  return result as unknown as Database[T]
} catch (error) {
  if (error instanceof NOORMError) {
    throw error
  }
  throw new NOORMError(
    \`Failed to find \${String(this.tableName)}: \${error instanceof Error ? error.message : "Unknown error"}\`,
    "FIND_ERROR",
    "Please check your parameters and try again"
  )
}
\`\`\`

## SQLite Configuration

### WAL Mode Setup
\`\`\`sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=-64000;
PRAGMA temp_store=MEMORY;
PRAGMA foreign_keys=ON;
\`\`\`

## Developer Guidelines

### DO's ✅
- Use Kysely's query builders directly (\`selectFrom\`, \`insertInto\`, \`updateTable\`, \`deleteFrom\`)
- Leverage Kysely's transaction system for atomic operations
- Use proper type assertions (\`as unknown as Database[T]\`) for complex Kysely types
- Implement comprehensive error handling with NOORMError
- Apply input validation before database operations
- Use Kysely's type inference and generics

### DON'Ts ❌
- Don't wrap Kysely's core query building functionality
- Don't recreate query building logic that Kysely already provides
- Don't use \`any\` types without proper type assertions
- Don't ignore error handling in database operations
- Don't bypass Kysely's transaction system for multi-step operations
- Don't use legacy database patterns or old query builders
- Don't mix different database access patterns in the same codebase`

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Generate coding style rules
	 */
	private async generateCodingStyleRules(_config: CursorRulesConfig, filePath: string): Promise<TemplateFile> {
		const content = `# NOORMME Coding Style Guidelines

## NORMIE DEV Principle
**CRITICAL**: All code must spark joy. If it doesn't, delete it and rewrite it cleanly.

## General Style

### Indentation and Formatting
- Use 2 spaces for indentation (no tabs)
- Use single quotes for strings
- Use trailing commas in objects and arrays
- Limit line length to 100 characters
- Use semicolons consistently

### Naming Conventions
- **Variables and Functions**: camelCase (\`userName\`, \`getUserById\`)
- **Classes**: PascalCase (\`UserService\`, \`DatabaseConnection\`)
- **Constants**: UPPER_SNAKE_CASE (\`MAX_RETRY_COUNT\`, \`DATABASE_URL\`)
- **Interfaces**: PascalCase with descriptive names (\`UserData\`, \`DatabaseConfig\`)
- **Types**: PascalCase (\`UserStatus\`, \`QueryResult\`)

### TypeScript Specific
- Use strict TypeScript configuration
- **FORBIDDEN**: \`any\` types - use proper typing or delete the code
- Use interfaces for object shapes
- Use type aliases for unions and primitives
- Include JSDoc comments for all public functions and classes
- **MANDATORY**: Delete legacy type definitions when creating new ones

## NOORMME-Specific Conventions

### Database Operations
\`\`\`typescript
// Repository pattern
const userRepo = db.getRepository('users')
const user = await userRepo.findById(id)

// Kysely queries
const kysely = db.getKysely()
const result = await kysely
  .selectFrom('users')
  .where('status', '=', 'active')
  .execute()
\`\`\`

### Service Classes
\`\`\`typescript
export class UserService extends BaseService<User> {
  constructor(db: NOORMME) {
    super(db.getRepository('users'), db)
  }

  async createUser(data: CreateUserData): Promise<User> {
    // Business logic here
    const user = await this.repository.create(data)
    return user
  }
}
\`\`\`

### Error Handling
\`\`\`typescript
export class NOORMError extends Error {
  constructor(
    message: string,
    public code: string,
    public actionable?: string
  ) {
    super(message)
  }
}
\`\`\`

### Documentation
- Include JSDoc comments for all public APIs
- Document complex business logic
- Provide usage examples in comments
- Keep documentation up-to-date with code changes

## Legacy Code Elimination
- **MANDATORY**: Delete old implementations when creating new ones
- **FORBIDDEN**: Maintaining multiple versions of the same functionality
- **REQUIRED**: Update all imports to use new services immediately
- **PROHIBITED**: Backward compatibility wrappers or legacy exports`

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Generate Kysely integration rules
	 */
	private async generateKyselyRules(_config: CursorRulesConfig, filePath: string): Promise<TemplateFile> {
		const content = `# Kysely Integration Guide

## Core Philosophy

### "Leverage Kysely Fully"
**CRITICAL**: Don't recreate query building - use Kysely's native capabilities:
- ✅ **Direct Access** - Expose Kysely's query builders directly
- ✅ **Type Safety** - Use Kysely's generics and type inference
- ✅ **Native Methods** - Use \`selectFrom()\`, \`insertInto()\`, \`updateTable()\`, \`deleteFrom()\`
- ❌ **Custom Wrappers** - Don't wrap Kysely's core functionality
- ❌ **Recreating Logic** - Don't rebuild what Kysely already provides

## Database Connection Pattern

### ✅ CORRECT - Direct Kysely Integration
\`\`\`typescript
import { Kysely } from 'kysely'
import { Database } from '@/types/database'

export class DatabaseConnection {
  private db: Kysely<Database>
  
  constructor() {
    this.db = new Kysely<Database>({
      dialect: 'sqlite',
      database: './app.db'
    })
  }
  
  getKysely(): Kysely<Database> {
    return this.db
  }
  
  // Expose Kysely's query builders directly
  selectFrom<T extends keyof Database>(table: T) {
    return this.db.selectFrom(table)
  }
  
  insertInto<T extends keyof Database>(table: T) {
    return this.db.insertInto(table)
  }
  
  updateTable<T extends keyof Database>(table: T) {
    return this.db.updateTable(table)
  }
  
  deleteFrom<T extends keyof Database>(table: T) {
    return this.db.deleteFrom(table)
  }
}
\`\`\`

## Best Practices

### DO's ✅
- Use Kysely's query builders directly (\`selectFrom\`, \`insertInto\`, \`updateTable\`, \`deleteFrom\`)
- Leverage Kysely's transaction system for atomic operations
- Use proper type assertions (\`as unknown as Database[T]\`) for complex Kysely types
- Implement comprehensive error handling with NOORMError
- Use caching integration with QueryCache
- Apply input validation before database operations
- Use Kysely's type inference and generics
- Expose Kysely's native methods directly
- Build helper methods on top of Kysely, not instead of it

### DON'Ts ❌
- Don't wrap Kysely's core query building functionality
- Don't recreate query building logic that Kysely already provides
- Don't use \`any\` types without proper type assertions
- Don't ignore error handling in database operations
- Don't bypass Kysely's transaction system for multi-step operations
- Don't use legacy database patterns or old query builders
- Don't mix different database access patterns in the same codebase
- Don't create custom query builders that duplicate Kysely's functionality
- Don't use overly broad type assertions that lose type safety

## Common Patterns

### Direct Kysely Usage
\`\`\`typescript
// ✅ CORRECT - Direct Kysely usage
const users = await db
  .selectFrom('users')
  .selectAll()
  .where('status', '=', 'active')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .execute()
\`\`\`

### Repository with Kysely
\`\`\`typescript
// ✅ CORRECT - Repository leveraging Kysely
export class UserRepository extends BaseRepository<'users'> {
  async findByEmail(email: string): Promise<Database['users'] | null> {
    return await this.findOneBy({ email: email.toLowerCase() })
  }
  
  async findActiveUsers(limit: number = 100): Promise<Database['users'][]> {
    return await this.findBy({ status: 'active' }, { 
      limit, 
      orderBy: 'createdAt', 
      orderDirection: 'desc' 
    })
  }
}
\`\`\``

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Generate Next.js patterns rules
	 */
	private async generateNextjsRules(_config: CursorRulesConfig, filePath: string): Promise<TemplateFile> {
		const content = `# NOORMME Next.js Patterns

## Marie Kondo Principle
**CRITICAL**: Next.js code must spark joy. Delete legacy patterns, use only clean, modern approaches.

## App Router Structure

### Folder Organization (Django-style)
\`\`\`
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   │   ├── signin/        # Sign-in page
│   │   ├── signup/        # Sign-up page
│   │   └── layout.tsx     # Auth layout
│   ├── admin/             # Admin panel
│   │   ├── users/         # User management
│   │   ├── dashboard/     # Admin dashboard
│   │   └── layout.tsx     # Admin layout
│   ├── api/               # API routes
│   │   ├── auth/          # Auth API routes
│   │   └── admin/         # Admin API routes
│   ├── dashboard/         # Protected dashboard
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # Client providers
├── lib/
│   ├── db.ts              # NOORMME database instance
│   ├── auth.ts            # NextAuth configuration
│   ├── services/          # Service layer
│   ├── repositories/      # Repository layer
│   ├── middleware/        # Middleware layer
│   └── utils/             # Utility functions
├── components/
│   ├── ui/                # Reusable UI components
│   ├── admin/             # Admin panel components
│   └── auth/              # Auth components
└── types/
    ├── database.ts        # Auto-generated types
    └── api.ts             # API types
\`\`\`

## Server Components

### Data Fetching
\`\`\`typescript
// app/dashboard/page.tsx
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  const userRepo = db.getRepository('users')
  const users = await userRepo.findAll()

  return (
    <div>
      <h1>Dashboard</h1>
      <UserList users={users} />
    </div>
  )
}
\`\`\`

### Server Actions
\`\`\`typescript
// app/admin/users/actions.ts
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createUser(formData: FormData) {
  const userRepo = db.getRepository('users')
  
  const user = await userRepo.create({
    name: formData.get('name') as string,
    email: formData.get('email') as string
  })

  revalidatePath('/admin/users')
  return user
}
\`\`\`

## Authentication Integration

### NextAuth Configuration
\`\`\`typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import { NoormmeAdapter } from 'noormme/adapters/nextauth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: NoormmeAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    })
  ],
  session: { strategy: 'database' }
})
\`\`\`

### Protected Routes
\`\`\`typescript
// middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }
})
\`\`\`

## Service Layer Integration

### Laravel-style Services
\`\`\`typescript
// lib/services/user.service.ts
export class UserService extends BaseService<User> {
  constructor(db: NOORMME) {
    super(db.getRepository('users'), db)
  }

  async createUser(data: CreateUserData): Promise<User> {
    // Business logic here
    const user = await this.repository.create(data)
    
    // Additional processing
    await this.sendWelcomeEmail(user.email)
    
    return user
  }
}
\`\`\`

## Legacy Pattern Elimination
- **MANDATORY**: Delete old Next.js patterns (Pages Router, getServerSideProps, etc.)
- **FORBIDDEN**: Mixing App Router with Pages Router
- **REQUIRED**: Use only App Router with Server Components
- **PROHIBITED**: Legacy data fetching patterns or old authentication approaches`

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Generate custom rules
	 */
	private async generateCustomRules(config: CursorRulesConfig, filePath: string): Promise<TemplateFile> {
		const content = `# Custom Rules

## Project-Specific Guidelines

${config.customRules?.map((rule, index) => `${index + 1}. ${rule}`).join("\n") || "No custom rules provided."}

## Additional Notes

These rules are specific to this project and should be followed in addition to the standard NOORMME guidelines.

### Implementation Notes
- Always consider the NORMIE DEV methodology when implementing these rules
- If a rule conflicts with core NOORMME principles, prioritize NOORMME guidelines
- Review and update these rules regularly as the project evolves

### Enforcement
- These rules should be enforced through code reviews
- Consider adding automated checks where possible
- Document any exceptions or deviations from these rules`

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}
}
