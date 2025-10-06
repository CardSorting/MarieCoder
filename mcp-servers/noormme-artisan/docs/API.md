# NOORMME Artisan API Reference

This document provides detailed API reference for the NOORMME Artisan MCP Server.

## 🔌 MCP Server Interface

### Server Initialization

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ArtisanServer } from './src/index.js'

const server = new ArtisanServer()
const transport = new StdioServerTransport()
await server.connect(transport)
```

### Tool Registration

The server automatically registers the following tools:

- `artisan` - Main Artisan command execution tool

## 🛠️ Artisan Tool

### Tool Definition

```typescript
{
  name: 'artisan',
  description: 'Execute Laravel-style Artisan commands for Next.js development',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The Artisan command to execute (e.g., "make:component Button")'
      },
      args: {
        type: 'object',
        description: 'Command arguments as key-value pairs',
        additionalProperties: true
      },
      options: {
        type: 'object',
        description: 'Command options as key-value pairs',
        additionalProperties: true
      }
    },
    required: ['command']
  }
}
```

### Tool Usage

```typescript
// Basic command execution
await server.callTool('artisan', {
  command: 'make:component Button',
  args: {},
  options: {}
})

// Command with arguments and options
await server.callTool('artisan', {
  command: 'make:component UserProfile',
  args: {
    name: 'UserProfile'
  },
  options: {
    type: 'feature',
    withTests: true,
    withStyles: true
  }
})
```

## 📋 Command Registry API

### Command Registration

```typescript
interface ArtisanCommand {
  name: string
  description: string
  signature: string
  arguments: CommandArgument[]
  options: CommandOption[]
  handler: (args: CommandArguments, options: CommandOptions) => Promise<CommandResult>
}

// Register a command
commandRegistry.register(command)
```

### Command Execution

```typescript
// Execute a command
const result = await commandRegistry.execute('make:component', {
  name: 'Button'
}, {
  type: 'ui',
  withTests: true
})
```

### Command Discovery

```typescript
// Get all registered commands
const commands = commandRegistry.getAllCommands()

// Get command by name
const command = commandRegistry.getCommand('make:component')

// Get commands by category
const makeCommands = commandRegistry.getCommandsByCategory('make')
```

## 🏗️ Project Analyzer API

### Project Analysis

```typescript
interface ProjectAnalyzer {
  analyzeProject(): Promise<ProjectStructure>
  detectNextJS(): Promise<boolean>
  detectDatabase(): Promise<boolean>
  detectAuthentication(): Promise<boolean>
  detectAdmin(): Promise<boolean>
  getComponents(): Promise<string[]>
  getServices(): Promise<string[]>
  getRepositories(): Promise<string[]>
  getPages(): Promise<string[]>
  getApiRoutes(): Promise<string[]>
}

// Analyze current project
const analyzer = new ProjectAnalyzer()
const structure = await analyzer.analyzeProject()
```

### Project Structure

```typescript
interface ProjectStructure {
  isNextJS: boolean
  hasDatabase: boolean
  hasAuthentication: boolean
  hasAdmin: boolean
  components: string[]
  services: string[]
  repositories: string[]
  pages: string[]
  apiRoutes: string[]
  packageJson?: any
  nextConfig?: any
  tailwindConfig?: any
  typescriptConfig?: any
}
```

## 📁 File Generator API

### File Generation

```typescript
interface FileGenerator {
  generateFile(template: string, data: any, outputPath: string): Promise<void>
  generateComponent(config: ComponentConfig): Promise<string[]>
  generateService(config: ServiceConfig): Promise<string[]>
  generateMigration(config: MigrationConfig): Promise<string[]>
  generatePage(config: PageConfig): Promise<string[]>
  generateApi(config: ApiConfig): Promise<string[]>
  generateMiddleware(config: MiddlewareConfig): Promise<string[]>
}
```

### Component Generation

```typescript
interface ComponentConfig {
  name: string
  type: 'ui' | 'feature' | 'layout'
  withTests: boolean
  withStyles: boolean
  withStory: boolean
  withProps: boolean
}

const generator = new FileGenerator()
const files = await generator.generateComponent({
  name: 'Button',
  type: 'ui',
  withTests: true,
  withStyles: false,
  withStory: false,
  withProps: true
})
```

### Service Generation

```typescript
interface ServiceConfig {
  name: string
  withRepository: boolean
  withValidation: boolean
  withTests: boolean
}

