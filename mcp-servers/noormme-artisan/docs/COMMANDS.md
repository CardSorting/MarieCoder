# NOORMME Artisan Commands Reference

This document provides detailed information about all available Artisan commands.

## 📋 Command Categories

### Make Commands
Commands for generating new files and components.

### Project Commands
Commands for project management and scaffolding.

### Database Commands
Commands for database operations and migrations.

### Development Commands
Commands for development workflow and testing.

### Install Commands
Commands for installing and configuring features.

---

## 🔨 Make Commands

### `make:component`

Create a new React component with optional tests, styles, and stories.

**Signature:**
```bash
artisan make:component <name> [options]
```

**Arguments:**
- `name` (required) - Name of the component

**Options:**
- `--type` - Type of component (`ui`, `feature`, `layout`) [default: `ui`]
- `--with-tests` - Include test file [default: `true`]
- `--with-styles` - Include style file [default: `false`]
- `--with-story` - Include Storybook story [default: `false`]
- `--with-props` - Include props interface [default: `true`]

**Examples:**
```bash
# Create a basic UI component
artisan make:component Button

# Create a feature component with tests and styles
artisan make:component UserProfile --type=feature --with-tests --with-styles

# Create a layout component with Storybook story
artisan make:component MainLayout --type=layout --with-story
```

**Generated Files:**
```
src/components/ui/Button/
├── Button.tsx
├── Button.test.tsx
├── Button.stories.tsx (optional)
└── Button.module.css (optional)
```

### `make:service`

Generate a service class with optional repository, business logic, tests, and validation schemas.

**Signature:**
```bash
artisan make:service <name> [options]
```

**Arguments:**
- `name` (required) - Name of the service

**Options:**
- `--with-repository` - Include repository integration [default: `true`]
- `--with-validation` - Include validation schema [default: `true`]
- `--with-tests` - Include test file [default: `true`]

**Examples:**
```bash
# Create a basic service
artisan make:service UserService

# Create a service with repository and validation
artisan make:service PaymentService --with-repository --with-validation
```

**Generated Files:**
```
src/lib/services/
├── UserService.ts
├── UserService.test.ts
└── UserService.validation.ts (optional)
```

### `make:migration`

Create a database migration file with Kysely syntax.

**Signature:**
```bash
artisan make:migration <name> [options]
```

**Arguments:**
- `name` (required) - Name of the migration

**Options:**
- `--action` - Migration action (`create`, `modify`, `drop`) [default: `create`]
- `--table` - Table name for the migration

**Examples:**
```bash
# Create a migration for users table
artisan make:migration create_users_table --action=create --table=users

# Create a migration to modify existing table
artisan make:migration add_email_to_users --action=modify --table=users

# Create a migration to drop a table
artisan make:migration drop_old_table --action=drop --table=old_table
```

**Generated Files:**
```
src/lib/database/migrations/
└── 20240101000000_create_users_table.ts
```

### `make:page`

Generate a new Next.js page component.

**Signature:**
```bash
artisan make:page <name> [options]
```

**Arguments:**
- `name` (required) - Name of the page

**Options:**
- `--route` - Route path for the page
- `--with-layout` - Include layout file [default: `true`]
- `--with-error` - Include error page [default: `true`]
- `--with-loading` - Include loading page [default: `true`]

**Examples:**
```bash
# Create a basic page
artisan make:page About

# Create a page with custom route
artisan make:page UserProfile --route=/profile/[id]
```

**Generated Files:**
```
src/app/about/
├── page.tsx
├── layout.tsx (optional)
├── error.tsx (optional)
└── loading.tsx (optional)
```

### `make:api`

Create a new Next.js API route.

**Signature:**
```bash
artisan make:api <name> [options]
```

**Arguments:**
- `name` (required) - Name of the API route

**Options:**
- `--route` - Route path for the API
- `--method` - HTTP method (`GET`, `POST`, `PUT`, `DELETE`) [default: `GET`]
- `--with-auth` - Include authentication [default: `false`]
- `--with-validation` - Include request validation [default: `true`]

**Examples:**
```bash
# Create a basic API route
artisan make:api users

# Create a protected API route
artisan make:api users --method=POST --with-auth --with-validation
```

