# NOORMME Architecture Patterns

## 🏗️ Core Principles

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

## 🎯 Composition over Creation

- Use existing excellent tools (Next.js, Kysely, NextAuth, SQLite)
- Apply proven organizational patterns (Django, Laravel, Rails)
- Compose solutions instead of creating new frameworks
- Maintain flexibility and avoid lock-in

## 📁 Architectural Layers

### Layer 1: Core Tools (Existing)
- **Next.js**: App Router, Server Components, Server Actions
- **Kysely**: Type-safe SQL query builder
- **NextAuth**: Authentication for Next.js
- **SQLite**: Simple, reliable database with WAL mode
- **TypeScript**: Full type safety

### Layer 2: NOORMME Automation (New)
- **Auto-Discovery**: Schema introspection and type generation
- **Repository Pattern**: Type-safe CRUD operations
- **Performance Optimization**: WAL mode, caching, index recommendations
- **CLI Tools**: Database management and project scaffolding

### Layer 3: Organizational Patterns (New)
- **Django Structure**: Organized folders, clear separation of concerns
- **Laravel Services**: Service classes, repository patterns
- **Rails Conventions**: Naming conventions, file organization
- **Next.js Patterns**: App Router, Server Components

### Layer 4: Templates (New)
- **Project Templates**: Pre-organized Next.js projects
- **Code Templates**: Common patterns and utilities
- **Configuration Templates**: Smart defaults and conventions

## 🗂️ Project Structure

### Recommended Folder Organization
```
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
```

## 🔄 Service Layer Pattern

### Service Classes
```typescript
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
```

### Repository Pattern
```typescript
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
```

## 🚀 Migration Strategy - ZERO TOLERANCE FOR LEGACY

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

### Example Migration Pattern:
```typescript
// ❌ FORBIDDEN - Legacy compatibility
export { LegacyPaymentService as PaymentService } from './LegacyPaymentService'
export { UnifiedPaymentService } from './UnifiedPaymentService'

// ✅ REQUIRED - Clean replacement
export { UnifiedPaymentService as PaymentService } from './UnifiedPaymentService'
```

**If it doesn't spark joy, thank it for its service and let it go. If it sparks joy, organize it with proven patterns.**
