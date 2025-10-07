# Refactored API Architecture

## Overview

This directory contains the refactored API architecture that follows the NORMIE DEV methodology: clean, unified, no duplication. The new architecture replaces the massive switch statement and duplicated code with a centralized, maintainable system.

## Architecture Components

### 1. Provider Registry (`registry/`)
- **`provider-registry.ts`**: Centralized registry for managing all API providers
- **`registrations/`**: Modular provider registration definitions

### 2. Base Classes (`base/`)
- **`base-provider.ts`**: Abstract base class for all providers
- **`http-provider.ts`**: Base class for HTTP-based providers

### 3. Services (`services/`)
- **`configuration-service.ts`**: Centralized configuration management
- **`error-service.ts`**: Unified error handling and retry logic
- **`provider-factory.ts`**: Provider creation and management

### 4. Utilities (`utils/`)
- **`message-transformers.ts`**: Message format conversion utilities

### 5. Providers (`providers/`)
- **`anthropic.ts`**: Clean Anthropic provider implementation
- **`openai.ts`**: Clean OpenAI provider implementation
- **`ollama.ts`**: Clean Ollama provider implementation

## Key Benefits

### 1. Reduced Code Duplication
- **Before**: 400+ lines of switch statement
- **After**: Clean registry with ~10 lines per provider

### 2. Consistent Error Handling
- Standardized error types and retry logic
- Provider-specific error messages
- Automatic retry with exponential backoff

### 3. Centralized Configuration
- Mode-specific configuration extraction
- Validation and normalization
- Default configuration management

### 4. Type Safety
- Strong typing throughout the system
- Compile-time validation
- Runtime error prevention

### 5. Easy Testing
- Each service can be tested independently
- Mock-friendly architecture
- Comprehensive test coverage

## Usage Examples

### Basic Usage
```typescript
import { buildApiHandler } from './api'

const handler = buildApiHandler(configuration, 'plan')
const stream = handler.createMessage(systemPrompt, messages)
```

### Advanced Usage
```typescript
import { ProviderFactoryService } from './api/services/provider-factory'

// Create handler with fallback
const handler = ProviderFactoryService.createHandlerWithFallback(
  configuration,
  'plan',
  {},
  'anthropic'
)

// Create handler with retry logic
const handler = await ProviderFactoryService.createHandlerWithRetry(
  configuration,
  'plan',
  {},
  3
)
```

### Error Handling
```typescript
import { ErrorService } from './api/services/error-service'

try {
  const result = await handler.createMessage(systemPrompt, messages)
} catch (error) {
  const apiError = ErrorService.parseError(error, 'anthropic')
  
  if (apiError.isRetriable()) {
    // Handle retry logic
    const delay = apiError.getRetryDelay()
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  ErrorService.logError(apiError, 'createMessage')
}
```

### Configuration Management
```typescript
import { ConfigurationService } from './api/services/configuration-service'

// Extract mode-specific configuration
const modeConfig = ConfigurationService.extractModeConfiguration(config, 'plan')

// Validate configuration
const validation = ConfigurationService.validateConfiguration(config, 'anthropic', 'plan')
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors)
}
```

## Provider Implementation

### Creating a New Provider

1. **Extend Base Class**:
```typescript
export class CustomProvider extends BaseProvider {
  protected createClient(): any {
    // Create your client
  }

  protected getModelInfo(): ModelInfo {
    // Return model information
  }

  async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
    // Implement message creation
  }
}
```

2. **Register Provider**:
```typescript
providerRegistry.registerProvider({
  providerId: 'custom',
  handlerClass: CustomProvider,
  requiredOptions: ['apiKey'],
  optionalOptions: ['baseUrl']
})
```

### HTTP-Based Providers

For HTTP-based providers, extend `HttpProvider`:

```typescript
export class CustomHttpProvider extends HttpProvider {
  protected createHttpClient(config: any): any {
    // Create HTTP client
  }

  protected processStreamResponse(response: any): ApiStream {
    // Process streaming response
  }
}
```

## Testing

### Unit Tests
```typescript
import { ProviderFactoryService } from '../services/provider-factory'

describe('ProviderFactoryService', () => {
  it('should create handlers for supported providers', () => {
    const handler = ProviderFactoryService.createHandler(config, 'plan')
    expect(handler).toBeDefined()
  })
})
```

### Integration Tests
```typescript
import { buildApiHandler } from '../index'

describe('API Integration', () => {
  it('should handle end-to-end message creation', async () => {
    const handler = buildApiHandler(config, 'plan')
    const stream = handler.createMessage(systemPrompt, messages)
    
    for await (const chunk of stream) {
      expect(chunk.type).toBeDefined()
    }
  })
})
```

## Architecture Overview

The API architecture follows the NORMIE DEV methodology with clean, unified patterns:

### Key Components
1. **Provider Registry**: Centralized provider management
2. **Base Classes**: Common functionality for all providers
3. **Services**: Configuration, error handling, and factory services
4. **Utilities**: Message transformers and format converters

### Quick Start
1. Import from the main API module
2. Use `ErrorService` for consistent error handling
3. Use `ConfigurationService` for configuration management
4. Register new providers with the registry

## Performance Considerations

### Caching
- Provider clients are cached and reused
- Configuration is normalized and cached
- Error handling is optimized for performance

### Memory Management
- Streams are properly cleaned up
- Clients are disposed when no longer needed
- Memory leaks are prevented through proper lifecycle management

### Retry Logic
- Exponential backoff with jitter
- Configurable retry limits
- Provider-specific retry strategies

## Security

### API Key Management
- Keys are validated before use
- Secure storage and transmission
- No logging of sensitive information

### Error Handling
- No sensitive information in error messages
- Proper error sanitization
- Secure error logging

## Monitoring and Observability

### Error Tracking
- Standardized error types
- Provider-specific error context
- Retry attempt tracking

### Performance Metrics
- Request/response timing
- Retry attempt counts
- Success/failure rates

### Logging
- Structured logging with context
- Configurable log levels
- Provider-specific log formatting

## Future Enhancements

### Planned Features
1. **Load Balancing**: Support for multiple provider instances
2. **Circuit Breaker**: Automatic failover for unreliable providers
3. **Metrics Collection**: Detailed performance and usage metrics
4. **Provider Health Checks**: Automatic provider health monitoring
5. **Dynamic Configuration**: Runtime configuration updates

### Extension Points
1. **Custom Error Handlers**: Provider-specific error handling
2. **Custom Retry Strategies**: Provider-specific retry logic
3. **Custom Transformers**: Provider-specific message transformations
4. **Custom Validators**: Provider-specific configuration validation

## Contributing

### Adding New Providers
1. Create provider class extending appropriate base class
2. Implement required methods
3. Add comprehensive tests
4. Register provider in registry
5. Update documentation

### Adding New Features
1. Follow existing patterns and conventions
2. Add comprehensive tests
3. Update documentation
4. Ensure backward compatibility

## Support

For questions or issues:
1. Check the test files for usage examples
2. Review the service documentation
3. Use the error service for debugging
4. Refer to the migration guide

The new architecture provides a solid foundation for future development while maintaining clean, maintainable code that follows the NORMIE DEV methodology.
