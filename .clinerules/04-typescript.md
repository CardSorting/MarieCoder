# NOORMME TypeScript Standards

## 🎯 Core Philosophy

### NORMIE DEV Principle
**CRITICAL**: All code must spark joy. If it doesn't, delete it and rewrite it cleanly.

## 📝 General Style

### Indentation and Formatting
- Use 2 spaces for indentation (no tabs)
- Use single quotes for strings
- Use trailing commas in objects and arrays
- Limit line length to 100 characters
- Use semicolons consistently

### Naming Conventions
- **Variables and Functions**: camelCase (`userName`, `getUserById`)
- **Classes**: PascalCase (`UserService`, `DatabaseConnection`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`, `DATABASE_URL`)
- **Interfaces**: PascalCase with descriptive names (`UserData`, `DatabaseConfig`)
- **Types**: PascalCase (`UserStatus`, `QueryResult`)

### TypeScript Specific
- Use strict TypeScript configuration
- **FORBIDDEN**: `any` types - use proper typing or delete the code
- Use interfaces for object shapes
- Use type aliases for unions and primitives
- Include JSDoc comments for all public functions and classes
- **MANDATORY**: Delete legacy type definitions when creating new ones

## 🏗️ NOORMME-Specific Conventions

### Database Operations
```typescript
// Repository pattern
const userRepo = db.getRepository('users')
const user = await userRepo.findById(id)

// Kysely queries
const kysely = db.getKysely()
const result = await kysely
  .selectFrom('users')
  .where('status', '=', 'active')
  .execute()
```

### Service Classes
```typescript
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
```

### Error Handling
```typescript
export class NOORMError extends Error {
  constructor(
    message: string,
    public code: string,
    public actionable?: string
  ) {
    super(message)
  }
}
```

### Documentation
- Include JSDoc comments for all public APIs
- Document complex business logic
- Provide usage examples in comments
- Keep documentation up-to-date with code changes

## 🚨 Legacy Code Elimination

### MANDATORY Actions:
- **DELETE** old implementations when creating new ones
- **FORBIDDEN**: Maintaining multiple versions of the same functionality
- **REQUIRED**: Update all imports to use new services immediately
- **PROHIBITED**: Backward compatibility wrappers or legacy exports

### Type Definition Cleanup
```typescript
// ❌ FORBIDDEN - Legacy type compatibility
export { LegacyUserType as UserType } from './LegacyTypes'
export { ModernUserType } from './ModernTypes'

// ✅ REQUIRED - Clean type replacement
export { ModernUserType as UserType } from './ModernTypes'
```

## 🎨 Code Organization

### File Structure
```typescript
// 1. Imports (external libraries first)
import { Kysely } from 'kysely'
import { NextRequest } from 'next/server'

// 2. Internal imports
import { Database } from '@/types/database'
import { UserService } from '@/lib/services/UserService'

// 3. Type definitions
interface UserCreateData {
  email: string
  name: string
}

// 4. Constants
const MAX_RETRY_COUNT = 3
const DEFAULT_PAGE_SIZE = 20

// 5. Main implementation
export class UserController {
  // Constructor first
  constructor(private userService: UserService) {}

  // Public methods
  async createUser(data: UserCreateData): Promise<User> {
    // Implementation
  }

  // Private methods
  private validateUserData(data: UserCreateData): void {
    // Validation logic
  }
}
```

### Class Organization
```typescript
export class ExampleService {
  // 1. Static properties
  private static readonly DEFAULT_TIMEOUT = 5000

  // 2. Instance properties
  private readonly config: ServiceConfig
  private cache: Map<string, any> = new Map()

  // 3. Constructor
  constructor(config: ServiceConfig) {
    this.config = config
  }

  // 4. Public methods (alphabetical)
  async createItem(data: CreateData): Promise<Item> {}
  async deleteItem(id: string): Promise<boolean> {}
  async getItem(id: string): Promise<Item | null> {}
  async updateItem(id: string, data: UpdateData): Promise<Item> {}

  // 5. Private methods (alphabetical)
  private validateData(data: any): void {}
  private processItem(item: Item): ProcessedItem {}
}
```

## 🔧 Type Safety Standards

### Strict Type Checking
```typescript
// ✅ CORRECT - Proper typing
interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

// ✅ CORRECT - Generic constraints
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>
  create(data: Omit<T, 'id'>): Promise<T>
}

// ✅ CORRECT - Union types
type UserStatus = 'active' | 'inactive' | 'suspended'
```

### Type Assertions
```typescript
// ✅ CORRECT - Safe type assertions
const result = await query.executeTakeFirst()
return (result as unknown as Database['users']) || null