const files = await generator.generateService({
  name: 'UserService',
  withRepository: true,
  withValidation: true,
  withTests: true
})
```

### Migration Generation

```typescript
interface MigrationConfig {
  name: string
  action: 'create' | 'modify' | 'drop'
  table?: string
  columns?: ColumnDefinition[]
}

interface ColumnDefinition {
  name: string
  type: string
  nullable?: boolean
  default?: any
  primary?: boolean
  unique?: boolean
}

const files = await generator.generateMigration({
  name: 'create_users_table',
  action: 'create',
  table: 'users',
  columns: [
    { name: 'id', type: 'string', primary: true },
    { name: 'email', type: 'string', unique: true },
    { name: 'name', type: 'string', nullable: false }
  ]
})
```

## 🎨 Template Manager API

### Template Rendering

```typescript
interface TemplateManager {
  render(template: string, data: any): string
  renderFile(templatePath: string, data: any): Promise<string>
  getTemplate(name: string): string
  registerTemplate(name: string, template: string): void
}

const templateManager = new TemplateManager()
const rendered = templateManager.render('component', {
  name: 'Button',
  props: true,
  tests: true
})
```

### Built-in Templates

```typescript
// Component template
const componentTemplate = `
interface {{name}}Props {
  // Add props here
}

export function {{name}}(props: {{name}}Props) {
  return <div>{{name}}</div>
}
`

// Service template
const serviceTemplate = `
export class {{name}} {
  constructor() {
    // Initialize service
  }
}
`

