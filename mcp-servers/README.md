# NOORMME MCP Servers

Enhanced Model Context Protocol servers for NOORMME development, following the NORMIE DEV methodology for clean, modular, and performant architecture.

## Overview

This directory contains two refactored MCP servers that provide enhanced functionality for NOORMME development:

- **noormme-database**: Enhanced database operations with Kysely integration
- **noormme-project**: Modular project generation with comprehensive templates

## Architecture

### NORMIE DEV Methodology

Both servers follow the NORMIE DEV methodology:

1. **Thank** - Acknowledge what taught us valuable lessons
2. **Let Go** - Eliminate ALL legacy systems, backward compatibility, and technical debt
3. **Organize** - Keep only what sparks joy with proven patterns

### Modular Design

Each server is built with a clean, modular architecture:

```
src/
├── core/           # Core functionality
├── generators/     # Specialized generators
├── types.ts        # Type definitions
└── index.ts        # Main server entry point
```

## Servers

### noormme-database

Enhanced database operations with full Kysely integration.

**Features:**
- Direct Kysely query builder access
- Repository pattern with type safety
- Comprehensive error handling
- Database health monitoring
- Performance optimization
- Transaction support

**Tools:**
- `initialize_database` - Initialize with WAL mode optimization
- `get_tables` - List all tables with detailed information
- `get_table_info` - Get table schema and constraints
- `execute_query` - Execute raw SQL with parameter binding
- `repository_operation` - CRUD operations with repository pattern
- `custom_find` - Advanced find operations with various operators
- `find_by_id` - Find records by ID
- `find_all` - Find records with conditions and pagination
- `count_records` - Count records with optional filters
- `check_exists` - Check record existence
- `upsert_record` - Create or update records
- `get_health` - Database health status
- `optimize_database` - Performance optimization
- `get_stats` - Database statistics

### noormme-project

Modular project generation with comprehensive templates.

**Features:**
- Modular generator architecture
- Template engine with EJS
- Comprehensive validation
- Feature-based generation
- Cursor IDE rules generation
- Component and service generation

**Tools:**
- `create_nextjs_project` - Create complete Next.js projects
- `generate_component` - Generate React components
- `generate_service` - Generate service classes
- `generate_cursor_rules` - Generate IDE rules
- `setup_database` - Database setup with migrations

## Quick Start

### Building

Each server has its own build script:

```bash
# Database server
cd noormme-database
./build.sh

# Project server
cd noormme-project
./build.sh
```

### Development

```bash
# Install dependencies
npm install

# Build in watch mode
npm run dev

# Build for production
npm run build

# Start server
npm start
```

## Configuration

### Database Server

The database server requires a database configuration:

```typescript
{
  database: "./app.db",
  wal: true,
  cacheSize: -64000,
  synchronous: "NORMAL",
  tempStore: "MEMORY",
  foreignKeys: true,
  optimize: true,
  timeout: 30000,
  busyTimeout: 5000
}
```

### Project Server

The project server supports various templates and features:

```typescript
{
  projectName: "my-app",
  projectPath: "/path/to/project",
  template: "nextjs-saas",
  includeAuth: true,
  includeAdmin: true,
  includeTailwind: true,
  includeTests: true,
  includeQueue: true,
  includePayments: true,
  includeSubscriptions: true
}
```

## Templates

### Project Templates

- **nextjs**: Basic Next.js application
- **nextjs-auth**: Next.js with authentication
- **nextjs-admin**: Next.js with admin panel
- **nextjs-saas**: Complete SaaS application

### Component Types

- **ui**: Reusable UI components
- **page**: Page components
- **layout**: Layout components
- **feature**: Feature-specific components
- **admin**: Admin panel components
- **auth**: Authentication components

## Best Practices

### Database Operations

- Always use Kysely's native query builders
- Implement comprehensive error handling
- Use proper type assertions
- Apply input validation
- Leverage transactions for multi-step operations

### Project Generation

- Validate all inputs before generation
- Use modular template architecture
- Include comprehensive documentation
- Follow NOORMME patterns
- Generate appropriate tests and stories

## Error Handling

Both servers implement comprehensive error handling:

- Standardized error types with actionable messages
- Proper error propagation
- User-friendly error messages
- Detailed logging for debugging

## Performance

### Database Server

- WAL mode for better concurrency
- Optimized cache settings
- Query performance tracking
- Automatic optimization scheduling

### Project Server

- Template caching
- Efficient file operations
- Parallel generation where possible
- Memory-efficient processing

## Contributing

1. Follow the NORMIE DEV methodology
2. Maintain clean, modular architecture
3. Include comprehensive tests
4. Update documentation
5. Use TypeScript strictly

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the documentation
- Review the error messages
- Follow the NORMIE DEV principles
- Delete what doesn't spark joy
