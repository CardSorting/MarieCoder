#!/bin/bash

# Build script for NOORMME Database MCP Server
# Following NORMIE DEV methodology - clean, efficient builds

echo "🚀 Building NOORMME Database MCP Server..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Make executable
echo "⚡ Making executable..."
chmod +x dist/index.js

echo "✅ Build completed successfully!"
echo "📁 Output: dist/index.js"
