# NOORMME CLI Usage Guide

## Overview

The NOORMME CLI is a powerful tool for seamless Next.js template deployment with automatic setup. It follows the NORMIE DEV methodology - "Does this spark joy?" - by eliminating complexity and providing a delightful developer experience.

## Quick Start

### Install the CLI

```bash
# Install globally
npm install -g noormme-cli

# Or use with npx (recommended)
npx noormme-cli new my-app
```

### Create a New Project

```bash
# Basic project creation
noormme new my-app

# This will:
# 1. Create project directory
# 2. Copy NOORMME Next.js template
# 3. Install dependencies
# 4. Setup SQLite database with WAL mode
# 5. Run migrations
# 6. Seed initial data
# 7. Show success message with next steps
```

## Commands

### `new <project-name>`

Creates a new Next.js project with NOORMME integration.

**Options:**
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

**Examples:**
```bash
# Create a simple blog
noormme new my-blog

# Create a full-featured app with tests
noormme new my-app --tests --timeout 600

# Create without authentication
noormme new my-app --no-auth

# Skip database setup for quick prototyping
noormme new my-app --skip-db
```

### `deploy [project-path]`

Deploys an existing NOORMME project (installs deps, setup DB, migrate, seed).

**Options:**
- `--skip-deps`: Skip dependency installation
- `--skip-db`: Skip database setup
- `--skip-migrate`: Skip database migration
- `--skip-seed`: Skip database seeding
- `--timeout <seconds>`: Timeout for operations (default: 300)

**Examples:**
```bash
# Deploy current directory
noormme deploy

# Deploy specific project
noormme deploy ./my-project

# Deploy with custom timeout
noormme deploy --timeout 600
```

## Features

### 🚀 Seamless Project Creation
- Copies complete NOORMME Next.js template
- Generates configuration files (.env.local, tsconfig.json, etc.)
- Updates package.json with project-specific settings
- Creates proper folder structure following Django-style organization

### ⚡ Automatic Setup
- **Dependency Installation**: Detects package manager (npm/yarn/pnpm) and installs dependencies
- **Database Setup**: Creates SQLite database with WAL mode optimization
- **Migration**: Runs database migrations automatically
- **Seeding**: Seeds database with initial data
- **Configuration**: Sets up environment variables and configuration files

### 🛡️ Timeout Protection
- All operations have configurable timeouts (default: 5 minutes)
- Prevents hanging operations
- Graceful failure handling with cleanup

### 📊 Progress Indicators
- Real-time progress feedback with spinners
- Duration tracking for each step
- Comprehensive error reporting
- Success confirmation with next steps

### 🔧 Smart Fallbacks
- Multiple installation strategies for dependencies
- Alternative package manager support
- Fallback database schema creation
- Error recovery mechanisms

## Project Structure

The CLI creates projects with the following structure:

```
my-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth route group
│   │   ├── admin/             # Admin panel
│   │   ├── api/               # API routes
│   │   └── dashboard/         # Protected dashboard
│   ├── lib/
│   │   ├── db.ts              # NOORMME database instance
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── services/          # Service layer
│   │   └── repositories/      # Repository layer
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   └── admin/             # Admin panel components
│   └── types/
│       └── database.ts        # Auto-generated types
├── scripts/
│   ├── migrate.ts             # Database migrations
│   └── seed.ts                # Database seeding
├── .env.local                 # Environment variables
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```

## Templates

### Next.js Template
The default template includes:
- **Next.js 15** with App Router
- **TypeScript** with strict configuration
- **NextAuth.js** authentication with RBAC
- **Admin Panel** with user and role management
- **Payment Services** (Stripe & PayPal)
- **Queue System** with two-tier architecture
- **NOORMME Architecture** patterns
- **SQLite** with Kysely query builder
- **Tailwind CSS** for styling
- **Repository Pattern** implementation
- **Service Layer** architecture

## Error Handling

The CLI includes comprehensive error handling:

### Timeout Protection
```bash
# Set custom timeout (in seconds)
noormme new my-app --timeout 600
```

### Cleanup on Failure
If project creation fails, the CLI automatically:
- Removes partially created project directory
- Cleans up any installed dependencies
- Shows clear error messages
- Provides actionable next steps

### Fallback Strategies
- **Dependency Installation**: Tries multiple package managers
- **Database Setup**: Falls back to basic schema if migrations fail
- **Template Copying**: Creates minimal structure if template not found

## Best Practices

### 1. Use Appropriate Timeouts
```bash
# For slow networks or large projects
noormme new my-app --timeout 600

# For quick prototyping
noormme new my-app --skip-deps --skip-db
```

### 2. Skip Unnecessary Steps
```bash
# For development/testing
noormme new my-app --skip-deps --skip-db --skip-migrate --skip-seed

# For production deployment
noormme deploy --timeout 900
```

### 3. Use Project-Specific Options
```bash
# Blog without admin panel
noormme new my-blog --no-admin

# API-only project without frontend
noormme new my-api --no-tailwind --no-admin
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   # Make sure you have write permissions
   sudo chown -R $USER:$USER /path/to/project
   ```

2. **Network Issues**
   ```bash
   # Increase timeout for slow connections
   noormme new my-app --timeout 900
   ```

3. **Template Not Found**
   ```bash
   # The CLI will create a minimal structure automatically
   # Check that you're running from the correct directory
   ```

4. **Database Errors**
   ```bash
   # Skip database setup for quick prototyping
   noormme new my-app --skip-db
   ```

### Debug Mode

```bash
# Run with verbose output
DEBUG=noormme* noormme new my-app
```

### Clean Installation

```bash
# Remove and reinstall if needed
rm -rf node_modules package-lock.json
npm install
```

## Integration with Existing Workflows

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Deploy NOORMME Project
  run: |
    npx noormme-cli deploy
    npm run build
    npm run start
```

### Docker Integration

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx noormme-cli deploy --skip-deps
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## Contributing

We welcome contributions! The CLI is built with:
- **TypeScript** for type safety
- **Commander.js** for CLI interface
- **Chalk** for colored output
- **ES Modules** for modern JavaScript

## Support

- 📚 [Documentation](https://docs.noormme.dev)
- 🐛 [Issue Tracker](https://github.com/noormme/noormme-cli/issues)
- 💬 [Discord Community](https://discord.gg/noormme)
- 📧 [Email Support](mailto:support@noormme.dev)

## License

MIT License - see [LICENSE](LICENSE) for details.
