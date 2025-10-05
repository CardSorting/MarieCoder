# NOORMME Next.js Template

A comprehensive Next.js template with integrated payment services, following NOORMME architecture guidelines.

## Features

- ✅ **Next.js 14** with App Router
- ✅ **TypeScript** with strict configuration
- ✅ **Tailwind CSS** for styling
- ✅ **Payment Services** (Stripe & PayPal)
- ✅ **NOORMME Architecture** patterns
- ✅ **Type-safe** database operations
- ✅ **Repository Pattern** implementation

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)** in your browser.

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
├── app/                    # Next.js App Router
├── config/                 # Configuration files
├── providers/              # Payment providers
├── repositories/           # Data access layer
├── services/               # Business logic
├── types/                  # TypeScript types
└── utils/                  # Utility functions
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## License

MIT
