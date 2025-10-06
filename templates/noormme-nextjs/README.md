# NOORMME Next.js Template

A clean, organized Next.js template with NOORMME integration following the **NORMIE DEV methodology**.

## ✨ Features

- **Next.js 15** with App Router
- **NOORMME** database integration with SQLite
- **NextAuth** authentication
- **Tailwind CSS** for styling
- **TypeScript** with strict configuration
- **Unified service architecture**
- **Queue system** for background jobs
- **Admin panel** with role-based access

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

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── admin/             # Admin panel
│   ├── api/               # API routes
│   ├── dashboard/         # Protected dashboard
│   └── layout.tsx         # Root layout
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── db.ts              # NOORMME database
│   ├── middleware.ts      # Authentication middleware
│   ├── services/          # Business logic
│   └── queue/             # Background jobs
└── components/
    ├── ui/                # Reusable UI components
    ├── admin/             # Admin components
    └── auth/              # Auth components
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run setup` - Initialize database
- `npm run reset` - Reset database
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