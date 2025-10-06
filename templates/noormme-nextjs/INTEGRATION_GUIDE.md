# NOORMME SAAS Template - MCP Server Integration Guide

## 🎯 Overview

This guide explains how to use the NOORMME Artisan MCP Server with the Next.js SAAS template for streamlined development. The integration follows the **NORMIE DEV methodology** - clean, unified, production-ready.

## 🔗 Integration Architecture

### MCP Server ↔ Template Communication
```
NOORMME Artisan MCP Server
    ↓ (via CLI wrapper)
Next.js SAAS Template
    ↓ (via npm scripts)
Development Commands
```

### Key Integration Points
1. **Artisan CLI Wrapper** - `scripts/artisan.ts`
2. **Package.json Scripts** - Direct command mapping
3. **Database Configuration** - Shared schema and patterns
4. **Testing Setup** - Unified test environment
5. **Environment Configuration** - Consistent settings

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 8+
- NOORMME Artisan MCP Server installed

### Quick Setup
```bash
# 1. Clone the template
git clone <template-repo> my-saas-app
cd my-saas-app

# 2. Run automated setup
npm run setup

# 3. Start development
npm run dev
```

## 🛠️ Available Commands

### Component Creation
```bash
# Create UI components
npm run make:component Button --type=ui --with-tests

# Create page components
npm run make:component HomePage --type=page --with-styles

# Create admin components
npm run make:component UserTable --type=admin --with-tests
```

### Service Development
```bash
# Create services with repositories
npm run make:service UserService --with-repository --with-validation

# Create payment services
npm run make:service PaymentService --with-repository
```

### Database Operations
```bash
# Create migrations
npm run make:migration create_users_table --action=create --table=users

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

### API Development
```bash
# Create API routes
npm run make:api users --route=/api/users

# Create middleware
npm run make:middleware auth --with-auth
```

### Page Development
```bash
# Create Next.js pages
npm run make:page dashboard --route=/dashboard

# Create auth pages
npm run make:page signin --route=/auth/signin
```

## 🔧 Configuration

### Environment Variables
The template includes comprehensive environment configuration in `env.example`:

```env
# Core Configuration
DATABASE_URL="file:./database.sqlite"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Feature Flags
ENABLE_BILLING="true"
ENABLE_NOTIFICATIONS="true"
ENABLE_ADMIN_PANEL="true"

# Development Settings
DEV_MODE="true"
ENABLE_DEBUG_LOGS="true"
```

### Database Configuration
The database is configured for production use with:
- SQLite with WAL mode
- Optimized cache settings
- Connection pooling
- Health monitoring

### Testing Configuration
Comprehensive testing setup with:
- Jest configuration
- TypeScript support
- React Testing Library
- Coverage reporting

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── admin/             # Admin panel
│   ├── api/               # API routes
│   └── dashboard/         # Customer dashboard
├── components/
│   ├── ui/                # Reusable UI components
│   ├── admin/             # Admin panel components
│   └── auth/              # Auth components
├── lib/
│   ├── db.ts              # Database configuration
│   ├── services/          # Business logic
│   ├── repositories/      # Data access layer
│   └── middleware/        # Middleware functions
└── types/
    └── database.ts        # Database types
```

## 🔄 Development Workflow

### 1. Feature Development
```bash
# Create the feature component
npm run make:component FeatureComponent --type=feature --with-tests

# Create the service
npm run make:service FeatureService --with-repository

# Create the API route
npm run make:api features --route=/api/features

# Run tests
npm run test FeatureComponent
```

### 2. Database Changes
```bash
# Create migration
npm run make:migration add_feature_table --action=create --table=features

# Run migration
npm run db:migrate

# Update seed data
npm run db:seed
```

### 3. Testing
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🚀 Production Deployment

### Build Process
```bash
# Production build with checks
npm run build:production

# Deploy
npm run deploy
```

### Environment Setup
1. Copy `env.example` to `.env.local`
2. Update production values
3. Set secure secrets
4. Configure domain settings

### Database Setup
```bash
# Run migrations in production
npm run db:migrate

# Seed initial data
npm run db:seed
```

## 🔍 Troubleshooting

### Common Issues

#### MCP Server Not Found
```bash
# Ensure MCP server is in correct location
ls ../mcp-servers/noormme-artisan

# Install MCP server dependencies
cd ../mcp-servers/noormme-artisan
npm install
npm run build
```

#### Database Connection Issues
```bash
# Reset database
npm run reset

# Check database health
npm run health-check
```

#### Test Failures
```bash
# Clear test cache
npm run test -- --clearCache

# Run specific test
npm run test ComponentName
```

### Debug Mode
```bash
# Enable debug logs
export DEBUG=true
npm run dev
```

## 📚 Best Practices

### Code Organization
- Follow the established directory structure
- Use TypeScript for all new code
- Implement proper error handling
- Write tests for new features

### Database Operations
- Always create migrations for schema changes
- Use repositories for data access
- Implement proper indexing
- Monitor database performance

### Component Development
- Use proper TypeScript interfaces
- Implement responsive design
- Follow accessibility guidelines
- Write comprehensive tests

### API Development
- Implement proper validation
- Use consistent error responses
- Implement rate limiting
- Document API endpoints

## 🔧 Customization

### Adding New Commands
1. Update `scripts/artisan.ts`
2. Add command mapping
3. Update documentation
4. Test integration

### Custom Templates
1. Create template files
2. Update MCP server templates
3. Test generation
4. Update documentation

### Environment Configuration
1. Add new variables to `env.example`
2. Update configuration files
3. Document usage
4. Test in different environments

## 📞 Support

- **Documentation**: See README.md and inline code comments
- **Issues**: Create GitHub issues for bugs or feature requests
- **Community**: Join the NOORMME Discord server
- **Updates**: Follow the changelog for new features

---

**Built with ❤️ using the NORMIE DEV methodology**

*This integration guide ensures seamless development experience with NOORMME Artisan MCP Server and the Next.js SAAS template.*
