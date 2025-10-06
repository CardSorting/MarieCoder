# NOORMME Artisan MCP Server

A powerful MCP (Model Context Protocol) server that provides Laravel-style Artisan commands for Next.js development. Built with the NORMIE DEV methodology, this server offers clean, unified architecture for rapid Next.js application development.

## 🎯 Features

### Make Commands
- **`make:component`** - Create React components with optional tests, styles, and stories
- **`make:service`** - Generate service classes with repository integration
- **`make:migration`** - Create database migrations with Kysely syntax
- **`make:page`** - Generate Next.js pages with layouts and error handling
- **`make:api`** - Create API routes with validation and authentication
- **`make:middleware`** - Generate middleware with auth, CORS, and rate limiting

### Project Commands
- **`new:project`** - Scaffold new Next.js projects with modern tooling
- **`install:auth`** - Set up authentication with NextAuth.js
- **`install:admin`** - Install admin panel with user management

### Database Commands
- **`db:migrate`** - Run database migrations with preview mode
- **`db:seed`** - Seed database with initial data

### Development Commands
- **`serve`** - Start development server with database integration
- **`test`** - Run tests with coverage and watch mode

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/noormme-artisan.git
cd noormme-artisan

# Install dependencies
npm install

# Build the project
npm run build
```

### Usage

```bash
# Start the MCP server
npm start

# Or run in development mode
npm run dev
```

### Example Commands

```bash
# Create a new component
artisan make:component Button --type=ui --with-tests --with-styles

# Generate a service with repository
artisan make:service UserService --with-repository --with-validation

# Create a database migration
artisan make:migration create_users_table --action=create --table=users

# Scaffold a new project
artisan new:project my-app --template=full --with-auth --with-admin

# Run database migrations
artisan db:migrate --pretend

# Start development server
artisan serve --port=3000 --with-database
```

## 🏗️ Architecture

### Core Components

- **Command Registry** - Manages command registration and execution
- **Project Analyzer** - Analyzes project structure and dependencies
- **File Generator** - Generates files from templates
- **Template Manager** - Manages and renders templates
- **Validation** - Validates inputs and handles errors
- **Error Handler** - Comprehensive error handling and reporting

### Command Structure

```typescript
interface ArtisanCommand {
  name: string
  description: string
  signature: string
  arguments: CommandArgument[]
  options: CommandOption[]
  handler: (args: CommandArguments, options: CommandOptions) => Promise<CommandResult>
}
```

### File Generation

The server generates files using Handlebars templates with variable substitution:

```typescript
// Template
interface {{name}}Props {
  // Add props here
}

export function {{name}}(props: {{name}}Props) {
  return <div>{{name}}</div>
}

// Rendered
interface ButtonProps {
  // Add props here
}

export function Button(props: ButtonProps) {
  return <div>Button</div>
}
```

## 📁 Project Structure

```
src/
├── index.ts                    # Main MCP server entry point
├── types.ts                    # TypeScript type definitions
├── core/                       # Core functionality
│   ├── command-registry.ts     # Command management
│   └── project-analyzer.ts     # Project analysis
├── commands/                   # Command implementations
│   ├── make/                   # Make commands
│   ├── database/               # Database commands
│   ├── dev/                    # Development commands
│   ├── project/                # Project commands
│   └── install/                # Install commands
├── utils/                      # Utility functions
│   ├── file-generator.ts       # File generation
│   ├── template-manager.ts     # Template management
│   ├── validation.ts           # Input validation
│   └── error-handler.ts        # Error handling
└── __tests__/                  # Test suite
    ├── fixtures/               # Test fixtures
    ├── core/                   # Core tests
    ├── commands/               # Command tests
    └── utils/                  # Utility tests
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- TypeScript 5+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build the project
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

### Adding New Commands

1. Create command file in appropriate directory
2. Define command structure with arguments and options
3. Implement handler function
4. Register command in `index.ts`
5. Add tests for the command
6. Update documentation

### Example Command

