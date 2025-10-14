# Webview-UI Test Utilities

This directory contains shared test utilities and mock data factories for testing the webview-ui.

## Files

### test-utils.tsx
Custom render methods and test helpers that make testing easier.

**Key exports:**
- `renderWithProviders(ui, options)` - Renders a component wrapped with all necessary context providers
- `renderHookWithProviders(hook, options)` - Renders a hook with all context providers
- `mockVSCodeAPI()` - Returns a mocked VSCode API object
- `createMockExtensionState(overrides)` - Creates a mock extension state with sensible defaults
- `mockIntersectionObserver()` - Mocks IntersectionObserver for components that use it
- `mockResizeObserver()` - Mocks ResizeObserver for components that use it
- `waitForAsync()` - Helper to wait for async updates
- `createMockFile(name, content, type)` - Creates a mock File object for testing file uploads

**Usage:**
```typescript
import { renderWithProviders, screen } from '@/__tests__/test-utils'

test('should render component', () => {
  renderWithProviders(<MyComponent />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

### mock-data.ts
Factory functions for creating consistent mock data across tests.

**Key exports:**
- `createMockChatMessage(overrides)` - Creates a mock chat message
- `createMockTask(overrides)` - Creates a mock task item
- `createMockConversationHistory(length)` - Creates a conversation history
- `createMockTaskWithHistory(messageCount)` - Creates a task with messages
- `createMockImageData()` - Creates mock image data
- `createMockMcpServer(overrides)` - Creates a mock MCP server config
- `createMockApiConfiguration(overrides)` - Creates mock API configuration
- `createMockBrowserSettings(overrides)` - Creates mock browser settings

**Usage:**
```typescript
import { createMockTask, createMockChatMessage } from '@/__tests__/mock-data'

test('should handle task with messages', () => {
  const task = createMockTask({
    id: 'test-123',
    conversationHistory: [
      createMockChatMessage({ text: 'Hello' }),
      createMockChatMessage({ text: 'World' })
    ]
  })

  expect(task.conversationHistory).toHaveLength(2)
})
```

## Writing Tests

### Component Tests

Always use `renderWithProviders` to ensure your components have access to all necessary context:

```typescript
import { renderWithProviders, screen } from '@/__tests__/test-utils'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    renderWithProviders(<MyComponent />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

### Hook Tests

Use `renderHookWithProviders` for testing custom hooks:

```typescript
import { renderHookWithProviders } from '@/__tests__/test-utils'
import { useMyHook } from '../useMyHook'

describe('useMyHook', () => {
  it('should return initial value', () => {
    const { result } = renderHookWithProviders(() => useMyHook())
    expect(result.current.value).toBe('initial')
  })
})
```

### Testing with Mock Data

```typescript
import { createMockTask } from '@/__tests__/mock-data'

test('should display task', () => {
  const task = createMockTask({
    task: 'Test Task',
    tokensIn: 100,
    tokensOut: 200
  })

  renderWithProviders(<TaskView task={task} />)
  expect(screen.getByText('Test Task')).toBeInTheDocument()
})
```

## Test Patterns

### Testing User Interactions

```typescript
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils'

test('should handle button click', () => {
  const onClickMock = vi.fn()
  renderWithProviders(<Button onClick={onClickMock} />)

  fireEvent.click(screen.getByRole('button'))
  expect(onClickMock).toHaveBeenCalledTimes(1)
})
```

### Testing Async Behavior

```typescript
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils'

test('should load data', async () => {
  renderWithProviders(<DataComponent />)

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument()
  })
})
```

### Testing Context

```typescript
import { renderHookWithProviders } from '@/__tests__/test-utils'
import { useExtensionState } from '@/context/ExtensionStateContext'

test('should access context', () => {
  const { result } = renderHookWithProviders(() => useExtensionState())
  expect(result.current.didHydrateState).toBeDefined()
})
```

## Mocking

### VSCode API

The VSCode API is automatically mocked in setupTests.ts, but you can create additional mocks if needed:

```typescript
import { mockVSCodeAPI } from '@/__tests__/test-utils'

test('should post message to VSCode', () => {
  const api = mockVSCodeAPI()

  // Your test code that uses vscode.postMessage

  expect(api.postMessage).toHaveBeenCalled()
})
```

### gRPC Clients

gRPC clients are mocked globally in setupTests.ts. To customize behavior in a specific test:

```typescript
import { vi } from 'vitest'

vi.mock('@/services/grpc-client', () => ({
  UiServiceClient: {
    subscribeToDidBecomeVisible: vi.fn(() => vi.fn()),
    // ... other methods
  }
}))
```

## Best Practices

1. **Use descriptive test names**: Test names should clearly describe what is being tested
2. **One assertion per test**: Keep tests focused on a single behavior
3. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
4. **Use mock data factories**: Always use the factories in mock-data.ts for consistency
5. **Clean up after tests**: Vitest handles most cleanup, but be mindful of timers and subscriptions
6. **Test user behavior**: Focus on testing what users see and do, not implementation details

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (great for TDD)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm run test src/components/MyComponent.test.tsx
```

## Debugging Tests

### View test output
```bash
npm run test -- --reporter=verbose
```

### Run tests with UI
```bash
npm run test -- --ui
```

### Debug in VSCode
Add this configuration to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

## Common Issues

### Issue: "Cannot find module" errors
**Solution**: Check that your imports use the correct path aliases (`@/` for src)

### Issue: "Context not found" errors
**Solution**: Make sure you're using `renderWithProviders` instead of plain `render`

### Issue: Tests timeout
**Solution**: Check for missing `await` on async operations and ensure cleanup in useEffect hooks

### Issue: State not updating
**Solution**: Wrap state updates in `act()` from React Testing Library

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
