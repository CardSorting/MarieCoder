# API Module - Simplified Provider System

## Overview

This module provides a clean, simplified API for interacting with AI providers. Following the KonMari Method principles, we've ruthlessly eliminated complexity and only support two providers:

- **Anthropic** - Primary provider with advanced reasoning capabilities
- **OpenRouter** - Unified access to 100+ models from various providers

## Supported Providers

### Anthropic
- **Provider ID**: `anthropic`
- **Features**: Advanced reasoning, code generation, vision, long context (200k tokens)
- **Configuration**:
  ```typescript
  {
    apiKey: "sk-ant-...",
    planModeApiProvider: "anthropic",
    apiModelId: "claude-3-5-sonnet-20241022"
  }
  ```

### OpenRouter
- **Provider ID**: `openrouter`
- **Features**: Access to 100+ models, unified API, cost optimization, provider failover
- **Configuration**:
  ```typescript
  {
    openRouterApiKey: "sk-or-...",
    planModeApiProvider: "openrouter",
    openRouterModelId: "anthropic/claude-3.5-sonnet"
  }
  ```

## Usage

### Basic Usage

```typescript
import { ApiService } from '@core/api'

// Create a handler for Anthropic
const handler = ApiService.createHandler(configuration, "plan", {})

// Create a message stream
const stream = handler.createMessage(systemPrompt, messages)
for await (const chunk of stream) {
  if (chunk.type === "text") {
    console.log(chunk.text)
  }
}
```

### With Fallback

```typescript
// Automatically fall back to OpenRouter if Anthropic fails
const handler = ApiService.createHandlerWithFallback(
  configuration,
  "plan",
  {},
  ["anthropic", "openrouter"]
)
```

## Architecture

### Core Components

1. **ApiService** - Main entry point for creating handlers
2. **BaseProvider** - Base class for all providers
3. **HttpProvider** - Base class for HTTP-based providers
4. **EnhancedProviderRegistry** - Provider registration and discovery

### Provider Structure

```
src/core/api/
├── api_service.ts              # Main API service
├── base/                       # Base provider classes
│   ├── base-provider.ts
│   └── http-provider.ts
├── providers/                  # Provider implementations
│   ├── core/
│   │   ├── anthropic.ts       # Anthropic provider
│   │   └── openrouter.ts      # OpenRouter provider
│   └── shared.ts              # Shared types
├── registry/                   # Provider registration
│   └── enhanced-registrations/
│       ├── index.ts
│       └── supported_providers.ts
├── services/                   # Support services
│   ├── configuration-service.ts
│   ├── error-service.ts
│   └── provider-factory.ts
├── transform/                  # Stream transformations
│   ├── openrouter-stream.ts
│   └── stream.ts
└── utils/                      # Utility functions
    └── message-transformers.ts
```

## Design Principles

Following the KonMari Method applied to code:

1. **Simplicity** - Only two providers, no complex abstractions
2. **Clear Value** - Every file and function has a clear purpose
3. **Self-Explanatory** - Names clearly describe functionality
4. **No Legacy** - All unsupported providers have been removed
5. **Type Safety** - Strong typing throughout, no `any` types

## Provider Discovery

```typescript
// Get all supported providers
const providers = ApiService.getSupportedProviders()
// Returns: ["anthropic", "openrouter"]

// Check if provider is supported
const isSupported = ApiService.isProviderSupported("anthropic")

// Get provider metadata
const metadata = ApiService.getProviderMetadata("anthropic")

// Get provider capabilities
const capabilities = ApiService.getProviderCapabilities("openrouter")
```

## Error Handling

All errors are properly typed and include actionable messages:

```typescript
import { ApiError, ErrorService } from '@core/api'

try {
  const handler = ApiService.createHandler(configuration, "plan")
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Error: ${error.message}`)
    console.error(`Type: ${error.type}`)
    console.error(`Action: ${error.actionable}`)
  }
}
```

## Configuration Validation

```typescript
// Validate configuration before use
const validation = ApiService.validateProviderConfiguration(
  "anthropic",
  configuration,
  "plan"
)

if (!validation) {
  console.error("Invalid configuration")
}
```

## Migration from Legacy Providers

If you were using any of these providers, they are no longer supported:

- ❌ OpenAI → Use OpenRouter with `openrouter/openai/*` models
- ❌ Gemini → Use OpenRouter with `google/*` models
- ❌ Ollama → Use OpenRouter or run local models separately
- ❌ Bedrock → Use OpenRouter or Anthropic directly
- ❌ Groq → Use OpenRouter with `groq/*` models
- ❌ All other providers → Use OpenRouter for unified access

### Migration Example

**Before:**
```typescript
{
  planModeApiProvider: "gemini",
  geminiApiKey: "...",
  geminiModelId: "gemini-1.5-pro"
}
```

**After:**
```typescript
{
  planModeApiProvider: "openrouter",
  openRouterApiKey: "...",
  openRouterModelId: "google/gemini-1.5-pro"
}
```

## Contributing

When adding new features:

1. Apply the 3-step decision process:
   - Does this add clear value?
   - Can we delete anything?
   - Is this the simplest solution?

2. Follow naming conventions:
   - Use `snake_case` for files
   - Use descriptive names (no abbreviations)
   - Every name should be self-explanatory

3. Maintain type safety:
   - No `any` types
   - Proper error handling
   - Input validation

## License

See the main project LICENSE file.