**Generated Files:**
```
src/app/api/users/
└── route.ts
```

### `make:middleware`

Generate a new Next.js middleware file.

**Signature:**
```bash
artisan make:middleware <name> [options]
```

**Arguments:**
- `name` (required) - Name of the middleware

**Options:**
- `--type` - Middleware type (`auth`, `cors`, `rate-limit`, `custom`) [default: `custom`]
- `--with-tests` - Include test file [default: `true`]

**Examples:**
```bash
# Create a custom middleware
artisan make:middleware CustomAuth

# Create an authentication middleware
artisan make:middleware AuthMiddleware --type=auth
```

**Generated Files:**
```
src/middleware/
├── CustomAuth.ts
└── CustomAuth.test.ts (optional)
```

---

## 🏗️ Project Commands

### `new:project`

Scaffold a new Next.js project with modern tooling and best practices.

**Signature:**
```bash
artisan new:project <name> [options]
```

**Arguments:**
- `name` (required) - Name of the project

**Options:**
- `--template` - Project template (`minimal`, `full`, `admin`) [default: `full`]
- `--with-auth` - Include authentication setup [default: `false`]
- `--with-admin` - Include admin panel [default: `false`]
- `--with-database` - Include database setup [default: `true`]
- `--with-tests` - Include testing setup [default: `true`]

**Examples:**
```bash
# Create a minimal project
artisan new:project my-app --template=minimal

# Create a full-featured project
artisan new:project my-app --template=full --with-auth --with-admin
```

**Generated Structure:**
```
my-app/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── types/
├── public/
├── package.json
├── next.config.js
├── tailwind.config.js
└── README.md
```

---

## 🗄️ Database Commands

### `db:migrate`

Run database migrations with preview mode and step control.

**Signature:**
```bash
artisan db:migrate [options]
```

**Options:**
- `--step` - Number of migrations to run
- `--force` - Force migration without confirmation
- `--pretend` - Show SQL preview without executing

**Examples:**
```bash
# Run all pending migrations
artisan db:migrate

# Run one migration at a time
artisan db:migrate --step=1

# Preview migrations without executing
artisan db:migrate --pretend

# Force migration without confirmation
artisan db:migrate --force
```

**Output:**
```
Running migrations...
✓ 20240101000000_create_users_table
✓ 20240101000001_create_posts_table
✓ 20240101000002_add_email_to_users

Successfully ran 3 migrations
```

### `db:seed`

Seed the database with initial data.

**Signature:**
```bash
artisan db:seed [options]
```

**Options:**
- `--class` - Specific seeder class to run
- `--force` - Force seeding without confirmation

**Examples:**
```bash
# Run all seeders
artisan db:seed

# Run specific seeder
artisan db:seed --class=UserSeeder

# Force seeding without confirmation
artisan db:seed --force
```

**Output:**
```
Running seeders...
✓ UserSeeder: 10 users created
✓ PostSeeder: 25 posts created
✓ CategorySeeder: 5 categories created

Successfully ran 3 seeders (40 records total)
```

---

## 🚀 Development Commands

### `serve`

Start the development server with database integration and hot reload.

**Signature:**
```bash
artisan serve [options]
```

**Options:**
- `--port` - Port number [default: `3000`]
- `--host` - Host address [default: `localhost`]
- `--with-database` - Include database connection [default: `true`]

**Examples:**
```bash
# Start server on default port
artisan serve

# Start server on custom port
artisan serve --port=8080

# Start server with database
artisan serve --with-database
```

**Output:**
```
Starting development server...
✓ Database connected
✓ Server running on http://localhost:3000
✓ Hot reload enabled
✓ Database integration active

Press Ctrl+C to stop the server
```

### `test`

Run the test suite with coverage and watch mode.

**Signature:**
```bash
artisan test [options]
```

**Options:**
- `--watch` - Run tests in watch mode [default: `false`]
- `--coverage` - Generate coverage report [default: `true`]
- `--pattern` - Test file pattern to match

**Examples:**
```bash
# Run all tests
artisan test

# Run tests in watch mode
artisan test --watch

# Run tests with coverage
artisan test --coverage

# Run specific test pattern
artisan test --pattern="*.component.test.ts"
```

