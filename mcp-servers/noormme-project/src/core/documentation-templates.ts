/**
 * Documentation Templates for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean, comprehensive documentation
 */

export class DocumentationTemplates {
	/**
	 * Get README template
	 */
	getReadmeTemplate(): string {
		return `# <%= projectName %>

<%= description || 'A modern Next.js application built with NOORMME, following the NORMIE DEV methodology.' %>

## 🚀 Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **NOORMME** for database management
- **Kysely** for type-safe SQL queries
<% if (includeTailwind) { %>- **Tailwind CSS** for styling<% } %>
<% if (includeAuth) { %>- **NextAuth.js** for authentication<% } %>
<% if (includeAdmin) { %>- **Admin Panel** for content management<% } %>
<% if (includeTests) { %>- **Jest & Testing Library** for testing<% } %>

## 🏗️ Architecture

This project follows the **NORMIE DEV methodology**:

1. **Thank** - Acknowledge what taught us valuable lessons
2. **Let Go** - Eliminate ALL legacy systems and technical debt
3. **Organize** - Keep only what sparks joy with proven patterns

### Project Structure

\`\`\`
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── admin/             # Admin panel<% if (includeAuth) { %>
│   ├── api/               # API routes
│   │   └── auth/          # Auth API routes<% } %>
│   ├── dashboard/         # Protected dashboard
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/
│   ├── db.ts              # NOORMME database instance
<% if (includeAuth) { %>│   ├── auth.ts              # NextAuth configuration<% } %>
│   ├── services/          # Service layer
│   ├── repositories/      # Repository layer
│   └── utils/             # Utility functions
├── components/
│   ├── ui/                # Reusable UI components
<% if (includeAdmin) { %>│   ├── admin/               # Admin panel components<% } %>
<% if (includeAuth) { %>│   └── auth/                # Auth components<% } %>
└── types/
    ├── database.ts        # Auto-generated types
    └── api.ts             # API types
\`\`\`

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd <%= projectName %>
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

4. Initialize the database:
\`\`\`bash
npm run db:generate
npm run db:migrate
\`\`\`

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🗄️ Database

This project uses **NOORMME** with SQLite for development and can be configured for production databases.

### Database Commands

\`\`\`bash
# Generate database types
npm run db:generate

# Run migrations
npm run db:migrate

# Seed the database
npm run db:seed
\`\`\`

<% if (includeAuth) { %>## 🔐 Authentication

Authentication is handled by **NextAuth.js** with multiple providers:

- Google OAuth
- GitHub OAuth
- Email/Password (custom implementation)

### Auth Configuration

The authentication configuration is in \`src/lib/auth.ts\`. To add new providers:

1. Add the provider configuration
2. Update environment variables
3. Configure the provider in your dashboard

<% } %><% if (includeAdmin) { %>## 👨‍💼 Admin Panel

The admin panel provides a comprehensive interface for managing your application:

- User management
- Content management
- System settings
- Analytics dashboard

Access the admin panel at \`/admin\` (requires admin privileges).

<% } %>## 🧪 Testing

<% if (includeTests) { %>This project includes comprehensive testing setup:

\`\`\`bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
\`\`\`

### Testing Structure

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test service and repository interactions
- **E2E Tests**: Test complete user workflows

<% } else { %>To add testing to this project:

\`\`\`bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
\`\`\`

<% } %>## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

This project can be deployed to any platform that supports Node.js:

- Netlify
- Railway
- Heroku
- DigitalOcean App Platform

## 📚 Documentation

- [NOORMME Documentation](https://noormme.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
<% if (includeTailwind) { %>- [Tailwind CSS Documentation](https://tailwindcss.com/docs)<% } %><% if (includeAuth) { %>- [NextAuth.js Documentation](https://next-auth.js.org)<% } %>

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/amazing-feature\`
3. Commit your changes: \`git commit -m 'Add amazing feature'\`
4. Push to the branch: \`git push origin feature/amazing-feature\`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [NOORMME](https://noormme.dev) for the amazing database toolkit
- [Next.js](https://nextjs.org) for the incredible React framework
- [Vercel](https://vercel.com) for the deployment platform

---

Built with ❤️ using the **NORMIE DEV** methodology`
	}

