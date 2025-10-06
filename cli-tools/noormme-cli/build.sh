#!/bin/bash

# NOORMME CLI Build Script
# Builds the CLI tool for distribution

set -e

echo "🚀 Building NOORMME CLI..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/
rm -rf node_modules/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Make executable
echo "🔧 Making CLI executable..."
chmod +x dist/index.js

# Test the CLI
echo "🧪 Testing CLI..."
node dist/index.js --version

echo "✅ Build completed successfully!"
echo ""
echo "📁 Built files are in: ./dist/"
echo "🚀 CLI is ready to use: ./dist/index.js"
echo ""
echo "Usage examples:"
echo "  ./dist/index.js new my-app"
echo "  ./dist/index.js deploy"
echo "  ./dist/index.js --help"
