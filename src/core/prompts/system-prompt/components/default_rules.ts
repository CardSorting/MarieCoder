import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const DEFAULT_RULES_TEMPLATE_TEXT = `DEFAULT DEVELOPMENT GUIDELINES

The following guidelines are built into Cline and represent best practices for modern development. These rules should be followed unless explicitly overridden by user-specific rules.

{{DEFAULT_RULES}}`

// Built-in NOORMME development rules
const BUILT_IN_RULES = `# NOORMME Development Guidelines

## NORMIE DEV Methodology - CORE PRINCIPLE

### "Does this spark joy?"
When building features, ask:
- Does this make developers happier?
- Does this reduce complexity?
- Does this improve the experience?
- Does this add value?

If no, don't build it.

### "Thank it for its service and let it go"
Acknowledge what taught us valuable lessons, then **DELETE IMMEDIATELY**:
- ❌ **Legacy Services** - Delete old implementations completely
- ❌ **Backward Compatibility** - No legacy wrappers or compatibility layers
- ❌ **Technical Debt** - Remove all accumulated complexity
- ❌ **Duplicate Code** - Eliminate redundant implementations
- ❌ **Complex Abstractions** - Remove unnecessary layers

### "Keep only what sparks joy"
Preserve what makes development delightful:
- ✅ **Clean, Unified Services** - Single responsibility, clear interfaces
- ✅ **Modern Patterns** - Current best practices only
- ✅ **Type Safety** - Full TypeScript compliance
- ✅ **Performance** - Optimized, efficient implementations
- ✅ **Developer Experience** - Delightful to work with

## Architecture Guidelines

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

## Database Patterns (Kysely Integration)

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
\`\`\`

### Type Safety
- Use proper type assertions (\`as unknown as Database[T]\`) for complex Kysely types
- Implement comprehensive error handling with NOORMError
- Apply input validation before database operations

## Next.js Patterns

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

## Coding Style Guidelines

### TypeScript Standards
- Use strict TypeScript configuration
- **FORBIDDEN**: \`any\` types - use proper typing or delete the code
- Use interfaces for object shapes
- Use type aliases for unions and primitives
- Include JSDoc comments for all public functions and classes

### Naming Conventions
- **Variables and Functions**: camelCase (\`userName\`, \`getUserById\`)
- **Classes**: PascalCase (\`UserService\`, \`DatabaseConnection\`)
- **Constants**: UPPER_SNAKE_CASE (\`MAX_RETRY_COUNT\`, \`DATABASE_URL\`)
- **Interfaces**: PascalCase with descriptive names (\`UserData\`, \`DatabaseConfig\`)

### Formatting
- Use 2 spaces for indentation (no tabs)
- Use single quotes for strings
- Use trailing commas in objects and arrays
- Limit line length to 100 characters
- Use semicolons consistently

## Error Handling

### NOORMError Pattern
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
\`\`\`

## Legacy Elimination Protocol

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

## Decision Framework

### For Every Feature - MANDATORY QUESTIONS
1. **Does this spark joy?** (Improves developer experience)
2. **Can we DELETE legacy code?** (Eliminate old implementations)
3. **Does this add value?** (Solve real problems)
4. **Can we compose this?** (Use existing tools)

**Remember**: Software development should spark joy, not frustration. **DELETE everything that doesn't spark joy.**`

export async function getDefaultRulesSection(variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	// Only include default rules if no user rules are present AND no NORMIE_RULES are being used
	// This ensures user rules and NORMIE_RULES take precedence over built-in rules
	const hasUserRules = !!(
		context.globalClineRulesFileInstructions ||
		context.localClineRulesFileInstructions ||
		context.localCursorRulesFileInstructions ||
		context.localCursorRulesDirInstructions ||
		context.localWindsurfRulesFileInstructions
	)

	const hasNormieRules = variant.componentOrder.includes(SystemPromptSection.NORMIE_RULES)

	if (hasUserRules || hasNormieRules) {
		return undefined
	}

	const template = variant.componentOverrides?.[SystemPromptSection.DEFAULT_RULES]?.template || DEFAULT_RULES_TEMPLATE_TEXT

	return new TemplateEngine().resolve(template, context, {
		DEFAULT_RULES: BUILT_IN_RULES,
	})
}
