# NOORMME NORMIE DEV Methodology - Centralized Rule Architecture

## 🎯 **Overview**

This directory contains a **centralized but supporting module architecture** for cursor rules that enforce the NORMIE DEV methodology for NOORMME development. The rules are organized using the same modular approach applied to the MCP servers and template engine.

## 🏗️ **Rule Architecture**

### Central Orchestrator
- **`core-rules.mdc`** - Main coordinator that delegates to specialized rule modules
- **`rule-registry.mdc`** - Central registry coordinating all rule modules

### Supporting Rule Modules
- **`methodology/`** - NORMIE DEV core principles and philosophy
- **`architecture/`** - System architecture and design patterns  
- **`database/`** - Database patterns and Kysely integration
- **`coding/`** - Code style and TypeScript standards
- **`frameworks/`** - Next.js and React patterns
- **`quality/`** - Testing, validation, and quality gates

## 📁 **Rule Module Structure**

### Core Orchestrator
- **`core-rules.mdc`** - Central rule orchestrator (Priority: 1)
  - Coordinates all rule modules
  - Enforces NORMIE DEV methodology
  - Provides decision framework

### Methodology Rules
- **`methodology/normie-dev.mdc`** - Core philosophy and principles (Priority: 1)
  - NORMIE DEV methodology enforcement
  - Legacy elimination protocols
  - Decision framework

### Architecture Rules
- **`architecture/patterns.mdc`** - System architecture patterns (Priority: 2)
  - Clean architecture principles
  - Service layer patterns
  - Component organization

### Database Rules
- **`database/kysely-integration.mdc`** - Database and Kysely patterns (Priority: 3)
  - Kysely integration best practices
  - Repository patterns
  - Type-safe database operations

### Coding Rules
- **`coding/typescript-standards.mdc`** - TypeScript coding standards (Priority: 4)
  - Code style and conventions
  - Type safety requirements
  - Documentation standards

### Framework Rules
- **`frameworks/nextjs-patterns.mdc`** - Next.js and React patterns (Priority: 5)
  - App Router patterns
  - Component architecture
  - Performance optimization

### Quality Rules
- **`quality/testing-validation.mdc`** - Testing and quality standards (Priority: 6)
  - Testing patterns and requirements
  - Code coverage standards
  - Quality gates

## How It Works

### Automatic Application
These rules are automatically applied by AI coding assistants when working on NOORMME projects. The rules ensure:

1. **All legacy code is deleted** immediately when creating new implementations
2. **No backward compatibility layers** are created
3. **Clean, unified architecture** is maintained
4. **Only code that "sparks joy"** is preserved

### Key Principles

#### NORMIE DEV Methodology - STRICT ENFORCEMENT
**CRITICAL**: This methodology is MANDATORY for all architectural decisions. No exceptions.

#### The Three-Step Process:
1. **Thank** - Acknowledge what taught us valuable lessons
2. **Let Go** - Eliminate ALL legacy systems, backward compatibility, and technical debt
3. **Organize** - Keep only what sparks joy with proven patterns

#### What We Delete (Let Go):
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
- ✅ **Kysely Integration** - Leverage Kysely's native capabilities fully

## Enforcement Rules

### MANDATORY Actions:
- **DELETE** all legacy files immediately
- **DELETE** backward compatibility layers
- **DELETE** old service implementations
- **DELETE** complex abstractions
- **REPLACE** with clean, unified architecture

### FORBIDDEN Actions:
- ❌ Maintaining legacy code "for compatibility"
- ❌ Creating wrapper services
- ❌ Gradual migration strategies
- ❌ Keeping old and new systems simultaneously
- ❌ Wrapping Kysely's core query building functionality
- ❌ Recreating query building logic that Kysely already provides

## Kysely Integration Principles

### Core Philosophy
**LEVERAGE KYSELY FULLY** - Don't recreate query building, use Kysely's native capabilities:

#### ✅ DO's:
- **Direct Access** - Expose Kysely's query builders directly (`selectFrom`, `insertInto`, `updateTable`, `deleteFrom`)
- **Type Safety** - Use Kysely's generics and type inference with proper assertions
- **Native Methods** - Use Kysely's built-in functionality without wrapping
- **Transaction Support** - Leverage Kysely's transaction system for atomic operations
- **Error Handling** - Integrate NOORMError with Kysely operations

#### ❌ DON'Ts:
- **Custom Wrappers** - Don't wrap Kysely's core functionality
- **Recreating Logic** - Don't rebuild what Kysely already provides
- **Legacy Patterns** - Don't use old query builders or database patterns
- **Type Bypassing** - Don't use `any` without proper type assertions

### Integration Strategy
```typescript
// ✅ CORRECT - Direct Kysely usage
const users = await db
  .selectFrom('users')
  .selectAll()
  .where('status', '=', 'active')
  .orderBy('createdAt', 'desc')
  .execute()

// ✅ CORRECT - Repository leveraging Kysely
export class UserRepository extends BaseRepository<'users'> {
  async findByEmail(email: string): Promise<Database['users'] | null> {
    return await this.findOneBy({ email: email.toLowerCase() })
  }
}

// ❌ WRONG - Wrapping Kysely unnecessarily
export class CustomQueryBuilder {
  async customSelect(table: string, where: any) {
    return this.db.selectFrom(table).where(where).execute()
  }
}
```

## Decision Framework

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

## Success Metrics

### Developer Joy
- Setup time < 5 minutes
- Learning curve < 1 hour
- Error messages are actionable
- Documentation is clear and helpful

### Simplicity
- Zero configuration required
- Smart defaults everywhere
- No vendor lock-in
- Standard tools and patterns

### Performance
- < 50ms query times
- < 100ms page loads
- Minimal bundle size
- Fast development cycles

## Conclusion

The NORMIE DEV methodology ensures NOORMME:
- **DELETES complexity** that doesn't add value
- **DELETES legacy systems** completely
- **DELETES backward compatibility** entirely
- **KEEPS only what sparks joy** - clean, unified architecture
- **ORGANIZES what remains** with proven patterns

**Remember**: Software development should spark joy, not frustration. **DELETE everything that doesn't spark joy.**

## Usage

These rules are automatically applied by AI coding assistants. When working on NOORMME projects, the AI will:

1. **Automatically delete** legacy code when creating new implementations
2. **Refuse to create** backward compatibility layers
3. **Enforce clean architecture** patterns
4. **Maintain unified services** with single responsibility
5. **Apply proven patterns** from established frameworks

The rules ensure that all code changes contribute to a clean, maintainable, and joyful development experience.
