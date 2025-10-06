# NOORMME Artisan Development Guide

This guide covers development practices, architecture decisions, and contribution guidelines for the NOORMME Artisan MCP Server.

## 🏗️ Architecture Overview

### Core Principles

The NOORMME Artisan server follows the **NORMIE DEV methodology**:

1. **Thank** - Acknowledge what taught us valuable lessons
2. **Let Go** - Delete legacy systems and technical debt immediately
3. **Organize** - Keep only what sparks joy with proven patterns

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server Layer                        │
├─────────────────────────────────────────────────────────────┤
│                  Artisan Server                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Tool      │  │  Command    │  │   Error     │        │
│  │  Handler    │  │  Registry   │  │  Handler    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│                    Core Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Project    │  │   File      │  │  Template   │        │
│  │  Analyzer   │  │  Generator  │  │  Manager    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│                   Command Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Make     │  │  Database   │  │    Dev      │        │
│  │  Commands   │  │  Commands   │  │  Commands   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│                   Utility Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Validation  │  │   Error     │  │   Cache     │        │
│  │             │  │  Handling   │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Design Patterns

### Command Pattern

All Artisan commands follow a consistent structure:

```typescript
interface ArtisanCommand {
  name: string                    // Command name (e.g., 'make:component')
  description: string             // Human-readable description
  signature: string              // Command signature for help
  arguments: CommandArgument[]   // Required/optional arguments
  options: CommandOption[]       // Command options
  handler: CommandHandler        // Execution function
}
```

### Registry Pattern

Commands are registered in a central registry for discovery and execution:

```typescript
class CommandRegistry {
  private commands = new Map<string, ArtisanCommand>()
  
  register(command: ArtisanCommand): void
  getCommand(name: string): ArtisanCommand | undefined
  getAllCommands(): ArtisanCommand[]
  execute(name: string, args: any, options: any): Promise<CommandResult>
}
```

### Factory Pattern

File generation uses factory methods for different types:

```typescript
class FileGenerator {
  generateComponent(config: ComponentConfig): Promise<string[]>
  generateService(config: ServiceConfig): Promise<string[]>
  generateMigration(config: MigrationConfig): Promise<string[]>
  generatePage(config: PageConfig): Promise<string[]>
  generateApi(config: ApiConfig): Promise<string[]>
  generateMiddleware(config: MiddlewareConfig): Promise<string[]>
}
```

### Template Pattern

Templates use Handlebars for variable substitution:

```typescript
// Template
const template = `
interface {{name}}Props {
  {{#if props}}
  // Add props here
  {{/if}}
}

export function {{name}}(props: {{name}}Props) {
  return <div>{{name}}</div>
}
`

// Rendering
const rendered = templateManager.render(template, {
  name: 'Button',
  props: true
})
```

## 🔧 Development Setup

### Prerequisites

- Node.js 18+
- TypeScript 5+
- npm or yarn
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/your-org/noormme-artisan.git
cd noormme-artisan

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

### Development Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/",
    "type-check": "tsc --noEmit"
  }
}
```

## 📁 Project Structure

### Directory Organization

```
src/
├── index.ts                    # Main MCP server entry point
├── types.ts                    # TypeScript type definitions
├── core/                       # Core functionality
│   ├── command-registry.ts     # Command management
│   └── project-analyzer.ts     # Project analysis
├── commands/                   # Command implementations
│   ├── make/                   # Make commands
│   │   ├── component.ts        # Component generation
│   │   ├── service.ts          # Service generation
│   │   ├── migration.ts        # Migration generation
│   │   ├── page.ts             # Page generation
│   │   ├── api.ts              # API generation
│   │   └── middleware.ts       # Middleware generation
│   ├── database/               # Database commands
│   │   ├── migrate.ts          # Migration execution
│   │   └── seed.ts             # Database seeding
│   ├── dev/                    # Development commands
│   │   ├── serve.ts            # Development server
│   │   └── test.ts             # Test execution
│   ├── project/                # Project commands
│   │   └── new.ts              # Project scaffolding
│   └── install/                # Install commands
│       ├── auth.ts             # Authentication setup
│       └── admin.ts            # Admin panel setup
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

### File Naming Conventions

- **Commands**: `kebab-case.ts` (e.g., `make-component.ts`)
- **Types**: `types.ts`
- **Tests**: `*.test.ts`
- **Fixtures**: `*.fixture.ts`
- **Mocks**: `mock-*.ts`

## 🧪 Testing Strategy

### Test Categories

