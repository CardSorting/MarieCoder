import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const NORMIE_RULES_TEMPLATE = `NOORMME CENTRAL RULES ORCHESTRATOR

## 🎯 Core Mission
**SPARK JOY** through clean, unified architecture. This central orchestrator coordinates all NOORMME development rules to ensure consistent application of the NORMIE DEV methodology.

## 🚀 NORMIE DEV Methodology - STRICT ENFORCEMENT

### The Three-Step Process (MANDATORY):
1. **Thank** - Acknowledge what taught us valuable lessons
2. **Let Go** - DELETE IMMEDIATELY all legacy systems and technical debt
3. **Organize** - Keep only what sparks joy with proven patterns

### MANDATORY Actions (Zero Tolerance):
- **DELETE** all legacy files immediately when creating new implementations
- **DELETE** backward compatibility layers and wrappers
- **DELETE** old service implementations and patterns
- **DELETE** complex abstractions that don't add value
- **REPLACE** with clean, unified architecture only

### FORBIDDEN Actions (Strict Prohibition):
- ❌ Maintaining legacy code "for compatibility"
- ❌ Creating wrapper services around existing tools
- ❌ Gradual migration strategies with dual systems
- ❌ Keeping old and new systems simultaneously
- ❌ Wrapping Kysely's core query building functionality
- ❌ Recreating query building logic that Kysely already provides

## 🎯 Decision Framework

### For Every Architectural Decision:
1. **Does This Spark Joy?**
   - Developer Experience: Is this delightful to work with?
   - Performance: Does this improve speed and efficiency?
   - Maintainability: Is this easy to understand and modify?
   - Simplicity: Does this reduce complexity?

2. **Can We Let Go of Legacy?**
   - Legacy Systems: Can we delete old implementations?
   - Backward Compatibility: Can we remove compatibility layers?
   - Technical Debt: Can we eliminate accumulated complexity?
   - Duplicate Code: Can we consolidate redundant implementations?

3. **How Do We Organize What Remains?**
   - Proven Patterns: Use established, battle-tested approaches
   - Clear Structure: Organize with logical, intuitive hierarchies
   - Type Safety: Ensure full TypeScript compliance
   - Documentation: Provide clear, actionable guidance

## 📊 Success Metrics
- Setup time < 5 minutes
- Learning curve < 1 hour  
- Error messages are actionable
- Documentation is clear and helpful
- < 50ms query times
- < 100ms page loads
- Minimal bundle size
- Fast development cycles

**Remember**: Software development should spark joy, not frustration. **DELETE everything that doesn't spark joy.**`

const METHODOLOGY_RULES = `## 🎯 NORMIE DEV Methodology

### "Does this spark joy?"
When building features, ask:
- Does this make developers happier?
- Does this reduce complexity?
- Does this improve the experience?
- Does this add value?

**If no, don't build it.**

### "Thank it for its service and let it go"
Acknowledge what taught us valuable lessons, then **DELETE IMMEDIATELY**:
- **Thank you, PostgreSQL complexity** → **DELETED** - Now we use SQLite with WAL mode
- **Thank you, framework abstractions** → **DELETED** - Now we use standard tools directly
- **Thank you, configuration hell** → **DELETED** - Now we use smart defaults
- **Thank you, vendor lock-in** → **DELETED** - Now we use framework-agnostic patterns
- **Thank you, legacy services** → **DELETED** - Now we use unified architecture
- **Thank you, backward compatibility** → **DELETED** - Now we use clean breaks only

### "Keep only what sparks joy"
Preserve what makes development delightful:
- ✅ **SQLite simplicity** with PostgreSQL-like capabilities
- ✅ **Next.js performance** with proven organizational patterns
- ✅ **TypeScript safety** with auto-generated types
- ✅ **Zero configuration** with intelligent defaults`

const ARCHITECTURE_RULES = `## 🏗️ Architecture Patterns

### Composition over Creation
- Use existing excellent tools (Next.js, Kysely, NextAuth, SQLite)
- Apply proven organizational patterns (Django, Laravel, Rails)
- Compose solutions instead of creating new frameworks
- Maintain flexibility and avoid lock-in

### Clean Architecture Enforcement
- **Single Source of Truth**: One service per domain
- **No Duplication**: Eliminate redundant implementations
- **Clear Interfaces**: Well-defined, type-safe APIs
- **Modern Patterns**: Use current best practices only
- **Performance First**: Optimize for speed and efficiency

### Project Structure (Django-style)
\`\`\`
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── admin/             # Admin panel
│   ├── api/               # API routes
│   └── dashboard/         # Protected dashboard
├── lib/
│   ├── db.ts              # NOORMME database instance
│   ├── services/          # Service layer
│   ├── repositories/      # Repository layer
│   └── utils/             # Utility functions
├── components/
│   ├── ui/                # Reusable UI components
│   ├── admin/             # Admin panel components
│   └── auth/              # Auth components
└── types/
    ├── database.ts        # Auto-generated types
    └── api.ts             # API types
\`\`\`

### Service Layer Pattern
\`\`\`typescript
export class UserService extends BaseService<User> {
  constructor(db: NOORMME) {
    super(db.getRepository('users'), db)
  }

  async createUser(data: CreateUserData): Promise<User> {
    const user = await this.repository.create(data)
    await this.sendWelcomeEmail(user.email)
    return user
  }
}
\`\`\``

