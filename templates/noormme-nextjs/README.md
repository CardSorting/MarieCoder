# NOORMME SAAS Template

A comprehensive, production-ready Next.js SAAS template with NOORMME integration following the **NORMIE DEV methodology**. This template provides everything you need to build a modern SAAS application with user management, subscriptions, billing, and admin functionality.

## ✨ Features

### 🏗️ Core Architecture
- **Next.js 15** with App Router and Server Components
- **NOORMME** database integration with SQLite WAL mode
- **NextAuth** authentication with multiple providers
- **TypeScript** with strict configuration
- **Tailwind CSS** for modern, responsive design

### 👥 User Management
- **Role-based access control** (Customer, Admin, Super Admin)
- **User profiles** with preferences and settings
- **Account status management** (Active, Inactive, Suspended, Deleted)
- **Audit logging** for all user actions
- **Session management** with JWT tokens

### 💳 Subscription & Billing
- **Multiple subscription plans** with features and limits
- **Payment processing** with Stripe integration
- **Subscription lifecycle management** (Active, Canceled, Past Due, etc.)
- **Billing history** and payment tracking
- **Proration** and plan changes
- **Trial periods** and automatic renewals

### 🔔 Notifications
- **In-app notifications** with read/unread status
- **Email notifications** for important events
- **Notification preferences** per user
- **Bulk notification** capabilities for admins

### 🛡️ Admin Panel
- **Comprehensive dashboard** with system statistics
- **User management** with search and filtering
- **Subscription management** and analytics
- **Payment monitoring** and refund processing
- **System settings** configuration
- **Audit logs** with detailed activity tracking
- **System health monitoring**

### 🚀 Performance & Scalability
- **SQLite with WAL mode** for concurrent access
- **Optimized database queries** with proper indexing
- **Background job processing** for heavy operations
- **Caching strategies** for improved performance
- **Database connection pooling**

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Initialize database:**
   ```bash
   npm run setup
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Main app: http://localhost:3000
   - Admin panel: http://localhost:3000/admin
   - API docs: http://localhost:3000/api

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   │   ├── signin/        # Sign-in page
│   │   ├── signup/        # Sign-up page
│   │   └── layout.tsx     # Auth layout
│   ├── admin/             # Admin panel
│   │   ├── users/         # User management
│   │   ├── subscriptions/ # Subscription management
│   │   ├── payments/      # Payment management
│   │   ├── settings/      # System settings
│   │   └── layout.tsx     # Admin layout
│   ├── api/               # API routes
│   │   ├── users/         # User CRUD operations
│   │   ├── subscriptions/ # Subscription management
│   │   ├── payments/      # Payment processing
│   │   ├── notifications/ # Notification system
│   │   └── admin/         # Admin-only endpoints
│   ├── dashboard/         # Customer dashboard
│   ├── billing/           # Billing management
│   ├── profile/           # User profile
│   ├── settings/          # User settings
│   └── layout.tsx         # Root layout
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── db.ts              # NOORMME database instance
│   ├── middleware.ts      # Authentication middleware
│   ├── services/          # Business logic layer
│   │   ├── UserService.ts      # User management
│   │   ├── SubscriptionService.ts # Subscription logic
│   │   ├── PaymentService.ts    # Payment processing
│   │   ├── NotificationService.ts # Notifications
│   │   └── AdminService.ts      # Admin functions
│   └── queue/             # Background job processing
└── components/
    ├── ui/                # Reusable UI components
    ├── admin/             # Admin panel components
    ├── auth/              # Authentication components
    └── dashboard/         # Dashboard components
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run setup` - Initialize database with migrations and seed data
- `npm run reset` - Reset database and reinitialize
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env.local` and configure:

```env
# Database
DATABASE_URL="file:./database.sqlite"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### Database

The template uses SQLite with WAL mode for optimal performance. The database is automatically initialized with:

- WAL mode enabled
- 64MB cache size
- Foreign key constraints
- Memory-based temporary storage

## 🏗️ Architecture

This template follows the **NORMIE DEV methodology**:

- **Single Source of Truth**: One service per domain
- **No Duplication**: Eliminated redundant implementations
- **Clean Interfaces**: Well-defined, type-safe APIs
- **Modern Patterns**: Current best practices only
- **Performance First**: Optimized for speed and efficiency

### Services

- `UserService` - User management
- `PaymentService` - Payment processing
- `BaseService` - Common functionality

### Queue System

Simple, efficient job processing for:
- Email sending
- Image processing
- Webhook delivery

## 📚 Documentation

- [Setup Guide](docs/SETUP_GUIDE.md)
- [Queue System](docs/QUEUE_SETUP_GUIDE.md)
- [Tailwind Setup](docs/TAILWIND_SETUP.md)

## 🤝 Contributing

This template follows the NORMIE DEV methodology. When making changes:

1. **Does this spark joy?** - Improve developer experience
2. **Can we delete legacy code?** - Eliminate old implementations
3. **Does this add value?** - Solve real problems
4. **Can we compose this?** - Use existing tools

## 📄 License

MIT License - see LICENSE file for details.