1. **Unit Tests** - Test individual functions and classes
2. **Integration Tests** - Test command execution and file generation
3. **Mock Tests** - Test with mocked dependencies
4. **Coverage Tests** - Ensure adequate test coverage

### Test Structure

```typescript
describe('ComponentCommand', () => {
  let command: ArtisanCommand
  let mockGenerator: jest.Mocked<FileGenerator>
  let mockValidator: jest.Mocked<Validation>

  beforeEach(() => {
    mockGenerator = createMockFileGenerator()
    mockValidator = createMockValidation()
    command = makeComponentCommand(mockGenerator, mockValidator)
  })

  describe('execute', () => {
    it('should create component with default options', async () => {
      // Arrange
      const args = { name: 'Button' }
      const options = {}
      mockValidator.validateCommand.mockReturnValue({ valid: true, errors: [] })
      mockGenerator.generateComponent.mockResolvedValue(['Button.tsx'])

      // Act
      const result = await command.handler(args, options)

      // Assert
      expect(result.success).toBe(true)
      expect(mockGenerator.generateComponent).toHaveBeenCalledWith({
        name: 'Button',
        type: 'ui',
        withTests: true,
        withStyles: false,
        withStory: false,
        withProps: true
      })
    })
  })
})
```

### Mock Patterns

```typescript
// File system mocking
export const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  pathExists: jest.fn(),
  readdir: jest.fn()
}

// MCP server mocking
export const mockMCP = {
  callTool: jest.fn(),
  registerTool: jest.fn(),
  listTools: jest.fn()
}

// Command mocking
export const mockCommand = {
  name: 'test:command',
  description: 'Test command',
  signature: 'test:command <name>',
  arguments: [],
  options: [],
  handler: jest.fn()
}
```

## 🔍 Code Quality

### TypeScript Standards

- **Strict Mode**: Enable all strict TypeScript checks
- **No Any**: Avoid `any` types, use proper typing
- **Interfaces**: Use interfaces for object shapes
- **Generics**: Use generics for reusable code
- **JSDoc**: Document all public APIs

```typescript
/**
 * Creates a new React component with the specified configuration
 * 
 * @param config - Component configuration options
 * @returns Promise that resolves to array of generated file paths
 * @throws {ValidationError} When configuration is invalid
 * @throws {FileSystemError} When file operations fail
 */
async function generateComponent(config: ComponentConfig): Promise<string[]> {
  // Implementation
}
```

### Error Handling

```typescript
// Custom error classes
export class ValidationError extends Error {
  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

// Error handling pattern
try {
  const result = await operation()
  return { success: true, data: result }
} catch (error) {
  if (error instanceof ValidationError) {
    return { success: false, error: error.message, field: error.field }
  }
  throw error
}
```

### Performance Considerations

```typescript
// Caching for expensive operations
const cache = new Map<string, any>()

async function expensiveOperation(key: string): Promise<any> {
  if (cache.has(key)) {
    return cache.get(key)
  }
  
  const result = await performExpensiveOperation()
  cache.set(key, result)
  return result
}

// Lazy loading for large modules
const lazyModule = () => import('./large-module.js')
```

## 🚀 Adding New Commands

### Command Development Process

1. **Define Command Structure**
```typescript
export const newCommand: ArtisanCommand = {
  name: 'make:new',
  description: 'Create a new resource',
  signature: 'make:new <name> [options]',
  arguments: [
    {
      name: 'name',
      description: 'Name of the resource',
      type: 'string',
      required: true
    }
  ],
  options: [
    {
      name: 'type',
      description: 'Type of resource',
      type: 'string',
      default: 'default'
    }
  ],
  handler: async (args, options) => {
    // Implementation
  }
}
```

2. **Implement Handler Logic**
```typescript
async function handleNewCommand(args: CommandArguments, options: CommandOptions): Promise<CommandResult> {
  try {
    // Validate inputs
    const validation = validateInputs(args, options)
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '))
    }

    // Generate files
    const generator = new FileGenerator()
    const files = await generator.generateNew(args.name, options)

    return {
      success: true,
      message: 'Resource created successfully',
      data: { files }
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to create resource',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
```

3. **Register Command**
```typescript
// In index.ts
private registerCommands(): void {
  this.commandRegistry.register(newCommand)
}
```

4. **Add Tests**
```typescript
describe('NewCommand', () => {
  it('should create new resource with valid inputs', async () => {
    // Test implementation
  })
})
```

5. **Update Documentation**
```markdown
### `make:new`

Create a new resource with specified options.

**Signature:**
```bash
artisan make:new <name> [options]
```
```

