# NOORMME MCP Servers

This directory contains the Model Context Protocol (MCP) servers for NOORMME development. These servers provide specialized tools for database management, project generation, and Laravel Artisan-style development commands, adhering to the NORMIE DEV methodology.

## 🚀 Servers Overview

### 1. `noormme-database`
A dedicated MCP server for managing SQLite databases with NOORMME optimizations. It exposes tools for:
- **Database Initialization** - Set up databases with WAL mode, foreign keys, and cache optimizations
- **Table Management** - Get table information, schema details, and database statistics
- **Query Execution** - Execute raw SQL queries with proper error handling
- **Repository Operations** - Perform CRUD operations using enhanced repository pattern
- **Health Monitoring** - Check database health status and performance metrics
- **Optimization** - Run ANALYZE, VACUUM, and other optimization operations

### 2. `noormme-project`
A dedicated MCP server for generating Next.js projects and various code components following NOORMME architectural patterns. It exposes tools for:
- **Project Creation** - Generate new Next.js projects with customizable templates
- **Component Generation** - Create React components (UI, page, layout, feature, admin, auth)
- **Service Generation** - Generate service classes with repository and business logic
- **Cursor Rules Generation** - Create Cursor IDE rules for NOORMME projects
- **Database Setup** - Initialize database schema and seed data for new projects

### 3. `noormme-artisan` ⭐ **NEW**
A Laravel Artisan-style command system for intuitive Next.js development. It provides:
- **Make Commands** - Generate components, services, migrations, and more
- **Database Commands** - Run migrations, seed data, and manage database operations
- **Development Commands** - Start servers, run tests, and manage development workflow
- **Project Analysis** - Automatically detect project structure and provide context-aware commands

## 🛠️ Installation and Setup

### Prerequisites
- Node.js 18+ 
- TypeScript 5+
- npm or yarn

### Build All Servers
```bash
# Build all MCP servers
npm run mcp:build

# Or build individually
npm run mcp:build:database
npm run mcp:build:project
npm run mcp:build:artisan
```

### Install Dependencies
```bash
# Install dependencies for all servers
cd mcp-servers/noormme-database && npm install
cd ../noormme-project && npm install
cd ../noormme-artisan && npm install
```

## 🎯 Artisan Commands (Laravel-style)

The `noormme-artisan` server provides intuitive Laravel Artisan-style commands for Next.js development:

### Make Commands
```bash
# Create components
npm run make:component UserCard --type=ui --with-styles --with-tests
npm run make:component Dashboard --type=page --with-props
npm run make:component AdminLayout --type=layout

# Create services
npm run make:service UserService --table=users --with-repository --with-validation
npm run make:service OrderService --with-business-logic --with-tests

# Create migrations
npm run make:migration create_users_table --table=users --columns="name:string,email:string:unique,password:string"
npm run make:migration add_avatar_to_users --action=modify --columns="avatar:string"
```

### Database Commands
```bash
# Run migrations
npm run db:migrate
npm run db:migrate --step=2

# Seed database
npm run db:seed
npm run db:seed --class=UserSeeder
```

### Development Commands
```bash
# Start development server
npm run serve
npm run serve --port=3001 --host=0.0.0.0

# Run tests
npm run test:artisan
npm run test:artisan --watch --coverage --type=integration
```

### Project Analysis
```bash
# Get project status
npm run artisan -- project:status

# List all commands
npm run artisan -- list

# Get help for specific command
npm run artisan -- help make:component
```

## 📊 Available Artisan Commands

| Command | Description | Example |
|---------|-------------|---------|
| `make:component` | Create React components | `npm run make:component UserCard --type=ui` |
| `make:service` | Create service classes | `npm run make:service UserService --table=users` |
| `make:migration` | Create database migrations | `npm run make:migration create_users` |
| `db:migrate` | Run database migrations | `npm run db:migrate` |
| `db:seed` | Seed database with data | `npm run db:seed` |
| `serve` | Start development server | `npm run serve --port=3000` |
| `test` | Run project tests | `npm run test:artisan --watch` |

## 🏗️ Architecture

### Command Registry System
The Artisan server uses a centralized command registry that:
- **Registers Commands** - All commands are registered in a central registry
- **Validates Arguments** - Automatic validation of command arguments and options
- **Provides Help** - Built-in help system for all commands
- **Executes Commands** - Type-safe command execution with error handling

