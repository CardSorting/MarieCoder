# NOORMME Next.js Template

A comprehensive Next.js 15 application template with integrated payment services, role-based access control (RBAC), and admin panel, following NOORMME architecture guidelines.

## Features

- ✅ **Next.js 15** with App Router
- ✅ **TypeScript** with strict configuration
- ✅ **NextAuth.js** authentication with RBAC
- ✅ **Role-Based Access Control** (RBAC) system
- ✅ **Admin Panel** with user and role management
- ✅ **Payment Services** (Stripe & PayPal)
- ✅ **NOORMME Architecture** patterns
- ✅ **SQLite** with Kysely query builder
- ✅ **Type-safe** database operations
- ✅ **Repository Pattern** implementation
- ✅ **Service Layer** architecture
- ✅ **Tailwind CSS** for styling
- ✅ **Audit Logging** system

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   ```

3. **Configure your environment variables in `.env.local`:**
   - Add your OAuth provider credentials (Google, GitHub)
   - Add your payment provider credentials (Stripe, PayPal)
   - Set your NextAuth secret

4. **Run database migrations:**
   ```bash
   npm run migrate
   ```

5. **Seed the database:**
   ```bash
   npm run seed
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Open [http://localhost:3000](http://localhost:3000) in your browser**

## Payment Services

This template includes comprehensive payment processing capabilities:

### Stripe Integration
- Payment intents and confirmations
- Subscription management
- Webhook handling
- Customer management

### PayPal Integration
- Express Checkout
- Subscription billing
- Webhook handling
- Order management

## Authentication & Authorization

- **NextAuth.js** with multiple providers
- **Google OAuth** integration
- **GitHub OAuth** integration
- **Credentials** authentication with bcrypt
- **Session management** with JWT
- **Role-Based Access Control** (RBAC)
- **Permission-based** authorization
- **Admin panel** access control

## Architecture

This template follows NOORMME architecture principles:

- **Composition over Creation**: Uses proven tools (Next.js, TypeScript, Tailwind)
- **Marie Kondo Methodology**: Keeps only what sparks joy (simplicity, performance)
- **Repository Pattern**: Type-safe data access with Kysely
- **Service Layer**: Business logic encapsulation
- **App Router**: Modern Next.js routing and layouts

## Project Structure

```
app/
├── (auth)/                # Auth route group
│   ├── signin/           # Sign-in page
│   └── signup/           # Sign-up page
├── admin/                # Admin panel (RBAC protected)
│   ├── users/            # User management
│   ├── roles/            # Role management
│   └── layout.tsx        # Admin layout
├── api/                  # API routes
│   ├── auth/             # NextAuth API routes
│   ├── admin/            # Admin API routes (RBAC protected)
│   │   ├── users/        # User management API
│   │   └── roles/        # Role management API
│   ├── health/           # Health check endpoint
│   └── payments/         # Payment API routes
│       └── webhooks/     # Payment webhooks
├── dashboard/            # Protected dashboard
├── payments/             # Payment management
├── layout.tsx            # Root layout
├── page.tsx              # Home page
├── providers.tsx         # Client providers
└── globals.css           # Global styles

lib/
├── auth.ts               # NextAuth configuration with RBAC
├── db.ts                 # Database connection with RBAC schema
├── rbac.ts               # RBAC utilities and service
├── middleware.ts         # RBAC middleware
├── config/               # Configuration files
├── repositories/         # Data access layer
├── services/             # Business logic
├── types/                # TypeScript types
└── utils/                # Utility functions
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with initial data

## Deployment

This template is ready for deployment on platforms like:
- **Vercel** (recommended)
- **Netlify**
- **Railway**
- **DigitalOcean App Platform**

Make sure to set up your environment variables in your deployment platform.

## License

MIT