**Output:**
```
Running tests...
✓ 45 tests passed
✓ 3 tests skipped
✓ 0 tests failed
✓ 87% coverage

Test Results:
- Statements: 87%
- Branches: 82%
- Functions: 91%
- Lines: 89%
```

---

## 📦 Install Commands

### `install:auth`

Set up authentication with NextAuth.js and popular providers.

**Signature:**
```bash
artisan install:auth [options]
```

**Options:**
- `--providers` - Authentication providers (`google`, `github`, `email`) [default: `google,github`]
- `--with-database` - Include database session storage [default: `true`]

**Examples:**
```bash
# Install with Google and GitHub providers
artisan install:auth --providers=google,github

# Install with email provider
artisan install:auth --providers=email --with-database
```

**Generated Files:**
```
src/lib/auth.ts
src/app/api/auth/[...nextauth]/route.ts
src/app/(auth)/
├── signin/
├── signup/
└── layout.tsx
```

### `install:admin`

Install admin panel with user management and dashboard.

**Signature:**
```bash
artisan install:admin [options]
```

**Options:**
- `--with-users` - Include user management [default: `true`]
- `--with-roles` - Include role-based access control [default: `true`]
- `--with-dashboard` - Include admin dashboard [default: `true`]

**Examples:**
```bash
# Install basic admin panel
artisan install:admin

# Install with user management and roles
artisan install:admin --with-users --with-roles
```

**Generated Files:**
```
src/app/admin/
├── dashboard/
├── users/
├── roles/
└── layout.tsx
src/components/admin/
├── UserTable.tsx
├── RoleManager.tsx
└── Dashboard.tsx
```

---

## 🔧 Global Options

All commands support these global options:

- `--help` - Show command help
- `--version` - Show version information
- `--verbose` - Enable verbose output
- `--quiet` - Suppress output
- `--no-interaction` - Disable interactive prompts

## 📝 Command Examples

### Complete Workflow Example

```bash
# 1. Create a new project
artisan new:project my-blog --template=full --with-auth --with-admin

# 2. Create database migrations
artisan make:migration create_users_table --action=create --table=users
artisan make:migration create_posts_table --action=create --table=posts

# 3. Run migrations
artisan db:migrate

# 4. Create seeders
artisan make:seeder UserSeeder
artisan make:seeder PostSeeder

# 5. Seed database
artisan db:seed

# 6. Create components
artisan make:component PostCard --type=feature --with-tests --with-styles
artisan make:component UserProfile --type=feature --with-tests

# 7. Create services
artisan make:service PostService --with-repository --with-validation
artisan make:service UserService --with-repository

# 8. Create API routes
artisan make:api posts --method=GET --with-auth
artisan make:api posts --method=POST --with-auth --with-validation

# 9. Create pages
artisan make:page posts --route=/posts
artisan make:page post --route=/posts/[id]

# 10. Start development server
artisan serve --with-database
```

### Testing Workflow

```bash
# Run tests with coverage
artisan test --coverage

# Run tests in watch mode
artisan test --watch

# Run specific test pattern
artisan test --pattern="*.service.test.ts"
```

### Database Workflow

```bash
# Create migration
artisan make:migration add_timestamps_to_posts --action=modify --table=posts

# Preview migration
artisan db:migrate --pretend

# Run migration
artisan db:migrate

# Create and run seeder
artisan make:seeder PostSeeder
artisan db:seed --class=PostSeeder
```

---

## 🚨 Troubleshooting

### Common Issues

**Command not found:**
```bash
# Ensure the server is running
npm start

# Check if command is registered
artisan list
```

**Permission errors:**
```bash
# Check file permissions
ls -la src/

# Fix permissions if needed
chmod -R 755 src/
```

**Database connection errors:**
```bash
# Check database file exists
ls -la app.db

# Initialize database if needed
artisan db:migrate
```

**Template rendering errors:**
```bash
# Check template syntax
artisan make:component Test --pretend

# Verify template variables
artisan make:component Test --verbose
```

### Getting Help

```bash
# Show all available commands
artisan list

# Show command help
artisan make:component --help

# Show version information
artisan --version
```

---

**For more information, see the [main documentation](../README.md) or [GitHub repository](https://github.com/your-org/noormme-artisan).**
