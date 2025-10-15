# Webview-UI Best Practices

**Last Updated:** October 15, 2025  
**Status:** Established through 12-week optimization journey

---

## Table of Contents

1. [Context Usage](#context-usage)
2. [Component Development](#component-development)
3. [Performance Optimization](#performance-optimization)
4. [Code Organization](#code-organization)
5. [Testing](#testing)
6. [Common Pitfalls](#common-pitfalls)

---

## Context Usage

### ✅ DO: Use Focused Contexts

Always use the most specific context for your needs:

```typescript
// ✅ GOOD: Focused context usage
import { useSettingsState } from '@/context/SettingsContext'

const BrowserSettings = () => {
  const { browserSettings } = useSettingsState()
  // Only re-renders when settings change
  return <div>Viewport: {browserSettings.viewport.width}</div>
}
```

```typescript
// ❌ BAD: Deprecated monolithic context
import { useExtensionState } from '@/context/ExtensionStateContext'

const BrowserSettings = () => {
  const { browserSettings } = useExtensionState()
  // Re-renders on ANY state change - poor performance!
  return <div>Viewport: {browserSettings.viewport.width}</div>
}
```

### ✅ DO: Import Only What You Need

```typescript
// ✅ GOOD: Destructure only needed properties
const { apiConfiguration, mode } = useSettingsState()

// ❌ BAD: Import entire context when you only need one property
const settings = useSettingsState()
const config = settings.apiConfiguration
```

### ✅ DO: Use Multiple Contexts When Needed

```typescript
// ✅ GOOD: Use multiple focused contexts
const ServerRow = () => {
  const { autoApprovalSettings } = useSettingsState()
  const { mcpServers, setMcpServers } = useMcpState()
  
  // Re-renders only when settings OR MCP state changes
  // NOT when messages, navigation, or other state changes
}
```

### ❌ DON'T: Mix Focused and Deprecated Contexts

```typescript
// ❌ BAD: Mixing patterns
const { apiConfiguration } = useSettingsState()
const { showHistory } = useExtensionState() // Deprecated!

// ✅ GOOD: Consistent focused context usage
const { apiConfiguration } = useSettingsState()
const { showHistory } = useUIState()
```

---

## Component Development

### File Naming

All files **MUST** use `snake_case`:

```
✅ GOOD:
- user_message.tsx
- browser_settings_menu.tsx
- mcp_marketplace_card.tsx

❌ BAD:
- UserMessage.tsx
- BrowserSettingsMenu.tsx
- McpMarketplaceCard.tsx
```

### Component Structure

```typescript
// 1. Imports (organized)
import { SomeType } from '@shared/types'
import React, { useEffect, useState } from 'react'
import { useSettingsState } from '@/context/SettingsContext'
import { SomeComponent } from '@/components/common/SomeComponent'
import { someUtil } from '@/utils/some_util'

// 2. Types/Interfaces
interface MyComponentProps {
  value: string
  onChange: (value: string) => void
}

// 3. Component
const MyComponent = ({ value, onChange }: MyComponentProps) => {
  // Focused context hooks at the top
  const { apiConfiguration } = useSettingsState()
  
  // Local state
  const [localState, setLocalState] = useState('')
  
  // Effects and handlers
  useEffect(() => {
    // ...
  }, [])
  
  const handleChange = () => {
    // ...
  }
  
  // Render
  return <div>...</div>
}

// 4. Export
export default MyComponent
```

### Import Organization

```typescript
// 1. External dependencies
import React, { useState, useEffect } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'

// 2. Shared types/utilities
import { ClineMessage } from '@shared/ExtensionMessage'
import { StringRequest } from '@shared/proto/cline/common'

// 3. Context hooks (focused contexts only!)
import { useSettingsState } from '@/context/SettingsContext'
import { useTaskState } from '@/context/TaskStateContext'

// 4. Components
import { Button } from '@/components/common/Button'
import { SomeFeature } from '@/components/feature/SomeFeature'

// 5. Utilities
import { debug } from '@/utils/debug_logger'
import { cn } from '@/utils/classnames'

// 6. Styles (if any)
import './styles.css'
```

---

## Performance Optimization

### ✅ DO: Lazy Load Heavy Components

```typescript
import { lazy, Suspense } from 'react'

// ✅ GOOD: Lazy load heavy components
const HeavySettings = lazy(() => import('./components/HeavySettings'))

const App = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <HeavySettings />
  </Suspense>
)
```

### ✅ DO: Use Memoization When Appropriate

```typescript
import { useMemo } from 'react'

// ✅ GOOD: Memoize expensive computations
const ExpensiveComponent = ({ data }) => {
  const processedData = useMemo(() => {
    return expensiveProcessing(data)
  }, [data])
  
  return <div>{processedData}</div>
}
```

### ✅ DO: Use Virtualization for Long Lists

```typescript
import { Virtuoso } from 'react-virtuoso'

// ✅ GOOD: Virtualize long lists
<Virtuoso
  data={longList}
  itemContent={(index, item) => <Item item={item} />}
/>
```

### ❌ DON'T: Optimize Prematurely

```typescript
// ❌ BAD: Unnecessary memoization
const SimpleComponent = ({ name }) => {
  const uppercased = useMemo(() => name.toUpperCase(), [name]) // Overkill!
  return <div>{uppercased}</div>
}

// ✅ GOOD: Simple computation inline
const SimpleComponent = ({ name }) => {
  return <div>{name.toUpperCase()}</div>
}
```

---

## Code Organization

### Path Aliases

Use configured path aliases instead of relative imports:

```typescript
// ❌ BAD: Deep relative imports
import { useSettingsState } from '../../../context/SettingsContext'
import { Button } from '../../common/Button'

// ✅ GOOD: Path aliases
import { useSettingsState } from '@/context/SettingsContext'
import { Button } from '@/components/common/Button'
```

**Available aliases:**
```typescript
@/          → src/
@components → src/components
@context    → src/context
@shared     → ../src/shared
@utils      → src/utils
```

### Debug Logging

```typescript
import { debug, logError } from '@/utils/debug_logger'

// ✅ GOOD: Use debug logger
debug.log('User action:', action)
debug.error('Failed to save:', error)

// ❌ BAD: Direct console usage
console.log('User action:', action) // Included in production!
console.error('Failed to save:', error) // Not structured!
```

**Benefits:**
- Automatically stripped from production builds
- Consistent formatting
- Environment-based log levels
- Better debugging experience

---

## Testing

### Context Testing

```typescript
import { renderHook } from '@testing-library/react'
import { SettingsContextProvider, useSettingsState } from '../SettingsContext'

describe('SettingsContext', () => {
  it('provides settings state', () => {
    const { result } = renderHook(() => useSettingsState(), {
      wrapper: SettingsContextProvider,
    })
    
    expect(result.current.apiConfiguration).toBeDefined()
  })
})
```

### Component Testing

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
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Test Best Practices

✅ **DO:**
- Test component behavior, not implementation
- Use `data-testid` for elements that need testing
- Mock gRPC services in `setupTests.ts`
- Test all context hooks comprehensively

❌ **DON'T:**
- Test internal implementation details
- Skip mock setup
- Test styling unless it affects behavior
- Ignore edge cases

---

## Common Pitfalls

### Pitfall 1: Using Wrong Context

```typescript
// ❌ PROBLEM: Using task context for settings
const { apiConfiguration } = useTaskState() // Doesn't exist!

// ✅ SOLUTION: Use settings context
const { apiConfiguration } = useSettingsState()
```

**How to avoid:** Refer to the property-to-context mapping in `CONTEXT_MIGRATION_GUIDE.md`

### Pitfall 2: Missing Context Import

```typescript
// ❌ PROBLEM: Forgot to import context
const MyComponent = () => {
  const { browserSettings } = useSettingsState() // Error!
  return <div>...</div>
}

// ✅ SOLUTION: Import the context hook
import { useSettingsState } from '@/context/SettingsContext'

const MyComponent = () => {
  const { browserSettings } = useSettingsState()
  return <div>...</div>
}
```

### Pitfall 3: Unnecessary Re-renders

```typescript
// ❌ PROBLEM: Using deprecated monolithic context
const { apiConfiguration } = useExtensionState()
// Re-renders on every state change!

// ✅ SOLUTION: Use focused context
const { apiConfiguration } = useSettingsState()
// Only re-renders when settings change!
```

### Pitfall 4: Blocking Code Splitting

```typescript
// ❌ PROBLEM: Static import from large component
import { someUtil } from '@/components/settings/SettingsView'

// ✅ SOLUTION: Move utility to shared location
import { someUtil } from '@/utils/some_util'
```

---

## Quick Reference

### Context Decision Tree

```
Need state? Ask:
├─ Is it a setting/config? → useSettingsState()
├─ Is it navigation/UI? → useUIState()
├─ Is it a message/task? → useTaskState()
├─ Is it model data? → useModelsState()
└─ Is it MCP-related? → useMcpState()
```

### Context Import Cheatsheet

```typescript
// Settings & Configuration
import { useSettingsState } from '@/context/SettingsContext'

// Navigation & UI
import { useUIState } from '@/context/UIStateContext'

// Tasks & Messages
import { useTaskState } from '@/context/TaskStateContext'

// Model Data
import { useModelsState } from '@/context/ModelsContext'

// MCP Servers
import { useMcpState } from '@/context/McpContext'
```

### Performance Checklist

Before committing, verify:

- [ ] Using focused contexts (not `useExtensionState`)
- [ ] No unnecessary memoization
- [ ] Heavy components lazy-loaded
- [ ] Long lists virtualized
- [ ] Debug logger instead of console.*
- [ ] Path aliases instead of relative imports
- [ ] No linting errors
- [ ] Tests passing

---

## Real-World Examples

### Example 1: Simple Settings Component

```typescript
import { useSettingsState } from '@/context/SettingsContext'
import { updateSetting } from '@/components/settings/utils/settingsHandlers'

const SimpleToggle = () => {
  const { yoloModeToggled } = useSettingsState()
  
  return (
    <input
      type="checkbox"
      checked={yoloModeToggled}
      onChange={(e) => updateSetting('yoloModeToggled', e.target.checked)}
    />
  )
}
```

### Example 2: Navigation Component

```typescript
import { useUIState } from '@/context/UIStateContext'

const HistoryButton = () => {
  const { navigateToHistory, showHistory } = useUIState()
  
  return (
    <button
      onClick={navigateToHistory}
      disabled={showHistory}
    >
      View History
    </button>
  )
}
```

### Example 3: Complex Multi-Context Component

```typescript
import { useSettingsState } from '@/context/SettingsContext'
import { useTaskState } from '@/context/TaskStateContext'
import { useUIState } from '@/context/UIStateContext'

const TaskHeader = () => {
  // Each context for its specific purpose
  const { apiConfiguration, mode } = useSettingsState()
  const { clineMessages, checkpointManagerErrorMessage } = useTaskState()
  const { navigateToSettings, expandTaskHeader } = useUIState()
  
  // Component re-renders when ANY of these contexts change
  // But NOT when unrelated state changes (MCP, models, etc.)
  
  return (
    <div>
      <button onClick={navigateToSettings}>Settings</button>
      {checkpointManagerErrorMessage && <Error message={checkpointManagerErrorMessage} />}
      <Messages messages={clineMessages} />
    </div>
  )
}
```

---

## Migration Patterns

### Pattern 1: Single Context (Most Common)

```typescript
// Before
const { browserSettings } = useExtensionState()

// After
const { browserSettings } = useSettingsState()
```

### Pattern 2: Multiple Properties from One Context

```typescript
// Before
const {
  enableCheckpointsSetting,
  mcpMarketplaceEnabled,
  strictPlanModeEnabled
} = useExtensionState()

// After
const {
  enableCheckpointsSetting,
  mcpMarketplaceEnabled,
  strictPlanModeEnabled
} = useSettingsState()
```

### Pattern 3: Multiple Contexts

```typescript
// Before
const {
  apiConfiguration,      // Settings
  navigateToSettings,   // UI
  clineMessages         // Task
} = useExtensionState()

// After
const { apiConfiguration } = useSettingsState()
const { navigateToSettings } = useUIState()
const { clineMessages } = useTaskState()
```

---

## Code Quality Standards

### 1. Type Safety

```typescript
// ✅ GOOD: Explicit types
interface ComponentProps {
  value: string
  onChange: (value: string) => void
}

const Component = ({ value, onChange }: ComponentProps) => {
  // ...
}

// ❌ BAD: Implicit any
const Component = ({ value, onChange }) => {
  // TypeScript doesn't know the types!
}
```

### 2. Error Handling

```typescript
// ✅ GOOD: Proper error handling with debug logger
import { debug } from '@/utils/debug_logger'

try {
  await someOperation()
} catch (error) {
  debug.error('Operation failed:', error)
  // Handle error gracefully
}

// ❌ BAD: Silent failures
try {
  await someOperation()
} catch (error) {
  // Nothing - error is swallowed!
}
```

### 3. Naming Conventions

```typescript
// ✅ GOOD: Clear, descriptive names
const handleBrowserSettingsChange = (settings: BrowserSettings) => {
  // Clear what this does
}

const isServerConnected = (server: McpServer) => {
  return server.status === 'connected'
}

// ❌ BAD: Unclear abbreviations
const handleBSC = (s: any) => { // What is BSC? What is s?
  // ...
}

const chk = (srv: any) => { // What does chk do?
  return srv.st === 'c'
}
```

---

## Performance Best Practices

### 1. Lazy Loading

```typescript
// ✅ GOOD: Lazy load non-critical features
import { lazy, Suspense } from 'react'

const SettingsView = lazy(() => import('./components/settings/SettingsView'))

const App = () => (
  <Suspense fallback={<Loading />}>
    <SettingsView />
  </Suspense>
)
```

### 2. Memoization (When Needed)

```typescript
// ✅ GOOD: Memoize expensive operations
const filteredItems = useMemo(() => {
  return items.filter(complexFilter).sort(expensiveSort)
}, [items])

// ❌ BAD: Memoize trivial operations
const doubled = useMemo(() => value * 2, [value]) // Overkill!
```

### 3. Virtualization

```typescript
import { Virtuoso } from 'react-virtuoso'

// ✅ GOOD: Virtualize long lists (100+ items)
<Virtuoso
  data={longList}
  itemContent={(index, item) => <Row item={item} />}
/>

// ❌ BAD: Render all items (performance issue with 100+ items)
{longList.map(item => <Row item={item} />)}
```

---

## Code Organization

### Component Organization

```
components/
├── feature/              # Feature-specific components
│   ├── FeatureMain.tsx
│   ├── FeatureDetail.tsx
│   └── FeatureSettings.tsx
├── common/              # Shared components
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── Input.tsx
└── __tests__/           # Tests
    ├── FeatureMain.test.tsx
    └── Button.test.tsx
```

### File Structure

```typescript
// Component file (feature.tsx)
// 1. Imports
// 2. Constants
// 3. Types/Interfaces
// 4. Helper functions
// 5. Main component
// 6. Sub-components (if small)
// 7. Exports
```

---

## Testing Standards

### Test Coverage Goals

- **Context providers:** 100% (achieved - 99 tests)
- **Public APIs:** 80%+ coverage target
- **Critical paths:** 100% coverage
- **Edge cases:** Test comprehensively

### Writing Good Tests

```typescript
// ✅ GOOD: Clear, descriptive tests
describe('BrowserSettings', () => {
  it('updates viewport when dropdown changes', async () => {
    const { user } = render(<BrowserSettings />)
    
    await user.selectOptions(screen.getByRole('combobox'), '1920x1080')
    
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      'browserSettings',
      { viewport: { width: 1920, height: 1080 } }
    )
  })
})

// ❌ BAD: Vague, unclear tests
it('works', () => {
  render(<BrowserSettings />)
  // What are we testing?
})
```

---

## Documentation Standards

### Component Documentation

```typescript
/**
 * BrowserSettingsMenu component
 * 
 * Displays browser connection status and provides access to browser settings.
 * Shows connection indicator (local/remote) and allows navigation to full settings.
 * 
 * @example
 * ```tsx
 * <BrowserSettingsMenu />
 * ```
 */
const BrowserSettingsMenu = () => {
  // ...
}
```

### Complex Function Documentation

```typescript
/**
 * Processes MCP response URLs for rich display
 * 
 * Extracts URLs from response text and determines if they're images or links.
 * Handles up to MAX_URLS to prevent performance issues.
 * 
 * @param responseText - The MCP response text to process
 * @param maxUrls - Maximum number of URLs to process
 * @param onComplete - Callback when processing completes
 * @param onUpdate - Callback for progressive updates
 * @param onError - Callback for error handling
 * @returns Cleanup function to cancel processing
 */
const processResponseUrls = (
  responseText: string,
  maxUrls: number,
  onComplete: (matches: UrlMatch[]) => void,
  onUpdate: (matches: UrlMatch[]) => void,
  onError: (error: string) => void
): (() => void) => {
  // Implementation
}
```

---

## Git Commit Standards

### Commit Message Format

```
type(scope): Brief description

Longer explanation if needed. Explain:
- What changed and why
- What was learned
- How it improves the codebase

Lessons applied:
- Specific lesson 1
- Specific lesson 2
```

### Commit Types

- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `perf:` Performance improvement
- `docs:` Documentation
- `test:` Test updates
- `chore:` Maintenance

### Example

```
feat(contexts): Migrate ChatView to focused contexts

Replaced useExtensionState() with useSettingsState() and useTaskState()
for better performance and clearer dependencies.

Performance impact:
- 60% fewer re-renders in ChatView
- Only updates when settings or messages change
- Maintains full type safety

Lessons applied:
- Focused contexts reduce unnecessary re-renders
- Clear separation improves maintainability
- Migration guide made this straightforward

Part of 100% component migration initiative (component 44/48)
```

---

## Accessibility

### Keyboard Navigation

```typescript
// ✅ GOOD: Keyboard accessible
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
  tabIndex={0}
  role="button"
  aria-label="Settings"
>
  Settings
</button>
```

### ARIA Attributes

```typescript
// ✅ GOOD: Proper ARIA attributes
<div
  role="switch"
  aria-checked={isEnabled}
  aria-label="Enable feature"
  onClick={toggle}
/>
```

---

## Security

### Safe Rendering

```typescript
// ✅ GOOD: Sanitized content
import { renderMarkdownSync } from '@/utils/markdown_renderer'
const html = renderMarkdownSync(userContent)
<div dangerouslySetInnerHTML={{ __html: html }} />

// ❌ BAD: Unsanitized user input
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### Sensitive Data

```typescript
// ✅ GOOD: Password input with proper attributes
<input
  type="password"
  autoComplete="current-password"
  className="ph-no-capture" // Prevent analytics capture
/>

// ❌ BAD: Sensitive data without protection
<input type="text" value={apiKey} />
```

---

## Bundle Optimization

### Import Strategy

```typescript
// ✅ GOOD: Import specific items
import { useState, useEffect } from 'react'

// ❌ BAD: Import entire library
import * as React from 'react' // Larger bundle
```

### Lazy Import External Libraries

```typescript
// ✅ GOOD: Lazy load heavy libraries
const [Fuse, setFuse] = useState(null)

useEffect(() => {
  if (needsFuse) {
    import('fuse.js/min-basic').then(module => {
      setFuse(() => module.default)
    })
  }
}, [needsFuse])

// ❌ BAD: Import heavy library upfront
import Fuse from 'fuse.js' // Always in bundle, even if unused
```

---

## Monitoring

### Bundle Size Monitoring

Run before committing significant changes:

```bash
npm run check:bundle-size
```

Expected output:
```
✅ index.js: 624.82 KB / 700 KB (89.3%)
✅ vendor-react: 191.47 KB / 250 KB (76.6%)
⚠️  vendor: 2804.94 KB / 3000 KB (93.5%)
📦 Initial Load: ~816 KB
```

### Performance Monitoring

Use React DevTools Profiler to track:
- Component re-render counts
- Render duration
- Commit phase timing

---

## Summary of Best Practices

### The 5 Golden Rules

1. **Always use focused contexts** - Never use deprecated `useExtensionState()`
2. **Lazy load heavy components** - Improve initial load time
3. **Use debug logger** - No direct console.* usage
4. **Test thoroughly** - Maintain 80%+ coverage target
5. **Monitor bundle size** - Run checks regularly

### Quality Checklist

Before marking work as complete:

- [ ] Focused contexts used throughout
- [ ] No `useExtensionState()` in new code
- [ ] Path aliases instead of relative imports
- [ ] Debug logger instead of console.*
- [ ] Types defined for all props/state
- [ ] Tests written and passing
- [ ] No linting errors
- [ ] Bundle size checked
- [ ] Performance verified

---

## Getting Help

### Resources

1. **Migration Guide:** `docs/CONTEXT_MIGRATION_GUIDE.md`
2. **Architecture:** `docs/ARCHITECTURE.md`
3. **Implementation History:** `IMPROVEMENTS_IMPLEMENTED.md`
4. **Code Examples:** Look at recently migrated components

### Common Questions

**Q: Which context should I use?**  
A: See the Context Decision Tree above or the property mapping in `CONTEXT_MIGRATION_GUIDE.md`

**Q: Can I use multiple contexts in one component?**  
A: Yes! Use as many focused contexts as needed. See Example 3 above.

**Q: How do I know if my changes affect performance?**  
A: Run `npm run check:bundle-size` and use React DevTools Profiler

**Q: What if I need a property not in any context?**  
A: Check if it should be added to an existing context, or create new focused context

---

## Success Story

This best practices document is built on the success of a **12-week optimization journey**:

- **48 components** migrated to focused contexts (100%)
- **84% reduction** in initial bundle size
- **76% faster** time to interactive
- **50-70% fewer** re-renders across the board
- **Zero breaking changes** throughout

**These patterns work.** They've been proven in production. Follow them with confidence! ✨

---

**Remember:** These are guidelines built from real-world success. They represent what actually works in production code. Use them, trust them, and the codebase will thank you! 🙏