	/**
	 * Get setup guide template
	 */
	getSetupGuideTemplate(): string {
		return `# <%= projectName %> Setup Guide

This guide will help you set up and configure your new <%= projectName %> project.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control
<% if (includeAuth) { %>- **Google/GitHub accounts** for OAuth setup<% } %>

## 🚀 Quick Start

### 1. Environment Setup

Create a \`.env.local\` file in your project root:

\`\`\`bash
cp .env.example .env.local
\`\`\`

### 2. Database Configuration

The project uses SQLite by default. Update your database URL if needed:

\`\`\`env
NOORMME_DATABASE_URL=./database.sqlite
\`\`\`

### 3. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 4. Initialize Database

\`\`\`bash
# Generate database types
npm run db:generate

# Run initial migrations
npm run db:migrate

# Seed with initial data (optional)
npm run db:seed
\`\`\`

### 5. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Your application should now be running at [http://localhost:3000](http://localhost:3000).

<% if (includeAuth) { %>## 🔐 Authentication Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins:
   - \`http://localhost:3000\` (development)
   - \`https://yourdomain.com\` (production)
6. Update your \`.env.local\`:
   \`\`\`env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   \`\`\`

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL:
   - \`http://localhost:3000/api/auth/callback/github\` (development)
   - \`https://yourdomain.com/api/auth/callback/github\` (production)
4. Update your \`.env.local\`:
   \`\`\`env
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   \`\`\`

<% } %>## 🗄️ Database Management

### Schema Changes

When you need to modify the database schema:

1. Create a new migration:
   \`\`\`bash
   npm run db:migrate:create -- --name="add-user-table"
   \`\`\`

2. Edit the migration file in \`database/migrations/\`

3. Run the migration:
   \`\`\`bash
   npm run db:migrate
   \`\`\`

4. Regenerate types:
   \`\`\`bash
   npm run db:generate
   \`\`\`

### Seeding Data

To add initial data to your database:

1. Create seed files in \`database/seeds/\`
2. Run the seeder:
   \`\`\`bash
   npm run db:seed
   \`\`\`

<% if (includeAdmin) { %>## 👨‍💼 Admin Panel Setup

### Creating Admin Users

1. Access the admin panel at \`/admin\`
2. Use the user management interface
3. Assign admin roles to users
4. Configure permissions

### Admin Configuration

Admin settings can be configured in:
- \`src/lib/admin/config.ts\` - Admin panel configuration
- \`src/components/admin/\` - Admin components
- \`src/app/admin/\` - Admin pages

<% } %>## 🎨 Customization

### Styling

<% if (includeTailwind) { %>This project uses **Tailwind CSS**. Customize the design system in:

- \`tailwind.config.js\` - Tailwind configuration
- \`src/styles/globals.css\` - Global styles
- \`src/components/ui/\` - UI component library

### Theme Customization

Update the CSS variables in \`src/styles/globals.css\`:

\`\`\`css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... other variables */
}
\`\`\`

<% } else { %>To add styling to this project:

1. Install Tailwind CSS:
   \`\`\`bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   \`\`\`

2. Configure Tailwind in \`tailwind.config.js\`

3. Add Tailwind directives to your CSS

<% } %>### Adding New Features

1. **Create a new service** in \`src/lib/services/\`
2. **Add a repository** in \`src/lib/repositories/\`
3. **Create components** in \`src/components/\`
4. **Add pages** in \`src/app/\`

## 🐛 Troubleshooting

### Common Issues

**Database connection errors:**
- Ensure SQLite file permissions are correct
- Check the database URL in your environment variables

**Authentication issues:**
- Verify OAuth provider configuration
- Check callback URLs match your domain

**Build errors:**
- Clear \`.next\` folder: \`rm -rf .next\`
- Reinstall dependencies: \`rm -rf node_modules && npm install\`

### Getting Help

- Check the [NOORMME Documentation](https://noormme.dev)
- Review the [Next.js Documentation](https://nextjs.org/docs)
- Open an issue in the project repository

## 📚 Next Steps

1. **Explore the codebase** - Familiarize yourself with the project structure
2. **Read the documentation** - Understand the technologies used
3. **Start building** - Begin developing your features
4. **Follow best practices** - Maintain code quality and consistency

Happy coding! 🎉`
	}