// ✅ CORRECT - Type guards
function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string'
}

// ❌ FORBIDDEN - Unsafe any usage
const result: any = await query.execute()
return result.data // This loses type safety
```

## 📊 Error Handling Standards

### Custom Error Classes
```typescript
export class ValidationError extends NOORMError {
  constructor(message: string, actionable?: string) {
    super(message, 'VALIDATION_ERROR', actionable)
  }
}

export class NotFoundError extends NOORMError {
  constructor(resource: string, actionable?: string) {
    super(`${resource} not found`, 'NOT_FOUND', actionable)
  }
}

export class DatabaseError extends NOORMError {
  constructor(operation: string, originalError: Error) {
    super(`Database ${operation} failed: ${originalError.message}`, 'DATABASE_ERROR', 'Please try again')
  }
}
```

### Error Handling Patterns
```typescript
// ✅ CORRECT - Comprehensive error handling
async function createUser(data: CreateUserData): Promise<User> {
  try {
    // Validate input
    if (!data.email || !data.name) {
      throw new ValidationError('Email and name are required', 'Please provide valid user data')
    }

    // Business logic
    const user = await this.userRepository.create(data)
    
    // Success
    return user
  } catch (error) {
    // Handle known errors
    if (error instanceof ValidationError) {
      throw error
    }
    
    // Handle unknown errors
    throw new DatabaseError('create user', error as Error)
  }
}
```

## 📚 Documentation Standards

### JSDoc Comments
```typescript
/**
 * Creates a new user with the provided data
 * 
 * @param data - User creation data
 * @param data.email - User's email address (must be unique)
 * @param data.name - User's display name
 * @returns Promise that resolves to the created user
 * @throws {ValidationError} When required fields are missing
 * @throws {DatabaseError} When user creation fails
 * 
 * @example
 * ```typescript
 * const user = await userService.createUser({
 *   email: 'john@example.com',
 *   name: 'John Doe'
 * })
 * ```
 */
async createUser(data: CreateUserData): Promise<User> {
  // Implementation
}
```

### Interface Documentation
```typescript
/**
 * Configuration options for database connection
 */
interface DatabaseConfig {
  /** Database file path for SQLite */
  database: string
  
  /** Enable WAL mode for better concurrency */
  wal?: boolean
  
  /** Cache size in pages (negative values = KB) */
  cacheSize?: number
  
  /** Connection timeout in milliseconds */
  timeout?: number
}
```

## 🚀 Performance Standards

### Async/Await Usage
```typescript
// ✅ CORRECT - Proper async handling
async function processUsers(users: User[]): Promise<ProcessedUser[]> {
  const results = await Promise.all(
    users.map(async (user) => {
      const processed = await processUser(user)
      return processed
    })
  )
  
  return results
}

// ✅ CORRECT - Error handling in async operations
async function safeOperation(): Promise<Result> {
  try {
    return await riskyOperation()
  } catch (error) {
    logger.error('Operation failed', error)
    return { success: false, error: error.message }
  }
}
```

### Memory Management
```typescript
// ✅ CORRECT - Proper cleanup
class ResourceManager {
  private resources: Set<Resource> = new Set()

  addResource(resource: Resource): void {
    this.resources.add(resource)
  }

  async cleanup(): Promise<void> {
    await Promise.all(
      Array.from(this.resources).map(resource => resource.close())
    )
    this.resources.clear()
  }
}
```

## 🎯 Code Quality Metrics

### Complexity Limits
- **Cyclomatic Complexity**: Maximum 10 per function
- **Function Length**: Maximum 50 lines
- **Class Length**: Maximum 300 lines
- **File Length**: Maximum 500 lines
- **Parameter Count**: Maximum 5 per function

### Code Coverage
- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: Minimum 60% coverage
- **Critical Paths**: 100% coverage required

## 🔍 Code Review Checklist

### Before Submitting Code:
- [ ] All TypeScript errors resolved
- [ ] No `any` types used (except in type assertions)
- [ ] All public methods documented with JSDoc
- [ ] Error handling implemented for all operations
- [ ] Unit tests written for new functionality
- [ ] Legacy code deleted (if applicable)
- [ ] Code follows naming conventions
- [ ] No code duplication
- [ ] Performance considerations addressed

### Code Review Focus Areas:
- **Type Safety**: Proper TypeScript usage
- **Error Handling**: Comprehensive error management
- **Performance**: Efficient algorithms and patterns
- **Maintainability**: Clean, readable code
- **Testing**: Adequate test coverage
- **Documentation**: Clear, helpful comments

This standard ensures that all NOORMME code is clean, maintainable, and follows modern TypeScript best practices while adhering to the NORMIE DEV methodology.
