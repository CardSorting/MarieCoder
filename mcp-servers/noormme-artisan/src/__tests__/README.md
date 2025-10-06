# NOORMME Artisan Tests

This directory contains comprehensive tests for the NOORMME Artisan MCP server.

## Test Structure

```
src/__tests__/
├── setup.ts                    # Test setup and configuration
├── fixtures/                   # Test fixtures and mock data
│   ├── index.ts               # Export all fixtures
│   ├── test-data.ts           # Test data and mock objects
│   ├── mock-fs.ts             # Mock file system operations
│   ├── mock-mcp.ts            # Mock MCP server operations
│   ├── mock-commands.ts       # Mock command implementations
│   └── mock-utils.ts          # Mock utility functions
├── core/                      # Core functionality tests
│   ├── index.ts               # Export all core tests
│   ├── command-registry.test.ts
│   └── project-analyzer.test.ts
├── commands/                  # Command tests
│   ├── index.ts               # Export all command tests
│   ├── make/                  # Make command tests
│   │   ├── component.test.ts
│   │   ├── service.test.ts
│   │   └── migration.test.ts
│   ├── database/              # Database command tests
│   │   ├── migrate.test.ts
│   │   └── seed.test.ts
│   └── dev/                   # Development command tests
│       ├── serve.test.ts
│       └── test.test.ts
├── utils/                     # Utility tests
│   ├── index.ts               # Export all utility tests
│   ├── file-generator.test.ts
│   ├── template-manager.test.ts
│   ├── validation.test.ts
│   └── error-handler.test.ts
├── index.test.ts              # Main server tests
├── jest.config.js             # Jest configuration
└── README.md                  # This file
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- component.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="make:component"
```

## Test Categories

### Core Tests
- **Command Registry**: Tests for command registration, execution, and validation
- **Project Analyzer**: Tests for project structure analysis and detection

### Command Tests
- **Make Commands**: Tests for component, service, migration, page, API, and middleware generation
- **Database Commands**: Tests for migration and seeding operations
- **Development Commands**: Tests for serve and test commands

### Utility Tests
- **File Generator**: Tests for file generation and template rendering
- **Template Manager**: Tests for template management and rendering
- **Validation**: Tests for input validation and error handling
- **Error Handler**: Tests for error handling and reporting

## Test Fixtures

### Mock File System
- Simulates file system operations
- Provides test data and directory structures
- Handles file creation, reading, and writing

### Mock MCP Server
- Simulates MCP server operations
- Provides tool schemas and execution results
- Handles tool registration and execution

### Mock Commands
- Simulates command implementations
- Provides test data and expected results
- Handles command execution and validation

### Mock Utilities
- Simulates utility function operations
- Provides test data and expected results
- Handles validation and error scenarios

## Test Data

### Project Structure
- Mock project directories and files
- Simulated Next.js project structure
- Database and authentication setup

### Command Results
- Expected command execution results
- Success and error scenarios
- File generation and validation results

### Template Content
- Mock template files and content
- Component, service, and migration templates
- Page, API, and middleware templates

## Coverage Requirements

- **Branches**: 80% coverage
- **Functions**: 80% coverage
- **Lines**: 80% coverage
- **Statements**: 80% coverage

## Test Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Mock Usage
- Mock external dependencies
- Use consistent mock data
- Reset mocks between tests

### Error Testing
- Test both success and error scenarios
- Validate error messages and types
- Test edge cases and boundary conditions

### File System Testing
- Use mock file system for isolation
- Test file creation and validation
- Verify directory structure creation

## Debugging Tests

### Run Tests with Debug Output
```bash
npm test -- --verbose
```

### Run Single Test with Debug
```bash
npm test -- --testNamePattern="specific test" --verbose
```

### Debug Test File
```bash
node --inspect-brk node_modules/.bin/jest --runInBand component.test.ts
```

## Continuous Integration

Tests are automatically run in CI/CD pipelines with:
- Node.js 18+
- TypeScript compilation
- Test execution and coverage reporting
- Linting and code quality checks

## Contributing

When adding new tests:
1. Follow existing test patterns
2. Add appropriate fixtures and mocks
3. Ensure adequate coverage
4. Update this README if needed
5. Run tests before submitting changes
