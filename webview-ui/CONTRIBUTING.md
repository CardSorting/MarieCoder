# Contributing to MarieCoder Webview-UI

Thank you for your interest in contributing to the MarieCoder webview-ui! This document provides guidelines and best practices for contributing to this project.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Architecture Overview](#architecture-overview)
4. [Coding Standards](#coding-standards)
5. [Pull Request Process](#pull-request-process)
6. [Testing Requirements](#testing-requirements)

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Familiarity with React 18, TypeScript, and Vite
- Understanding of VS Code extension development
- Read `docs/ARCHITECTURE.md` and `docs/BEST_PRACTICES.md`

### First Steps

1. **Read the documentation:**
   - `docs/ARCHITECTURE.md` - System architecture
   - `docs/BEST_PRACTICES.md` - Coding standards
   - `docs/CONTEXT_MIGRATION_GUIDE.md` - Context usage

2. **Explore the codebase:**
   - Browse `src/components/` to see component patterns
   - Review `src/context/` to understand state management
   - Check `src/__tests__/` for testing examples

3. **Run the development environment:**
   ```bash
   cd webview-ui
   npm install
   npm run dev
   ```

---

## Development Setup

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Check bundle size
npm run check:bundle-size

# Build for production
npm run build
```

### Development Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm test` | Run test suite |
| `npm run check:bundle-size` | Check bundle size against thresholds |
| `npm run lint` | Run linter |
| `npm run type-check` | TypeScript type checking |

---

## Architecture Overview

### Focused Context System

The webview-ui uses a **focused context architecture** where state is split into specialized contexts:

#### Context Providers

| Context | Purpose | When to Use |
|---------|---------|-------------|
| **SettingsContext** | Settings & configuration | API config, feature flags, preferences |
| **UIStateContext** | Navigation & visibility | View routing, modal state, UI toggles |
| **TaskStateContext** | Task execution & messages | Chat messages, history, checkpoints |
| **ModelsContext** | Model data & operations | OpenRouter models, model refresh |
| **McpContext** | MCP server management | MCP servers, marketplace, tools |

#### Deprecated Context

⚠️ **ExtensionStateContext is DEPRECATED** - Do not use in new code!

All production components (48/48) have been migrated to focused contexts. Use focused contexts for all new development.

### Key Principles

1. **Use the most specific context** - Don't import SettingsContext if you only need UI state
2. **Multiple contexts are OK** - Components can use 2-3 focused contexts
3. **Think about re-renders** - Focused contexts minimize unnecessary updates

---

## Coding Standards

### 1. Context Usage (REQUIRED)

```typescript
// ✅ DO: Use focused contexts
import { useSettingsState } from '@/context/SettingsContext'
import { useUIState } from '@/context/UIStateContext'

const MyComponent = () => {
  const { apiConfiguration } = useSettingsState()
  const { navigateToSettings } = useUIState()
  // ...
}

// ❌ DON'T: Use deprecated context
import { useExtensionState } from '@/context/ExtensionStateContext'

const MyComponent = () => {
  const { apiConfiguration, navigateToSettings } = useExtensionState()
  // This causes unnecessary re-renders!
}
```

### 2. File Naming (REQUIRED)

All files MUST use `snake_case`:

```
✅ Correct:
- user_message.tsx
- browser_settings_menu.tsx
- api_configuration_section.tsx

❌ Incorrect:
- UserMessage.tsx
- BrowserSettingsMenu.tsx
- ApiConfigurationSection.tsx
```

### 3. Import Paths (REQUIRED)

Use configured path aliases:

```typescript
// ✅ DO: Use path aliases
import { useSettingsState } from '@/context/SettingsContext'
import { Button } from '@/components/common/Button'
import { debug } from '@/utils/debug_logger'

// ❌ DON'T: Use deep relative imports
import { useSettingsState } from '../../../context/SettingsContext'
import { Button } from '../../common/Button'
```

**Available aliases:**
- `@/` → `src/`
- `@components` → `src/components`
- `@context` → `src/context`
- `@shared` → `../src/shared`
- `@utils` → `src/utils`

### 4. Debug Logging (REQUIRED)

```typescript
import { debug, logError } from '@/utils/debug_logger'

// ✅ DO: Use debug logger
debug.log('Processing data:', data)
debug.error('Operation failed:', error)

// ❌ DON'T: Use console directly
console.log('Processing data:', data)  // Included in production!
console.error('Operation failed:', error)
```

**Benefits:**
- Automatically stripped from production
- Structured logging
- Better debugging

### 5. Type Safety (REQUIRED)

```typescript
// ✅ DO: Define explicit types
interface ComponentProps {
  value: string
  onChange: (value: string) => void
}

const Component = ({ value, onChange }: ComponentProps) => {
  // Fully typed
}

// ❌ DON'T: Use 'any' without justification
const Component = ({ value, onChange }: any) => {
  // TypeScript can't help you!
}
```

---

## Component Development Guidelines

### Creating New Components

**Step 1: Choose the Right Context(s)**

Determine which context(s) your component needs:

```typescript
// Need settings? → useSettingsState()
// Need navigation? → useUIState()
// Need messages? → useTaskState()
// Need models? → useModelsState()
// Need MCP? → useMcpState()
```

**Step 2: Component Template**

```typescript
import React from 'react'
import { useSettingsState } from '@/context/SettingsContext'

interface MyComponentProps {
  // Define props
}

const MyComponent = ({ }: MyComponentProps) => {
  // 1. Context hooks (focused contexts only!)
  const { apiConfiguration } = useSettingsState()
  
  // 2. Local state
  const [localState, setLocalState] = React.useState('')
  
  // 3. Effects and handlers
  React.useEffect(() => {
    // Side effects
  }, [])
  
  const handleAction = () => {
    // Event handling
  }
  
  // 4. Render
  return <div>...</div>
}

export default MyComponent
```

**Step 3: Add Tests**

Create `MyComponent.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { SettingsContextProvider } from '@/context/SettingsContext'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(
      <SettingsContextProvider>
        <MyComponent />
      </SettingsContextProvider>
    )
    
    expect(screen.getByText('Expected')).toBeInTheDocument()
  })
})
```

---

## Pull Request Process

### Before Submitting

**Pre-submission checklist:**

- [ ] Code follows focused context pattern
- [ ] No `useExtensionState()` usage in new code
- [ ] Path aliases used throughout
- [ ] Debug logger used (no console.*)
- [ ] All TypeScript types defined
- [ ] Tests written and passing
- [ ] No linting errors
- [ ] Bundle size checked
- [ ] Documentation updated (if needed)

### Running Checks

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Tests
npm test

# Bundle size
npm run check:bundle-size

# Production build
npm run build
```

### PR Title Format

```
type(scope): Brief description

Examples:
feat(contexts): Add new FeatureContext for X
fix(chat): Correct message rendering issue
refactor(settings): Simplify settings handler
perf(bundle): Reduce vendor chunk size
docs(architecture): Update context documentation
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Refactoring
- [ ] Documentation

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Performance Impact
- Bundle size: [before] → [after]
- Performance: [describe impact]

## Checklist
- [ ] Follows focused context pattern
- [ ] No useExtensionState() in new code
- [ ] Path aliases used
- [ ] Debug logger used
- [ ] Types defined
- [ ] Tests passing
- [ ] No linting errors
- [ ] Documentation updated
```

---

## Testing Requirements

### Minimum Requirements

- **New features:** 80%+ test coverage
- **Bug fixes:** Test that reproduces the bug
- **Refactoring:** Existing tests must pass
- **Context changes:** Comprehensive context tests

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('feature/behavior', () => {
    it('does something specific', () => {
      // Arrange
      const props = { value: 'test' }
      
      // Act
      render(<Component {...props} />)
      
      // Assert
      expect(screen.getByText('test')).toBeInTheDocument()
    })
  })
})
```

### Mocking

gRPC services are mocked in `src/setupTests.ts`:

```typescript
// Services are already mocked globally
// Just import and use in your tests
import { StateServiceClient } from '@/services/grpc-client'

// StateServiceClient.updateSettings is already mocked
```

---

## Code Review Guidelines

### What Reviewers Look For

1. **Focused Context Usage**
   - Is the component using focused contexts?
   - Are the right contexts being used?
   - Could it use fewer contexts?

2. **Performance**
   - Any unnecessary re-renders?
   - Should heavy components be lazy loaded?
   - Is memoization appropriate?

3. **Type Safety**
   - Are all props typed?
   - Any use of `any`?
   - Generic types used correctly?

4. **Testing**
   - Adequate test coverage?
   - Tests actually test behavior?
   - Edge cases covered?

5. **Code Quality**
   - Follows naming conventions?
   - Path aliases used?
   - Debug logger used?
   - Well documented?

---

## Common Contribution Scenarios

### Scenario 1: Adding a New Setting

**Step 1:** Add to SettingsContext

```typescript
// src/context/SettingsContext.tsx
export interface SettingsContextType {
  // ... existing settings
  myNewSetting: boolean
}
```

**Step 2:** Add to backend state sync

```typescript
// In SettingsContextProvider
if (stateData.myNewSetting !== undefined) {
  setMyNewSetting(stateData.myNewSetting)
}
```

**Step 3:** Create settings UI component

```typescript
import { useSettingsState } from '@/context/SettingsContext'
import { updateSetting } from '@/components/settings/utils/settingsHandlers'

const MyNewSetting = () => {
  const { myNewSetting } = useSettingsState()
  
  return (
    <input
      type="checkbox"
      checked={myNewSetting}
      onChange={(e) => updateSetting('myNewSetting', e.target.checked)}
    />
  )
}
```

**Step 4:** Add tests

```typescript
// src/context/__tests__/SettingsContext.test.tsx
it('provides myNewSetting', () => {
  const { result } = renderHook(() => useSettingsState(), {
    wrapper: SettingsContextProvider
  })
  
  expect(result.current.myNewSetting).toBeDefined()
})
```

### Scenario 2: Adding a New Component

**Follow the component template:**

```typescript
import { useSettingsState } from '@/context/SettingsContext'

interface MyComponentProps {
  value: string
}

const MyComponent = ({ value }: MyComponentProps) => {
  const { apiConfiguration } = useSettingsState()
  
  return <div>{value}</div>
}

export default MyComponent
```

**Add tests:**

```typescript
import { render } from '@testing-library/react'
import { SettingsContextProvider } from '@/context/SettingsContext'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders value', () => {
    const { getByText } = render(
      <SettingsContextProvider>
        <MyComponent value="test" />
      </SettingsContextProvider>
    )
    
    expect(getByText('test')).toBeInTheDocument()
  })
})
```

### Scenario 3: Fixing a Bug

1. **Write a failing test** that reproduces the bug
2. **Fix the bug** in the code
3. **Verify the test passes**
4. **Check for regressions** (run full test suite)
5. **Update documentation** if behavior changed

---

## Questions?

If you have questions:

1. Check `docs/ARCHITECTURE.md` for system design
2. Check `docs/BEST_PRACTICES.md` for coding patterns
3. Check `docs/CONTEXT_MIGRATION_GUIDE.md` for context usage
4. Look at recently migrated components for examples
5. Ask in discussions or issues

---

## Thank You!

Your contributions help make MarieCoder better for everyone. We appreciate your time and effort in maintaining the high quality standards that make this codebase excellent! 🙏✨

---

**Last Updated:** October 15, 2025  
**Architecture Version:** 1.0.0 (Focused Context System)  
**Migration Status:** 100% Complete (48/48 components)
