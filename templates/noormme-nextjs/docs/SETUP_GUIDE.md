# NOORMME Next.js Template - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Option 1: Use the setup script (recommended)
npm run setup

# Option 2: Use the installation script
npm run install-deps

# Option 3: Manual installation
npm install
```

### 2. Configure Environment
```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your configuration
nano .env.local
```

### 3. Start Development Server
```bash
npm run dev
```

## 📋 Prerequisites

- **Node.js** 18.0.0 or later
- **npm** 8.0.0 or later
- **Git** (for version control)

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="./app.db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Payment Providers (Optional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
PAYPAL_CLIENT_ID="your-paypal-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-client-secret"
PAYPAL_WEBHOOK_SECRET="your-paypal-webhook-secret"
```

### Environment Setup Instructions

#### 1. NextAuth Secret
Generate a secure secret:
```bash
openssl rand -base64 32
```

#### 2. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

#### 3. GitHub OAuth Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

#### 4. Stripe Setup
1. Create a [Stripe account](https://stripe.com)
2. Get your API keys from the dashboard
3. Set up webhook endpoint: `http://localhost:3000/api/payments/webhooks/stripe`

#### 5. PayPal Setup
1. Create a [PayPal Developer account](https://developer.paypal.com)
2. Create an application to get client credentials
3. Set up webhook endpoint: `http://localhost:3000/api/payments/webhooks/paypal`

## 🗄️ Database Setup

The template uses SQLite with automatic migrations. No manual setup required!

### Manual Database Operations (Optional)
```bash
# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Type checking
npm run type-check

# Database migration
npm run migrate

# Seed database
npm run seed
```

## 🏗️ Project Structure

```
noormme-nextjs/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── admin/             # Admin panel
│   ├── api/               # API routes
│   ├── dashboard/         # Protected dashboard
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # Client providers
├── lib/                   # Library code
│   ├── services/          # Service layer
│   ├── db.ts              # Database connection
│   ├── auth.ts            # NextAuth configuration
│   ├── rbac.ts            # RBAC utilities
│   └── middleware.ts      # Middleware functions
├── types/                 # TypeScript type definitions
├── public/                # Static assets
├── env.example            # Environment template
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## 🎯 Features Overview

### ✅ Authentication & Authorization
- NextAuth.js with multiple providers (Google, GitHub, Credentials)
- Role-Based Access Control (RBAC)
- JWT sessions with role information
- Protected routes and middleware

### ✅ Admin Panel
- User management with role assignment
- Role and permission management
- Audit logging and activity tracking
- Comprehensive statistics dashboard

### ✅ Payment Integration
- Stripe payment processing
- PayPal payment integration
- Webhook handling for payment events
- Subscription management

### ✅ Database & Services
- SQLite with WAL mode for performance
- Kysely query builder for type-safe queries
- Centralized service layer architecture
- Automatic migrations and seeding

### ✅ Developer Experience
- Full TypeScript support
- Tailwind CSS for styling
- ESLint configuration
- Comprehensive type definitions

## 🔍 Troubleshooting

### Common Issues

#### 1. TypeScript Errors
```bash
# If you see TypeScript errors, make sure all dependencies are installed
npm install

# Check types
npm run type-check
```

#### 2. Database Connection Issues
```bash
# Ensure database file permissions
chmod 644 app.db

# Reset database
rm app.db
npm run migrate
npm run seed
```

#### 3. Authentication Issues
- Verify environment variables are set correctly
- Check OAuth provider configurations
- Ensure callback URLs match your setup

#### 4. Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📚 Additional Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Kysely Documentation](https://kysely.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the README.md file
3. Check existing GitHub issues
4. Create a new issue with detailed information

## 🎉 You're Ready!

Once you've completed the setup:
1. Visit `http://localhost:3000` to see your application
2. Access the admin panel at `http://localhost:3000/admin`
3. Start building your features using the centralized services
4. Check the comprehensive type definitions in the `types/` directory

Happy coding! 🚀