```typescript
export const makeComponentCommand: ArtisanCommand = {
  name: 'make:component',
  description: 'Create a new React component',
  signature: 'make:component <name> [options]',
  arguments: [
    {
      name: 'name',
      description: 'Name of the component',
      type: 'string',
      required: true
    }
  ],
  options: [
    {
      name: 'type',
      description: 'Type of component',
      type: 'string',
      default: 'ui'
    }
  ],
  handler: async (args, options) => {
    // Implementation
  }
}
```

## 🧪 Testing

### Test Structure

- **Unit Tests** - Test individual functions and components
- **Integration Tests** - Test command execution and file generation
- **Mock Tests** - Test with mocked dependencies
- **Coverage Tests** - Ensure adequate test coverage

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- component.test.ts
```

### Test Coverage

- **Branches**: 80% coverage
- **Functions**: 80% coverage
- **Lines**: 80% coverage
- **Statements**: 80% coverage

## 📚 API Reference

### Command Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Name of the resource to create |
| `type` | string | No | Type or category of the resource |
| `action` | string | No | Action to perform (create, modify, drop) |
| `table` | string | No | Database table name |
| `route` | string | No | API or page route |

### Command Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--with-tests` | boolean | true | Include test files |
| `--with-styles` | boolean | false | Include style files |
| `--with-story` | boolean | false | Include Storybook stories |
| `--with-props` | boolean | true | Include props interface |
| `--with-repository` | boolean | true | Include repository |
| `--with-validation` | boolean | true | Include validation schema |
| `--with-auth` | boolean | false | Include authentication |
| `--with-database` | boolean | true | Include database setup |
| `--force` | boolean | false | Force operation |
| `--pretend` | boolean | false | Show preview without executing |

### Command Results

```typescript
interface CommandResult {
  success: boolean
  message: string
  data?: {
    files?: string[]
    directories?: string[]
    executed?: number
    pending?: number
    migrations?: string[]
    seeders?: string[]
    records?: number
    url?: string
    port?: number
    host?: string
    pid?: number
    passed?: number
    failed?: number
    skipped?: number
    duration?: number
    coverage?: {
      statements: number
      branches: number
      functions: number
      lines: number
    }
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="./app.db"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Authentication
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### Project Configuration

The server automatically detects and analyzes your project structure:

- **Next.js Detection** - Checks for `package.json` with Next.js dependency
- **Database Detection** - Looks for database configuration files
- **Authentication Detection** - Checks for NextAuth.js setup
- **Admin Detection** - Looks for admin panel components

## 🚨 Error Handling

### Error Types

- **ValidationError** - Input validation failures
- **FileSystemError** - File system operation errors
- **DatabaseError** - Database operation errors
- **CommandError** - Command execution errors
- **TemplateError** - Template rendering errors
- **ProjectError** - Project operation errors

### Error Response

```typescript
interface ErrorResult {
  success: false
  message: string
  error: string
  stack?: string
  operation?: string
  path?: string
  command?: string
  template?: string
  project?: string
  errors?: string[]
}
```

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Maintain test coverage above 80%
- Follow the NORMIE DEV methodology

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add changelog entry
4. Request review from maintainers
5. Address feedback and merge

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** - The React framework for production
- **Kysely** - Type-safe SQL query builder
- **NextAuth.js** - Authentication for Next.js
- **SQLite** - Lightweight database engine
- **TypeScript** - Typed JavaScript at scale
- **Jest** - JavaScript testing framework
- **Handlebars** - Template engine

## 📞 Support

- **Documentation** - [GitHub Wiki](https://github.com/your-org/noormme-artisan/wiki)
- **Issues** - [GitHub Issues](https://github.com/your-org/noormme-artisan/issues)
- **Discussions** - [GitHub Discussions](https://github.com/your-org/noormme-artisan/discussions)
- **Discord** - [NOORMME Community](https://discord.gg/noormme)

## 🔄 Changelog

### v1.0.0 (2024-01-01)
- Initial release
- All make commands implemented
- Database commands with NOORMME integration
- Project scaffolding commands
- Comprehensive test suite
- Full documentation

---

**Built with ❤️ using the NORMIE DEV methodology**
