# Centralized Services Architecture

This directory contains specialized centralized service providers for role management, user management, permission management, and audit logging. Each service is designed to handle specific business logic and data operations in a clean, maintainable way.

## Services Overview

### RoleService
Handles all role-related operations including:
- Creating, updating, and deleting roles
- Managing role permissions
- Assigning/removing roles from users
- Role statistics and analytics

### UserService
Manages user operations including:
- User CRUD operations with validation
- User role management
- User search and filtering
- User statistics

### PermissionService
Manages permission operations including:
- Permission CRUD operations
- Permission-to-role assignments
- User permission checking
- Permission statistics by resource

### AuditService
Handles audit logging including:
- Action logging with IP and user agent tracking
- Audit log search and filtering
- Audit statistics and analytics
- Log cleanup and maintenance

### ServiceFactory
Provides singleton instances of all services with proper dependency injection:
- Centralized service instantiation
- Singleton pattern for performance
- Easy service access through convenience functions

## Usage Examples

### Basic Service Usage

```typescript
import { roleService, userService, permissionService, auditService } from '@/lib/services/ServiceFactory'

// Create a new role
const newRole = await roleService().createRole({
  name: 'Content Manager',
  description: 'Manages content and users',
  permissionIds: ['content.create', 'content.update', 'users.read']
}, currentUserId)

// Get user with roles
const user = await userService().getUserById(userId)

// Check user permissions
const hasPermission = await permissionService().userHasPermission(
  userId, 
  'content', 
  'create'
)

// Log an audit action
await auditService().logAction({
  action: 'user.created',
  resource_type: 'user',
  resource_id: newUserId,
  details: { email: 'user@example.com' }
}, currentUserId, request)
```

### Advanced Usage with Dependency Injection

```typescript
import { ServiceFactory } from '@/lib/services/ServiceFactory'

// Get service factory instance
const factory = ServiceFactory.getInstance()

// Get services
const roleService = factory.getRoleService()
const userService = factory.getUserService()

// Use services
const roles = await roleService.getAllRoles()
const users = await userService.getUsers({ page: 1, limit: 10 })
```

### Service Registry Pattern

```typescript
import { ServiceRegistry } from '@/lib/services/ServiceFactory'

// Dynamic service access
const serviceType = 'role' as const
const service = ServiceRegistry[serviceType]()
const roles = await service.getAllRoles()
```

## API Integration

### Admin Routes
The admin API routes have been refactored to use these centralized services:

- `/api/admin/users` - User management
- `/api/admin/roles` - Role management  
- `/api/admin/audit` - Audit log search
- `/api/admin/stats` - Comprehensive statistics

### Middleware Integration
Services integrate with RBAC middleware for authorization:

```typescript
// In middleware
import { withAdminAccess } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  return withAdminAccess(request, async (req, userId) => {
    const stats = await userService().getUserStats()
    return NextResponse.json(stats)
  })
}
```

## Benefits

### 1. Separation of Concerns
- Each service handles specific domain logic
- Clean separation between data access and business logic
- Easy to test and maintain

### 2. Reusability
- Services can be used across multiple API routes
- Consistent business logic throughout the application
- Reduced code duplication

### 3. Type Safety
- Full TypeScript support with validation schemas
- Compile-time error checking
- IntelliSense support

### 4. Centralized Validation
- Zod schemas for input validation
- Consistent error handling
- Type-safe data transformation

### 5. Audit Trail
- Automatic logging of all administrative actions
- Comprehensive audit trail for compliance
- IP and user agent tracking

### 6. Performance
- Singleton pattern reduces object creation
- Efficient database queries with proper indexing
- Pagination support for large datasets

## Error Handling

All services include comprehensive error handling:

```typescript
try {
  const user = await userService().createUser(data, userId)
  return NextResponse.json({ user })
} catch (error) {
  if (error instanceof Error && error.message.includes('Invalid input data')) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  
  console.error('Error creating user:', error)
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Failed to create user' },
    { status: 500 }
  )
}
```

## Testing

Services are designed to be easily testable:

```typescript
// Reset service factory for testing
import { ServiceFactory } from '@/lib/services/ServiceFactory'

beforeEach(() => {
  ServiceFactory.getInstance().reset()
})
```

## Future Enhancements

- Service-level caching for frequently accessed data
- Event-driven architecture for service communication
- Background job processing for heavy operations
- Service health monitoring and metrics
- Rate limiting and throttling