	/**
	 * Get architecture template
	 */
	getArchitectureTemplate(): string {
		return `# <%= projectName %> Architecture Guide

This document outlines the architecture and design patterns used in <%= projectName %>.

## 🏗️ High-Level Architecture

<%= projectName %> follows a **layered architecture** with clear separation of concerns:

\`\`\`
┌─────────────────────────────────────┐
│           Presentation Layer        │
│         (Next.js App Router)        │
├─────────────────────────────────────┤
│            Service Layer            │
│        (Business Logic)             │
├─────────────────────────────────────┤
│          Repository Layer           │
│        (Data Access)                │
├─────────────────────────────────────┤
│            Database Layer           │
│        (NOORMME + SQLite)           │
└─────────────────────────────────────┘
\`\`\`

## 🎯 Core Principles

### NORMIE DEV Methodology

1. **Thank** - Acknowledge what taught us valuable lessons
2. **Let Go** - Eliminate ALL legacy systems and technical debt  
3. **Organize** - Keep only what sparks joy with proven patterns

### Design Principles

- **Single Responsibility** - Each module has one clear purpose
- **Dependency Inversion** - Depend on abstractions, not concretions
- **Open/Closed** - Open for extension, closed for modification
- **Type Safety** - Full TypeScript coverage throughout

## 📁 Project Structure

\`\`\`
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth route group
│   │   ├── signin/              # Sign-in page
│   │   ├── signup/              # Sign-up page
│   │   └── layout.tsx           # Auth layout
│   ├── admin/                   # Admin panel
│   │   ├── users/               # User management
│   │   ├── dashboard/           # Admin dashboard
│   │   └── layout.tsx           # Admin layout
│   ├── api/                     # API routes
│   │   ├── auth/                # Auth API routes
│   │   └── admin/               # Admin API routes
│   ├── dashboard/               # Protected dashboard
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── providers.tsx            # Client providers
├── lib/
│   ├── db.ts                    # NOORMME database instance
│   ├── auth.ts                  # NextAuth configuration
│   ├── services/                # Service layer
│   │   ├── BaseService.ts       # Base service class
│   │   ├── UserService.ts       # User business logic
│   │   └── AuthService.ts       # Auth business logic
│   ├── repositories/            # Repository layer
│   │   ├── BaseRepository.ts    # Base repository class
│   │   ├── UserRepository.ts    # User data access
│   │   └── AuthRepository.ts    # Auth data access
│   ├── middleware/              # Middleware layer
│   │   ├── auth.middleware.ts   # Auth middleware
│   │   └── admin.middleware.ts  # Admin middleware
│   └── utils/                   # Utility functions
├── components/
│   ├── ui/                      # Reusable UI components
│   │   ├── Button.tsx           # Button component
│   │   ├── Input.tsx            # Input component
│   │   └── Modal.tsx            # Modal component
│   ├── admin/                   # Admin panel components
│   │   ├── UserTable.tsx        # User management table
│   │   └── Dashboard.tsx        # Admin dashboard
│   └── auth/                    # Auth components
│       ├── SignInForm.tsx       # Sign-in form
│       └── SignUpForm.tsx       # Sign-up form
└── types/
    ├── database.ts              # Auto-generated types
    ├── api.ts                   # API types
    └── auth.ts                  # Auth types
\`\`\`

## 🔄 Data Flow

### Request Flow

1. **User Request** → Next.js App Router
2. **Route Handler** → Service Layer
3. **Service** → Repository Layer
4. **Repository** → Database Layer
5. **Response** ← All layers (in reverse)

### Authentication Flow

1. **User** → Auth Provider (Google/GitHub)
2. **Provider** → NextAuth.js
3. **NextAuth** → Session Management
4. **Middleware** → Route Protection
5. **Component** → User Context

## 🗄️ Database Architecture

### NOORMME Integration

The project uses **NOORMME** for database management:

- **Type-safe queries** with Kysely
- **Automatic migrations** and schema management
- **Repository pattern** for data access
- **Connection pooling** and optimization

### Database Schema

\`\`\`sql
-- Core tables
users (id, email, name, role, created_at, updated_at)
sessions (id, user_id, expires_at, created_at)
accounts (id, user_id, provider, provider_account_id)

-- Feature tables
<% if (includeAdmin) { %>admin_logs (id, user_id, action, details, created_at)<% } %>
<% if (includeQueue) { %>jobs (id, type, payload, status, created_at, processed_at)<% } %>
<% if (includePayments) { %>payments (id, user_id, amount, status, stripe_id, created_at)<% } %>
\`\`\`

## 🔧 Service Layer Architecture

### Base Service Pattern

All services extend \`BaseService\` for consistency:

\`\`\`typescript
export abstract class BaseService<T, CreateData, UpdateData> {
  protected repository: BaseRepository<T>
  
  constructor(repository: BaseRepository<T>) {
    this.repository = repository
  }
  
  // Common CRUD operations
  async create(data: CreateData): Promise<T>
  async findById(id: string): Promise<T | null>
  async update(id: string, data: UpdateData): Promise<T>
  async delete(id: string): Promise<boolean>
  
  // Business logic hooks
  protected abstract validateCreateData(data: CreateData): Promise<void>
  protected abstract validateUpdateData(data: UpdateData): Promise<void>
}
\`\`\`

### Service Responsibilities

- **Business Logic** - Core application rules
- **Data Validation** - Input validation and sanitization
- **Event Handling** - Business events and notifications
- **Cache Management** - Data caching strategies
- **Error Handling** - Graceful error management

## 🎨 Component Architecture

### Component Hierarchy

\`\`\`
App Layout
├── Navigation
├── Sidebar (Admin)
├── Main Content
│   ├── Page Components
│   ├── Feature Components
│   └── UI Components
└── Footer
\`\`\`

### Component Patterns

- **Container/Presenter** - Separate logic from presentation
- **Compound Components** - Related components working together
- **Render Props** - Flexible component composition
- **Custom Hooks** - Reusable stateful logic

## 🔐 Security Architecture

### Authentication & Authorization

- **NextAuth.js** - Session management
- **Middleware** - Route protection
- **Role-based Access** - User permissions
- **CSRF Protection** - Cross-site request forgery prevention

### Data Protection

- **Input Validation** - All user inputs validated
- **SQL Injection Prevention** - Type-safe queries with Kysely
- **XSS Protection** - Content Security Policy
- **Environment Variables** - Sensitive data protection

## 📈 Performance Architecture

### Optimization Strategies

- **Server Components** - Reduce client-side JavaScript
- **Static Generation** - Pre-render pages when possible
- **Image Optimization** - Next.js Image component
- **Database Indexing** - Optimized query performance
- **Caching** - Multiple cache layers

### Monitoring & Analytics

- **Error Tracking** - Comprehensive error logging
- **Performance Monitoring** - Core Web Vitals tracking
- **User Analytics** - Usage patterns and behavior
- **Database Monitoring** - Query performance tracking

## 🚀 Deployment Architecture

### Environment Strategy

- **Development** - Local SQLite, hot reload
- **Staging** - Production-like environment
- **Production** - Optimized, monitored, secure

### CI/CD Pipeline

1. **Code Commit** → GitHub
2. **Automated Tests** → Jest, ESLint
3. **Build Process** → Next.js build
4. **Deployment** → Vercel/Platform
5. **Monitoring** → Health checks

## 🔮 Future Considerations

### Scalability

- **Horizontal Scaling** - Load balancer ready
- **Database Scaling** - PostgreSQL migration path
- **CDN Integration** - Static asset optimization
- **Microservices** - Service extraction strategy

### Technology Evolution

- **Framework Updates** - Next.js evolution
- **Database Evolution** - NOORMME enhancements
- **New Features** - Feature flag system
- **Performance** - Continuous optimization

---

This architecture provides a solid foundation for building scalable, maintainable applications while following modern best practices and the NORMIE DEV methodology.`
	}
}
