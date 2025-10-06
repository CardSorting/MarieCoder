# NOORMME Database Guidelines

## 🎯 Core Philosophy

### "Leverage Kysely Fully"
**CRITICAL**: Don't recreate query building - use Kysely's native capabilities:
- ✅ **Direct Access** - Expose Kysely's query builders directly
- ✅ **Type Safety** - Use Kysely's generics and type inference
- ✅ **Native Methods** - Use `selectFrom()`, `insertInto()`, `updateTable()`, `deleteFrom()`
- ❌ **Custom Wrappers** - Don't wrap Kysely's core functionality
- ❌ **Recreating Logic** - Don't rebuild what Kysely already provides

## 🏗️ Database Connection Pattern

### ✅ CORRECT - Direct Kysely Integration
```typescript
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
```

### ❌ WRONG - Wrapping Kysely
```typescript
// DON'T DO THIS - Wrapping Kysely's functionality
export class DatabaseConnection {
  private db: Kysely<Database>
  
  // DON'T - Creating custom query methods
  async customSelect(table: string, where: any) {
    return this.db.selectFrom(table).where(where).execute()
  }
  
  // DON'T - Recreating Kysely's query building
  buildQuery(table: string, conditions: any) {
    let query = this.db.selectFrom(table)
    // Custom query building logic...
    return query
  }
}
```

## 📊 Repository Pattern with Kysely

### ✅ CORRECT - Leveraging Kysely Fully
```typescript
export abstract class BaseRepository<T extends keyof Database> {
  protected tableName: T
  protected db: Kysely<Database>

  constructor(tableName: T, db: Kysely<Database>) {
    this.tableName = tableName
    this.db = db
  }

  // ✅ CORRECT - Direct Kysely usage with proper error handling
  async findById(id: string): Promise<Database[T] | null> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new ValidationError("Valid ID is required", "Please provide a valid record ID")
      }

      const result = await this.db
        .selectFrom(this.tableName)
        .selectAll()
        .where("id" as any, "=", id)
        .executeTakeFirst()

      return (result as unknown as Database[T]) || null
    } catch (error) {
      if (error instanceof NOORMError) {
        throw error
      }
      throw new NOORMError(
        `Failed to find ${String(this.tableName)} by ID: ${error instanceof Error ? error.message : "Unknown error"}`,
        "FIND_BY_ID_ERROR",
        "Please check the ID and try again"
      )
    }
  }

  // ✅ CORRECT - Transaction support with Kysely
  async create(data: Partial<Database[T]>): Promise<Database[T]> {
    try {
      const now = new Date()
      const createData = {
        ...data,
        id: data.id || this.generateId(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      const result = await this.db
        .insertInto(this.tableName)
        .values(createData as any)
        .returningAll()
        .executeTakeFirst()

      if (!result) {
        throw new NOORMError(
          `Failed to create ${String(this.tableName)} record`,
          "CREATE_FAILED",
          "Please check your data and try again"
        )
      }

      return result as unknown as Database[T]
    } catch (error) {
      if (error instanceof NOORMError) {
        throw error
      }
      throw new NOORMError(
        `Failed to create ${String(this.tableName)}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CREATE_ERROR",
        "Please check your data and try again"
      )
    }
  }
}
```

## 🎯 Type Safety with Kysely

### ✅ CORRECT - Proper Type Assertions
```typescript
// ✅ CORRECT - Use proper type assertions for Kysely's complex types
const result = await this.db
  .selectFrom(this.tableName)
  .selectAll()
  .where("id" as any, "=", id)
  .executeTakeFirst()

return (result as unknown as Database[T]) || null

// ✅ CORRECT - For raw SQL queries
await this.db.executeQuery({
  sql: `SELECT * FROM users WHERE email = ?`,
  parameters: [email]
} as any)

// ✅ CORRECT - For dynamic column references
query = query.where("status" as any, "!=", "deleted")
query = query.orderBy("createdAt" as any, "desc")
```

### ❌ WRONG - Incorrect Type Handling
```typescript
// DON'T DO THIS - Incorrect type assertions
const result = await this.db
  .selectFrom(this.tableName)
  .selectAll()
  .where("id", "=", id) // This will cause type errors
  .executeTakeFirst()

return result as Database[T] // This will cause type errors

// DON'T DO THIS - Using any without proper context
const result = await this.db
  .selectFrom(this.tableName)
  .selectAll()
  .executeTakeFirst()

return result as any // Too broad, loses type safety
```

## 🚨 Error Handling Integration

### ✅ CORRECT - Comprehensive Error Handling
```typescript
// ✅ CORRECT - Comprehensive error handling
try {
  const result = await this.db
    .selectFrom(this.tableName)
    .selectAll()
    .where("id" as any, "=", id)
    .executeTakeFirst()

  if (!result) {
    throw new NotFoundError(
      `${String(this.tableName)} record not found`,
      "Please check the ID and try again"
    )
  }

  return result as unknown as Database[T]
} catch (error) {
  if (error instanceof NOORMError) {
    throw error
  }
  throw new NOORMError(
    `Failed to find ${String(this.tableName)}: ${error instanceof Error ? error.message : "Unknown error"}`,
    "FIND_ERROR",
    "Please check your parameters and try again"
  )
}
```

## 📊 SQLite Configuration

### WAL Mode Setup
```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=-64000;
PRAGMA temp_store=MEMORY;
PRAGMA foreign_keys=ON;
```

### Performance Optimization
- Enable WAL mode for concurrent access
- Set optimal cache size (-64000 = 64MB)
- Use memory-based temporary storage
- Enable foreign key constraints

## 🎯 Best Practices

### DO's ✅
- Use Kysely's query builders directly (`selectFrom`, `insertInto`, `updateTable`, `deleteFrom`)
- Leverage Kysely's transaction system for atomic operations
- Use proper type assertions (`as unknown as Database[T]`) for complex Kysely types
- Implement comprehensive error handling with NOORMError
- Use caching integration with QueryCache
- Apply input validation before database operations
- Use Kysely's type inference and generics
- Expose Kysely's native methods directly
- Build helper methods on top of Kysely, not instead of it

### DON'Ts ❌
- Don't wrap Kysely's core query building functionality
- Don't recreate query building logic that Kysely already provides
- Don't use `any` types without proper type assertions
- Don't ignore error handling in database operations
- Don't bypass Kysely's transaction system for multi-step operations
- Don't use legacy database patterns or old query builders
- Don't mix different database access patterns in the same codebase
- Don't create custom query builders that duplicate Kysely's functionality
- Don't use overly broad type assertions that lose type safety

## 🚀 Common Patterns

### Direct Kysely Usage
```typescript
// ✅ CORRECT - Direct Kysely usage
const users = await db
  .selectFrom('users')
  .selectAll()
  .where('status', '=', 'active')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .execute()
```

### Repository with Kysely
```typescript
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
```

This guide ensures developers understand how to properly integrate with Kysely while maintaining type safety, error handling, and performance optimization.