### Project Analyzer
Automatically detects project structure:
- **Next.js Detection** - Identifies Next.js projects and their configuration
- **Database Setup** - Detects database configuration and dependencies
- **Authentication** - Identifies authentication setup (NextAuth, etc.)
- **Admin Panel** - Detects admin panel implementation
- **Component Structure** - Maps existing components, services, and pages

### Template Engine
Generates code with proper structure:
- **Component Templates** - React components with TypeScript, tests, and stories
- **Service Templates** - Service classes with repositories and business logic
- **Migration Templates** - Database migrations with up/down methods
- **Test Templates** - Comprehensive test files with mocking

## 🔧 Integration with AI Agent

The MCP servers integrate seamlessly with the AI agent through:

### 1. **Direct Command Execution**
```typescript
// AI agent can execute Artisan commands directly
await mcp.execute('artisan_execute', {
  command: 'make:component',
  args: { name: 'UserCard' },
  options: { type: 'ui', withTests: true }
})
```

### 2. **Project Context Awareness**
```typescript
// AI agent gets project structure automatically
const status = await mcp.execute('artisan_project_status')
// Returns: { structure: {...}, config: {...} }
```

### 3. **Intelligent Command Suggestions**
The AI agent can suggest appropriate commands based on:
- Current project structure
- User intent and context
- Available templates and patterns
- Best practices for NOORMME development

## 🎨 NORMIE DEV Integration

All servers follow the NORMIE DEV methodology:

### **"Does this spark joy?"**
- ✅ **Intuitive Commands** - Laravel Artisan-style commands that feel natural
- ✅ **Auto-completion** - Smart suggestions and validation
- ✅ **Clear Output** - Beautiful, informative command output
- ✅ **Fast Execution** - Optimized for speed and efficiency

### **"Thank it for its service and let it go"**
- ❌ **Complex Setup** - No manual configuration required
- ❌ **Legacy Patterns** - Modern Next.js and TypeScript patterns only
- ❌ **Verbose Commands** - Simple, clear command syntax
- ❌ **Manual Integration** - Automatic project detection and setup

### **"Keep only what sparks joy"**
- ✅ **Clean Architecture** - Well-organized, modular code structure
- ✅ **Type Safety** - Full TypeScript support with strict typing
- ✅ **Error Handling** - Comprehensive error messages and recovery
- ✅ **Documentation** - Clear help and examples for all commands

## 🚀 Usage Examples

### Creating a New Feature
```bash
# 1. Create the service
npm run make:service ProductService --table=products --with-repository --with-validation

# 2. Create the component
npm run make:component ProductList --type=feature --with-tests

# 3. Create the migration
npm run make:migration create_products_table --table=products --columns="name:string,price:decimal,description:text"

# 4. Run the migration
npm run db:migrate

# 5. Seed with sample data
npm run db:seed --class=ProductSeeder
```

### Development Workflow
```bash
# Start development server
npm run serve

# Run tests in watch mode
npm run test:artisan --watch --coverage

# Check project status
npm run artisan -- project:status

# Get help for any command
npm run artisan -- help make:service
```

## 🔍 Troubleshooting

### Common Issues

**1. Command not found**
```bash
# Ensure the server is built
npm run mcp:build:artisan

# Check if command exists
npm run artisan -- list
```

**2. Project not detected**
```bash
# Check project structure
npm run artisan -- project:status

# Ensure you're in a Next.js project directory
```

**3. Build errors**
```bash
# Clean and rebuild
npm run mcp:clean:artisan
npm run mcp:build:artisan
```

## 📚 Development

### Adding New Commands
1. Create command file in `src/commands/[category]/[command].ts`
2. Define command interface with `ArtisanCommand` type
3. Register command in `src/index.ts`
4. Add npm script to main `package.json`

### Extending Project Analyzer
1. Add new detection logic to `ProjectAnalyzer` class
2. Update `ProjectStructure` interface if needed
3. Add new command options based on detected features

### Customizing Templates
1. Modify template functions in command files
2. Add new template options to command interfaces
3. Update help documentation

## 🤝 Contributing

1. Follow the NORMIE DEV methodology
2. Maintain type safety throughout
3. Add comprehensive tests for new features
4. Update documentation for any changes
5. Ensure commands follow Laravel Artisan conventions

## 📄 License

This project follows the same license as the main Cline project.