// Migration template
const migrationTemplate = `
import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Migration logic
}

export async function down(db: Kysely<any>): Promise<void> {
  // Rollback logic
}
`
```

## ✅ Validation API

### Input Validation

```typescript
interface Validation {
  validateCommand(command: string): ValidationResult
  validateArguments(args: any, schema: any): ValidationResult
  validateOptions(options: any, schema: any): ValidationResult
  validateProjectStructure(): ValidationResult
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const validation = new Validation()
const result = validation.validateCommand('make:component Button')
```

### Validation Schemas

```typescript
// Component command validation
const componentSchema = {
  name: {
    type: 'string',
    required: true,
    pattern: /^[A-Z][a-zA-Z0-9]*$/
  },
  type: {
    type: 'string',
    enum: ['ui', 'feature', 'layout'],
    default: 'ui'
  }
}

// Service command validation
const serviceSchema = {
  name: {
    type: 'string',
    required: true,
    pattern: /^[A-Z][a-zA-Z0-9]*Service$/
  }
}
```

## 🚨 Error Handler API

### Error Handling

```typescript
interface ErrorHandler {
  handle(error: Error, context?: any): ErrorResult
  handleValidationError(error: ValidationError): ErrorResult
  handleFileSystemError(error: FileSystemError): ErrorResult
  handleDatabaseError(error: DatabaseError): ErrorResult
  handleCommandError(error: CommandError): ErrorResult
}

interface ErrorResult {
  success: false
  message: string
  error: string
  stack?: string
  context?: any
}

const errorHandler = new ErrorHandler()
const result = errorHandler.handle(error, { command: 'make:component' })
```

### Error Types

```typescript
class ValidationError extends Error {
  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

class FileSystemError extends Error {
  constructor(message: string, path?: string) {
    super(message)
    this.name = 'FileSystemError'
    this.path = path
  }
}

class DatabaseError extends Error {
  constructor(message: string, operation?: string) {
    super(message)
    this.name = 'DatabaseError'
    this.operation = operation
  }
}

class CommandError extends Error {
  constructor(message: string, command?: string) {
    super(message)
    this.name = 'CommandError'
    this.command = command
  }
}
```

## 📊 Command Result API

### Result Structure

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
    coverage?: CoverageReport
  }
}

interface CoverageReport {
  statements: number
  branches: number
  functions: number
  lines: number
}
```

### Success Result Example

```typescript
{
  success: true,
  message: 'Component created successfully',
  data: {
    files: [
      'src/components/ui/Button/Button.tsx',
      'src/components/ui/Button/Button.test.tsx'
    ],
    directories: [
      'src/components/ui/Button'
    ]
  }
}
```

### Error Result Example

```typescript
{
  success: false,
  message: 'Failed to create component',
  error: 'Component name must start with uppercase letter',
  context: {
    command: 'make:component',
    args: { name: 'button' }
  }
}
```

## 🔧 Configuration API

### Server Configuration

```typescript
interface ArtisanConfig {
  projectRoot: string
  templatesDir: string
  outputDir: string
  databaseUrl: string
  enableLogging: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

const config: ArtisanConfig = {
  projectRoot: process.cwd(),
  templatesDir: './templates',
  outputDir: './src',
  databaseUrl: './app.db',
  enableLogging: true,
  logLevel: 'info'
}
```

### Command Configuration

```typescript
interface CommandConfig {
  name: string
  description: string
  signature: string
  arguments: CommandArgument[]
  options: CommandOption[]
  handler: CommandHandler
}

interface CommandArgument {
  name: string
  description: string
  type: 'string' | 'number' | 'boolean' | 'array'
  required: boolean
  default?: any
}

interface CommandOption {
  name: string
  description: string
  type: 'string' | 'number' | 'boolean' | 'array'
  default?: any
  alias?: string
}
```

## 🧪 Testing API

### Test Utilities

```typescript
interface TestUtils {
  createMockProject(): MockProject
  createMockCommand(): MockCommand
  createMockFileSystem(): MockFileSystem
  createMockDatabase(): MockDatabase
}

interface MockProject {
  structure: ProjectStructure
  files: Map<string, string>
  directories: Set<string>
}

interface MockCommand {
  name: string
  handler: jest.Mock
  result: CommandResult
}
```

### Test Fixtures

```typescript
// Test data fixtures
export const testData = {
  components: [
    { name: 'Button', type: 'ui' },
    { name: 'UserProfile', type: 'feature' }
  ],
  services: [
    { name: 'UserService', withRepository: true },
    { name: 'PostService', withValidation: true }
  ],
  migrations: [
    { name: 'create_users_table', action: 'create' },
    { name: 'add_email_to_users', action: 'modify' }
  ]
}

// Mock implementations
export const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  pathExists: jest.fn()
}

export const mockMCP = {
  callTool: jest.fn(),
  registerTool: jest.fn()
}
```

## 📈 Performance API

### Performance Monitoring

```typescript
interface PerformanceMonitor {
  startTimer(name: string): void
  endTimer(name: string): number
  getMetrics(): PerformanceMetrics
  reset(): void
}

interface PerformanceMetrics {
  commandExecution: number
  fileGeneration: number
  templateRendering: number
  databaseOperations: number
}

const monitor = new PerformanceMonitor()
monitor.startTimer('commandExecution')
// ... execute command
const duration = monitor.endTimer('commandExecution')
```

### Caching

```typescript
interface Cache {
  get(key: string): any
  set(key: string, value: any, ttl?: number): void
  delete(key: string): void
  clear(): void
  has(key: string): boolean
}

const cache = new Cache()
cache.set('projectStructure', structure, 300000) // 5 minutes
const cached = cache.get('projectStructure')
```

## 🔐 Security API

### Input Sanitization

```typescript
interface Security {
  sanitizeInput(input: string): string
  validatePath(path: string): boolean
  checkPermissions(path: string): boolean
  escapeHtml(html: string): string
}

const security = new Security()
const sanitized = security.sanitizeInput(userInput)
const isValid = security.validatePath(filePath)
```

### Path Validation

```typescript
// Allowed paths
const allowedPaths = [
  'src/components/',
  'src/lib/services/',
  'src/lib/database/migrations/',
  'src/app/'
]

// Validate path is within allowed directories
const isValidPath = (path: string): boolean => {
  return allowedPaths.some(allowed => path.startsWith(allowed))
}
```

---

## 📚 Usage Examples

### Complete API Usage Example

```typescript
import { ArtisanServer } from './src/index.js'

// Initialize server
const server = new ArtisanServer()

// Execute command via MCP
const result = await server.callTool('artisan', {
  command: 'make:component UserProfile',
  args: {
    name: 'UserProfile'
  },
  options: {
    type: 'feature',
    withTests: true,
    withStyles: true,
    withStory: false
  }
})

// Handle result
if (result.success) {
  console.log('Component created:', result.data.files)
} else {
  console.error('Error:', result.message)
}
```

### Direct API Usage

```typescript
import { CommandRegistry } from './src/core/command-registry.js'
import { FileGenerator } from './src/utils/file-generator.js'

// Direct command execution
const registry = new CommandRegistry()
const generator = new FileGenerator()

// Register and execute command
const result = await registry.execute('make:component', {
  name: 'Button'
}, {
  type: 'ui',
  withTests: true
})

// Generate files directly
const files = await generator.generateComponent({
  name: 'Button',
  type: 'ui',
  withTests: true,
  withStyles: false,
  withStory: false,
  withProps: true
})
```

---

**For more information, see the [Commands Reference](COMMANDS.md) or [main documentation](../README.md).**