const DATABASE_RULES = `## 📊 Database Patterns (Kysely Integration)

### Core Philosophy: "Leverage Kysely Fully"
- ✅ **Direct Access** - Expose Kysely's query builders directly
- ✅ **Type Safety** - Use Kysely's generics and type inference
- ✅ **Native Methods** - Use \`selectFrom()\`, \`insertInto()\`, \`updateTable()\`, \`deleteFrom()\`
- ❌ **Custom Wrappers** - Don't wrap Kysely's core functionality
- ❌ **Recreating Logic** - Don't rebuild what Kysely already provides

### Repository Pattern
\`\`\`typescript
// ✅ CORRECT - Direct Kysely usage
async findById(id: string): Promise<Database[T] | null> {
  const result = await this.db
    .selectFrom(this.tableName)
    .selectAll()
    .where("id" as any, "=", id)
    .executeTakeFirst()
  
  return (result as unknown as Database[T]) || null
}

// ✅ CORRECT - Transaction support
async create(data: Partial<Database[T]>): Promise<Database[T]> {
  const result = await this.db
    .insertInto(this.tableName)
    .values(createData as any)
    .returningAll()
    .executeTakeFirst()
  
  return result as unknown as Database[T]
}
\`\`\`

### Type Safety
- Use proper type assertions (\`as unknown as Database[T]\`) for complex Kysely types
- Implement comprehensive error handling with NOORMError
- Apply input validation before database operations

### SQLite Configuration
\`\`\`sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=-64000;
PRAGMA temp_store=MEMORY;
PRAGMA foreign_keys=ON;
\`\`\``

const TYPESCRIPT_RULES = `## 🔧 TypeScript Standards

### Core Philosophy
**CRITICAL**: All code must spark joy. If it doesn't, delete it and rewrite it cleanly.

### Style Guidelines
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

### TypeScript Specific
- Use strict TypeScript configuration
- **FORBIDDEN**: \`any\` types - use proper typing or delete the code
- Use interfaces for object shapes
- Use type aliases for unions and primitives
- Include JSDoc comments for all public functions and classes

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

// Usage with actionable messages
throw new NOORMError(
  "Failed to find user by ID",
  "FIND_BY_ID_ERROR",
  "Please check the ID and try again"
)
\`\`\``

const NEXTJS_RULES = `## 📱 Next.js Patterns

### App Router Structure
- Use App Router with Server Components
- Organize with Django-style folder structure
- Separate concerns: database, services, components, utilities
- Use dependency injection for loose coupling

### Server Components & Actions
\`\`\`typescript
// Server Component data fetching
export default async function DashboardPage() {
  const userRepo = db.getRepository('users')
  const users = await userRepo.findAll()
  return <UserList users={users} />
}

// Server Actions
'use server'
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

### Component Patterns
- **Container/Presenter** - Separate logic from presentation
- **Compound Components** - Related components working together
- **Render Props** - Flexible component composition
- **Custom Hooks** - Reusable stateful logic

### Authentication Integration
\`\`\`typescript
// NextAuth Configuration
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: NoormmeAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  session: { strategy: 'database' }
})
\`\`\``

const QUALITY_RULES = `## 🧪 Quality Standards

### Testing Requirements
- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: Minimum 60% coverage
- **API Tests**: Minimum 90% coverage
- **Critical Paths**: 100% coverage required

### Test Structure
\`\`\`
src/
├── __tests__/              # Test utilities and setup
│   ├── setup.ts            # Test configuration
│   ├── mocks/              # Mock implementations
│   └── fixtures/           # Test data fixtures
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx     # Component tests
└── lib/
    ├── services/
    │   ├── UserService.ts
    │   └── UserService.test.ts  # Service tests
\`\`\`

### Code Quality Metrics
- **Cyclomatic Complexity**: Maximum 10 per function
- **Function Length**: Maximum 50 lines
- **Class Length**: Maximum 300 lines
- **File Length**: Maximum 500 lines
- **Parameter Count**: Maximum 5 per function

### Before Submitting Code:
- [ ] All TypeScript errors resolved
- [ ] No \`any\` types used (except in type assertions)
- [ ] All public methods documented with JSDoc
- [ ] Error handling implemented for all operations
- [ ] Unit tests written for new functionality
- [ ] Legacy code deleted (if applicable)
- [ ] Code follows naming conventions
- [ ] No code duplication`

const LEGACY_ELIMINATION_RULES = `## 🚨 Legacy Elimination Protocol

### MANDATORY Actions:
1. **DELETE** all legacy files immediately
2. **DELETE** backward compatibility layers
3. **DELETE** old service implementations
4. **DELETE** complex abstractions
5. **REPLACE** with clean, unified architecture

### FORBIDDEN Actions:
- ❌ Maintaining legacy code "for compatibility"
- ❌ Creating wrapper services
- ❌ Gradual migration strategies
- ❌ Keeping old and new systems simultaneously

### Migration Pattern:
\`\`\`typescript
// ❌ FORBIDDEN - Legacy compatibility
export { LegacyPaymentService as PaymentService } from './LegacyPaymentService'
export { UnifiedPaymentService } from './UnifiedPaymentService'

// ✅ REQUIRED - Clean replacement
export { UnifiedPaymentService as PaymentService } from './UnifiedPaymentService'
\`\`\``

export async function getNormieRulesSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.NORMIE_RULES]?.template || NORMIE_RULES_TEMPLATE

	return new TemplateEngine().resolve(template, context, {
		METHODOLOGY_RULES,
		ARCHITECTURE_RULES,
		DATABASE_RULES,
		TYPESCRIPT_RULES,
		NEXTJS_RULES,
		QUALITY_RULES,
		LEGACY_ELIMINATION_RULES,
	})
}
