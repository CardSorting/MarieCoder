# NOORMME Payment Services Template

A comprehensive TypeScript backend template with integrated payment services, following NOORMME architecture guidelines.

## Features

- ✅ **TypeScript** with strict configuration
- ✅ **Payment Services** (Stripe & PayPal)
- ✅ **NOORMME Architecture** patterns
- ✅ **Type-safe** database operations
- ✅ **Repository Pattern** implementation
- ✅ **Service Layer** architecture
- ✅ **Database Migration** scripts

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Run database migrations:**
   ```bash
   npm run migrate
   ```

4. **Seed the database:**
   ```bash
   npm run seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

## Payment Services

This template includes comprehensive payment processing capabilities:

### Stripe Integration
- Payment intents
- Subscriptions
- Webhooks
- Customer management

### PayPal Integration
- Express Checkout
- Subscriptions
- Webhooks
- Order management

## Architecture

This template follows NOORMME architecture principles:

- **Composition over Creation**: Uses proven tools (Next.js, TypeScript, Tailwind)
- **Marie Kondo Methodology**: Keeps only what sparks joy (simplicity, performance)
- **Repository Pattern**: Type-safe data access
- **Service Layer**: Business logic encapsulation

## Project Structure

```
src/
├── config/                 # Configuration files
├── lib/                    # Database and core utilities
├── providers/              # Payment providers
├── repositories/           # Data access layer
├── services/               # Business logic
├── types/                  # TypeScript types
├── utils/                  # Utility functions
└── index.ts               # Main application entry point
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run type-check` - Run TypeScript checks
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with initial data

## License

MIT
