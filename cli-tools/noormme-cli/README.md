# NOORMME CLI

A powerful command-line tool for seamless Next.js template deployment with automatic setup, following the NORMIE DEV methodology.

## Features

- 🚀 **Seamless Project Creation**: Generate complete Next.js projects with NOORMME integration
- ⚡ **Automatic Setup**: Install dependencies, setup database, run migrations, and seed data automatically
- 🛡️ **Timeout Protection**: Prevents hanging operations with configurable timeouts
- 📊 **Progress Indicators**: Real-time progress feedback with spinners and status updates
- 🔧 **Smart Fallbacks**: Multiple installation strategies and error recovery
- 🎯 **NORMIE DEV Methodology**: Code that sparks joy - clean, simple, and effective

## Installation

```bash
# Install globally
npm install -g noormme-cli

# Or use with npx
npx noormme-cli new my-app
```

## Usage

### Create a New Project

```bash
# Create a new Next.js project with full setup
noormme new my-app

# Create with specific options
noormme new my-app --auth --admin --tailwind --tests

# Skip certain steps
noormme new my-app --skip-deps --skip-db

# Set custom timeout (default: 300 seconds)
noormme new my-app --timeout 600
```

### Deploy Existing Project

```bash
# Deploy current directory
noormme deploy

# Deploy specific project
noormme deploy ./my-project

# Deploy with options
noormme deploy --skip-deps --timeout 600
```

## Options

### New Command Options

- `-t, --template <template>`: Project template (default: nextjs)
- `--auth`: Include authentication (NextAuth) (default: true)
- `--admin`: Include admin panel (default: true)
- `--tailwind`: Include Tailwind CSS (default: true)
- `--tests`: Include test setup (default: false)
- `--skip-deps`: Skip dependency installation
- `--skip-db`: Skip database setup
- `--skip-migrate`: Skip database migration
- `--skip-seed`: Skip database seeding
- `--timeout <seconds>`: Timeout for operations (default: 300)

### Deploy Command Options

- `--skip-deps`: Skip dependency installation
- `--skip-db`: Skip database setup
- `--skip-migrate`: Skip database migration
- `--skip-seed`: Skip database seeding
- `--timeout <seconds>`: Timeout for operations (default: 300)

## What It Does

### 1. Project Generation
- Copies NOORMME Next.js template
- Generates configuration files (.env.local, tsconfig.json, etc.)
- Updates package.json with project-specific settings
- Creates proper folder structure

### 2. Dependency Installation
- Detects package manager (npm/yarn/pnpm)
- Installs all dependencies
- Provides fallback installation methods
- Handles installation timeouts gracefully

### 3. Database Setup
- Creates SQLite database with WAL mode
- Enables performance optimizations
- Sets up proper indexes and constraints
- Configures foreign key support

### 4. Migration & Seeding
- Runs database migrations
- Seeds database with initial data
- Handles custom migration/seed scripts
- Provides fallback basic schema

### 5. Progress Tracking
- Real-time progress indicators
- Spinner animations for long operations
- Duration tracking for each step
- Comprehensive error reporting

## Templates

The CLI supports multiple project templates:

- **nextjs**: Complete Next.js application with NOORMME integration
- More templates coming soon...

## Error Handling

The CLI includes comprehensive error handling:

- **Timeout Protection**: All operations have configurable timeouts
- **Fallback Strategies**: Multiple approaches for dependency installation
- **Cleanup on Failure**: Removes partially created projects
- **Detailed Error Messages**: Clear, actionable error information

## Examples

### Basic Project Creation

```bash
# Create a simple blog application
noormme new my-blog

# This will:
# 1. Create project directory
# 2. Copy Next.js template
# 3. Install dependencies
# 4. Setup SQLite database
# 5. Run migrations
# 6. Seed initial data
# 7. Show success message with next steps
```

### Advanced Project Creation

```bash
# Create a full-featured application
noormme new my-app --auth --admin --tailwind --tests --timeout 600

# This will create a project with:
# - NextAuth authentication
# - Admin panel
# - Tailwind CSS styling
# - Test setup
# - 10-minute timeout for operations
```

### Deploy Existing Project

```bash
# Deploy an existing NOORMME project
cd my-existing-project
noormme deploy

# This will:
# 1. Validate project structure
# 2. Install dependencies
# 3. Setup database
# 4. Run migrations
# 5. Seed data
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Make sure you have write permissions in the target directory
2. **Network Issues**: Check your internet connection for dependency installation
3. **Timeout Errors**: Increase timeout with `--timeout` option
4. **Template Not Found**: Ensure the template directory exists in the correct location

### Debug Mode

```bash
# Run with verbose output
DEBUG=noormme* noormme new my-app
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📚 [Documentation](https://docs.noormme.dev)
- 🐛 [Issue Tracker](https://github.com/noormme/noormme-cli/issues)
- 💬 [Discord Community](https://discord.gg/noormme)
- 📧 [Email Support](mailto:support@noormme.dev)
