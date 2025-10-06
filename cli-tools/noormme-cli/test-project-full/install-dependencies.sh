#!/bin/bash

# NOORMME Next.js Template - Dependency Installation Script
# This script installs all required dependencies for the NOORMME Next.js 15 template

echo "🚀 Installing NOORMME Next.js Template Dependencies..."

# Navigate to the project directory
cd "$(dirname "$0")"

echo "📦 Installing core Next.js 15 dependencies..."
npm install next@^15.0.0 react@^18.0.0 react-dom@^18.0.0

echo "🔐 Installing authentication dependencies..."
npm install next-auth@^4.24.0 bcryptjs@^2.4.3 @types/bcryptjs@^2.4.6

echo "🗄️ Installing database dependencies..."
npm install kysely@^0.27.0 better-sqlite3@^9.6.0 @types/better-sqlite3@^7.6.8

echo "✅ Installing validation dependencies..."
npm install zod@^3.22.0

echo "💳 Installing payment dependencies..."
npm install stripe@^14.0.0 @paypal/checkout-server-sdk@^1.0.3

echo "🎨 Installing UI dependencies..."
npm install tailwindcss@^3.4.0 autoprefixer@^10.4.0 postcss@^8.4.0

echo "🛠️ Installing development dependencies..."
npm install -D @types/react@^18.0.0 @types/react-dom@^18.0.0 @types/node@^20.0.0
npm install -D eslint@^8.0.0 eslint-config-next@^15.0.0 typescript@^5.0.0

echo "🔧 Installing additional utilities..."
npm install date-fns@^3.0.0

echo "✅ All dependencies installed successfully!"
echo ""
echo "🎉 Next steps:"
echo "1. Copy env.example to .env.local: cp env.example .env.local"
echo "2. Configure your environment variables in .env.local"
echo "3. Run the development server: npm run dev"
echo ""
echo "📚 For more information, see README.md"
