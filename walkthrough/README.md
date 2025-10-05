# Normie Dev Setup & Walkthrough

Welcome to **Normie Dev** - your specialized AI development assistant built on top of Cline. Normie Dev is like having a senior developer, architect, and DevOps engineer all rolled into one, with deep expertise in Next.js and SQLite development.

## 🎯 What is Normie Dev?

Normie Dev specializes in making AI-assisted development simple and fun for normal people. It applies the Marie Kondo methodology to code: **"Does this spark joy?"** Every feature should improve your developer experience.

### Core Methodologies

- **Marie Kondo for Code**: Simplify complexity while preserving value
- **Composition over Creation**: Use existing excellent tools (Next.js, Kysely, NextAuth, SQLite)
- **Database-First Design**: SQLite with WAL mode optimization for PostgreSQL-level performance
- **Organized Architecture**: Django-style structure, Laravel services, Rails conventions

## 🚀 Quick Start

### 1. Installation

Normie Dev is built on top of Cline. Follow these steps to get started:

```bash
# Clone the Normie Dev repository
git clone <repository-url>
cd NormieDev

# Install dependencies
npm install

# Build the extension
npm run compile
```

### 2. Configure API Keys

Normie Dev supports all the same AI providers as Cline:
- Anthropic (Claude)
- OpenAI (GPT)
- Google (Gemini)
- And many more...

Configure your API keys in the VSCode settings or through the extension UI.

### 3. Enable NOORMME MCP Servers

Normie Dev comes with two specialized MCP servers:

1. **Database Server** (`noormme-database-server`)
   - SQLite operations with WAL mode
   - Schema discovery and type generation
   - Repository pattern implementation

2. **Project Server** (`noormme-project-server`)
   - Next.js project scaffolding
   - Service layer generation
   - Template processing

The servers are automatically configured in `mcp-servers/mcp-settings.json`.

## 🛠️ Using Normie Dev

### Creating Your First NOORMME Project

1. **Open a new terminal** in VSCode
2. **Ask Normie Dev**: "Create a new Next.js project with NOORMME integration"
3. **Watch the magic**: Normie Dev will generate a complete project with:
   - Next.js App Router setup
   - SQLite database with WAL mode
   - Service layer with repository pattern
   - Cursor rules for NOORMME methodology
   - Pre-configured TypeScript and Tailwind CSS

### Database Operations

Normie Dev can help you with SQLite operations:

```
"Set up a users table with email and name fields"
"Create a repository for user operations"
"Add authentication with NextAuth"
"Generate a migration for the posts table"
```

### Project Architecture

Normie Dev follows proven patterns:

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── api/               # API routes
│   └── dashboard/         # Protected routes
├── lib/
│   ├── db.ts              # NOORMME database instance
│   ├── services/          # Service layer
│   └── repositories/      # Repository layer
└── components/
    ├── ui/                # Reusable UI components
    └── auth/              # Auth components
```

## 🎨 Marie Kondo Methodology

Normie Dev applies the Marie Kondo methodology to development:

### "Does this spark joy?"
Every feature should improve developer experience:
- ✅ Zero configuration setup
- ✅ Smart defaults that just work
- ✅ Clear, actionable error messages
- ✅ Intuitive project structure

### "Thank it for its service and let it go"
Simplify complexity while preserving value:
- ✅ SQLite instead of complex PostgreSQL setup
- ✅ Next.js instead of custom frameworks
- ✅ Kysely instead of complex ORMs
- ✅ Smart defaults instead of configuration hell

### "Keep only what sparks joy"
Maintain simplicity, performance, and organization:
- ✅ Type-safe database operations
- ✅ Auto-generated types from schema
- ✅ Repository pattern for clean data access
- ✅ Service layer for business logic

## 🔧 Advanced Features

### CLI Tools

Normie Dev includes a CLI for project management:

```bash
# Generate a new project
npx noormme new my-app

# Add a service
npx noormme service UserService

# Generate a component
npx noormme component UserCard
```

### Template System

All generated projects include:
- **Cursor Rules**: NOORMME methodology embedded in `.cursor/rules/`
- **Service Templates**: Pre-configured service and repository classes
- **Database Setup**: SQLite with WAL mode optimization
- **TypeScript Configuration**: Strict typing with auto-generated types

### MCP Integration

The MCP servers provide:
- **Database Operations**: CRUD operations with type safety
- **Schema Discovery**: Automatic table and column introspection
- **Project Generation**: Complete Next.js applications
- **Service Generation**: Repository and service layer classes

## 📚 Walkthrough Steps

Follow these steps to explore Normie Dev's capabilities:

1. **[Meet Normie Dev](./step1.md)** - Introduction to the specialized AI assistant
2. **[Next.js & SQLite Expertise](./step2.md)** - Built-in knowledge of modern web development
3. **[Project Scaffolding](./step3.md)** - Smart project generation and database management
4. **[MCP Servers](./step4.md)** - Specialized tools for NOORMME operations
5. **[Marie Kondo Methodology](./step5.md)** - Code that sparks joy

## 🤝 Getting Help

- **Documentation**: Check the `/docs` folder for detailed guides
- **Examples**: See `/examples` for sample projects and usage patterns
- **Issues**: Report problems or request features through GitHub issues
- **Community**: Join discussions about NOORMME methodology and best practices

## 🎉 Ready to Start?

Normie Dev is ready to help you build amazing Next.js applications with SQLite. Start by asking:

- "Create a new blog application with user authentication"
- "Set up a todo app with SQLite database"
- "Generate a dashboard with user management"
- "Help me optimize my SQLite database performance"

Remember: Normie Dev believes software development should spark joy, not frustration. Let's build something amazing together! 🚀