### Template Development

1. **Create Template File**
```handlebars
{{!-- templates/new.hbs --}}
interface {{name}}Config {
  // Configuration options
}

export class {{name}} {
  constructor(config: {{name}}Config) {
    // Implementation
  }
}
```

2. **Register Template**
```typescript
templateManager.registerTemplate('new', newTemplate)
```

3. **Use Template**
```typescript
const rendered = templateManager.render('new', { name: 'MyClass' })
```

## 🔧 Configuration Management

### Environment Configuration

```typescript
interface Config {
  projectRoot: string
  templatesDir: string
  outputDir: string
  databaseUrl: string
  enableLogging: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

const config: Config = {
  projectRoot: process.env.PROJECT_ROOT || process.cwd(),
  templatesDir: process.env.TEMPLATES_DIR || './templates',
  outputDir: process.env.OUTPUT_DIR || './src',
  databaseUrl: process.env.DATABASE_URL || './app.db',
  enableLogging: process.env.ENABLE_LOGGING !== 'false',
  logLevel: (process.env.LOG_LEVEL as any) || 'info'
}
```

### Command Configuration

```typescript
// Command-specific configuration
interface CommandConfig {
  defaultOptions: Record<string, any>
  validationRules: ValidationRule[]
  templatePaths: Record<string, string>
}

const commandConfigs: Record<string, CommandConfig> = {
  'make:component': {
    defaultOptions: {
      type: 'ui',
      withTests: true,
      withStyles: false
    },
    validationRules: [
      { field: 'name', type: 'string', required: true, pattern: /^[A-Z]/ }
    ],
    templatePaths: {
      component: './templates/component.hbs',
      test: './templates/component.test.hbs'
    }
  }
}
```

## 📊 Monitoring and Debugging

### Logging

```typescript
interface Logger {
  debug(message: string, context?: any): void
  info(message: string, context?: any): void
  warn(message: string, context?: any): void
  error(message: string, context?: any): void
}

class ArtisanLogger implements Logger {
  private logLevel: string

  constructor(level: string = 'info') {
    this.logLevel = level
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, context)
    }
  }

  // ... other methods
}
```

### Performance Monitoring

```typescript
class PerformanceMonitor {
  private timers = new Map<string, number>()
  private metrics = new Map<string, number>()

  startTimer(name: string): void {
    this.timers.set(name, Date.now())
  }

  endTimer(name: string): number {
    const start = this.timers.get(name)
    if (!start) return 0
    
    const duration = Date.now() - start
    this.metrics.set(name, duration)
    this.timers.delete(name)
    return duration
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics)
  }
}
```

## 🤝 Contributing Guidelines

### Development Workflow

1. **Fork Repository**
```bash
git clone https://github.com/your-username/noormme-artisan.git
cd noormme-artisan
```

2. **Create Feature Branch**
```bash
git checkout -b feature/new-command
```

3. **Make Changes**
- Follow TypeScript best practices
- Add tests for new functionality
- Update documentation
- Ensure all tests pass

4. **Commit Changes**
```bash
git add .
git commit -m "feat: add new command for resource generation"
```

5. **Push and Create PR**
```bash
git push origin feature/new-command
```

### Code Review Process

1. **Automated Checks**
   - TypeScript compilation
   - Linting and formatting
   - Test execution
   - Coverage requirements

2. **Manual Review**
   - Code quality and style
   - Architecture decisions
   - Documentation completeness
   - Performance implications

3. **Approval Criteria**
   - All tests pass
   - Coverage above 80%
   - Documentation updated
   - No breaking changes (unless intentional)

### Release Process

1. **Version Bumping**
```bash
npm version patch  # or minor, major
```

2. **Changelog Update**
```markdown
## [1.0.1] - 2024-01-01
### Added
- New command for resource generation
- Enhanced error handling

### Fixed
- Template rendering issue
- Validation bug
```

3. **Publishing**
```bash
npm publish
```

## 🚨 Troubleshooting

### Common Issues

**TypeScript Compilation Errors:**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Fix type issues
npm run type-check
```

**Test Failures:**
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- component.test.ts
```

**Build Issues:**
```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

**MCP Server Connection Issues:**
```bash
# Check server logs
npm run dev

# Verify MCP protocol
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npm start
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=artisan:* npm run dev

# Enable verbose MCP logging
MCP_DEBUG=true npm start
```

---

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Kysely Query Builder](https://kysely.dev/)

---

**For more information, see the [API Reference](API.md) or [Commands Reference](COMMANDS.md).**
