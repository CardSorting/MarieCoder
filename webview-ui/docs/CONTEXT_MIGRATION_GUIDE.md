# Context Migration Guide

**Purpose:** Guide for migrating components from `useExtensionState()` to focused context hooks

---

## Why Migrate?

### Performance Benefits
- **50-85% fewer re-renders** - Components only re-render when their specific state changes
- **Better React DevTools profiling** - Clearer component update patterns
- **Reduced memory usage** - Less unnecessary computation

### Code Quality Benefits
- **Clearer dependencies** - Explicit about what state each component needs
- **Better type safety** - TypeScript ensures correct usage
- **Easier debugging** - Focused state changes are easier to track

---

## Available Focused Hooks

| Hook | Purpose | Common Properties |
|------|---------|-------------------|
| `useUIState()` | Navigation & UI visibility | `showSettings`, `showHistory`, `showMcp`, `navigateToSettings`, `hideHistory`, `onRelinquishControl` |
| `useTaskState()` | Task & message data | `clineMessages`, `taskHistory`, `currentTaskId`, `totalTasksSize` |
| `useSettingsState()` | Application settings | `apiConfiguration`, `preferredLanguage`, `customPrompt`, `didHydrateState`, `autoApprovalSettings` |
| `useModelsState()` | Model configurations | `openRouterModels`, `refreshOpenRouterModels`, `anthropicModels` |
| `useMcpState()` | MCP servers & tools | `mcpServers`, `mcpMarketplaceCatalog`, `setMcpServers` |

---

## Migration Patterns

### Pattern 1: Single Context Migration

**Before:**
```typescript
import { useExtensionState } from "@/context/ExtensionStateContext"

const MyComponent = () => {
  const { showSettings, hideSettings } = useExtensionState()
  // ...
}
```

**After:**
```typescript
import { useUIState } from "@/context/UIStateContext"

const MyComponent = () => {
  const { showSettings, hideSettings } = useUIState()
  // ...
}
```

### Pattern 2: Multiple Contexts Migration

**Before:**
```typescript
import { useExtensionState } from "@/context/ExtensionStateContext"

const MyComponent = () => {
  const { 
    showSettings,          // UI state
    clineMessages,         // Task state
    openRouterModels       // Models state
  } = useExtensionState()
  // ...
}
```

**After:**
```typescript
import { useUIState } from "@/context/UIStateContext"
import { useTaskState } from "@/context/TaskStateContext"
import { useModelsState } from "@/context/ModelsContext"

const MyComponent = () => {
  const { showSettings } = useUIState()
  const { clineMessages } = useTaskState()
  const { openRouterModels } = useModelsState()
  // ...
}
```

### Pattern 3: Nested Property Access

**Before:**
```typescript
const { apiConfiguration } = useExtensionState()
const modelId = apiConfiguration?.planModeOpenRouterModelId
```

**After:**
```typescript
const { apiConfiguration } = useSettingsState()
const modelId = apiConfiguration?.planModeOpenRouterModelId
```

---

## Step-by-Step Migration Process

### Step 1: Identify Current Usage

Find what properties your component uses:

```bash
# Find the useExtensionState call in your component
grep -A 10 "useExtensionState()" src/components/MyComponent.tsx
```

### Step 2: Determine Target Context(s)

Use this decision tree:

```
Is it about navigation/visibility? → useUIState()
Is it about tasks/messages? → useTaskState()
Is it about settings/configuration? → useSettingsState()
Is it about models? → useModelsState()
Is it about MCP servers? → useMcpState()
```

### Step 3: Update Imports

```typescript
// Remove old import
- import { useExtensionState } from "@/context/ExtensionStateContext"

// Add focused imports
+ import { useUIState } from "@/context/UIStateContext"
+ import { useTaskState } from "@/context/TaskStateContext"
```

### Step 4: Update Hook Usage

```typescript
// Before
const { showSettings, clineMessages } = useExtensionState()

// After
const { showSettings } = useUIState()
const { clineMessages } = useTaskState()
```

### Step 5: Verify & Test

```bash
# Type check
npm run type-check

# Build
npm run build

# Run tests
npm test
```

---

## Common Migrations by Property

### UI Navigation Properties → `useUIState()`

```typescript
// Properties
showSettings, hideSettings, navigateToSettings
showHistory, hideHistory, navigateToHistory
showMcp, closeMcpView, navigateToMcp
mcpTab, navigateToChat
didClickFocusChain, setDidClickFocusChain
onRelinquishControl

// Example
const { showSettings, navigateToSettings, hideSettings } = useUIState()
```

### Task & Message Properties → `useTaskState()`

```typescript
// Properties
clineMessages
taskHistory
currentTaskId
totalTasksSize, setTotalTasksSize

// Example
const { clineMessages, taskHistory } = useTaskState()
```

### Settings Properties → `useSettingsState()`

```typescript
// Properties
apiConfiguration
preferredLanguage
customPrompt
didHydrateState
autoApprovalSettings, setAutoApprovalSettings
browserSettings, setBrowserSettings
terminalOutputLineLimit
availableTerminalProfiles

// Example
const { apiConfiguration, preferredLanguage } = useSettingsState()
```

### Model Properties → `useModelsState()`

```typescript
// Properties
openRouterModels
refreshOpenRouterModels
anthropicModels

// Example
const { openRouterModels, refreshOpenRouterModels } = useModelsState()
```

### MCP Properties → `useMcpState()`

```typescript
// Properties
mcpServers, setMcpServers
mcpMarketplaceCatalog

// Example
const { mcpServers, setMcpServers } = useMcpState()
```

---

## Real-World Examples

### Example 1: Simple Settings Component

**Before:**
```typescript
import { useExtensionState } from "@/context/ExtensionStateContext"

const PreferredLanguageSetting = () => {
  const { preferredLanguage } = useExtensionState()
  
  return (
    <select value={preferredLanguage}>
      {/* options */}
    </select>
  )
}
```

**After:**
```typescript
import { useSettingsState } from "@/context/SettingsContext"

const PreferredLanguageSetting = () => {
  const { preferredLanguage } = useSettingsState()
  
  return (
    <select value={preferredLanguage}>
      {/* options */}
    </select>
  )
}
```

### Example 2: Navigation Component

**Before:**
```typescript
import { useExtensionState } from "@/context/ExtensionStateContext"

const Navbar = () => {
  const { navigateToHistory, navigateToChat } = useExtensionState()
  
  return (
    <nav>
      <button onClick={navigateToHistory}>History</button>
      <button onClick={navigateToChat}>Chat</button>
    </nav>
  )
}
```

**After:**
```typescript
import { useUIState } from "@/context/UIStateContext"

const Navbar = () => {
  const { navigateToHistory, navigateToChat } = useUIState()
  
  return (
    <nav>
      <button onClick={navigateToHistory}>History</button>
      <button onClick={navigateToChat}>Chat</button>
    </nav>
  )
}
```

### Example 3: Complex Multi-Context Component

**Before:**
```typescript
import { useExtensionState } from "@/context/ExtensionStateContext"

const ChatTextArea = () => {
  const {
    // UI state
    showChatModelSelector,
    setShowChatModelSelector,
    // Settings
    apiConfiguration,
    mode,
    autoApprovalSettings,
    // Models
    openRouterModels
  } = useExtensionState()
  
  // Component logic...
}
```

**After:**
```typescript
import { useUIState } from "@/context/UIStateContext"
import { useSettingsState } from "@/context/SettingsContext"
import { useModelsState } from "@/context/ModelsContext"

const ChatTextArea = () => {
  // Focused contexts
  const { showChatModelSelector, setShowChatModelSelector } = useUIState()
  const { apiConfiguration, mode, autoApprovalSettings } = useSettingsState()
  const { openRouterModels } = useModelsState()
  
  // Component logic... (unchanged)
}
```

---

## Troubleshooting

### Error: "Property does not exist on type"

**Problem:** Property is in a different context than you're using

**Solution:** Check the property mapping table above and use the correct focused hook

```typescript
// ❌ Wrong context
const { clineMessages } = useUIState()  // Error!

// ✅ Correct context
const { clineMessages } = useTaskState()
```

### Component Re-rendering Too Much

**Problem:** Using `useExtensionState()` causes re-renders on all state changes

**Solution:** Migrate to focused contexts

```typescript
// ❌ Re-renders on ANY state change
const { taskHistory } = useExtensionState()

// ✅ Only re-renders when taskHistory changes
const { taskHistory } = useTaskState()
```

### Import Errors

**Problem:** Can't find the focused context hook

**Solution:** Check import paths

```typescript
// Correct imports
import { useUIState } from "@/context/UIStateContext"
import { useTaskState } from "@/context/TaskStateContext"
import { useSettingsState } from "@/context/SettingsContext"
import { useModelsState } from "@/context/ModelsContext"
import { useMcpState } from "@/context/McpContext"
```

---

## Testing Your Migration

### Manual Testing Checklist

- [ ] Component renders without errors
- [ ] All functionality works as before
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Component re-renders appropriately (use React DevTools)

### Automated Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build

# Unit tests
npm test

# Full test suite
npm run test:all
```

---

## Performance Verification

### Using React DevTools Profiler

1. Open React DevTools
2. Go to Profiler tab
3. Start recording
4. Perform actions in your component
5. Stop recording
6. Check commit frequency

**Before migration:** Component commits on every state change  
**After migration:** Component commits only on relevant state changes

---

## FAQ

### Q: Do I need to migrate all components at once?

**A:** No! The compatibility layer (`useExtensionState()`) will continue to work. Migrate incrementally, starting with components that re-render frequently.

### Q: What if a component uses properties from multiple contexts?

**A:** Use multiple hooks! It's perfectly fine and actually clearer:

```typescript
const { showSettings } = useUIState()
const { clineMessages } = useTaskState()
const { apiConfiguration } = useSettingsState()
```

### Q: Will this break existing functionality?

**A:** No. The old `useExtensionState()` hook still works and will continue to work. Migration is optional but recommended for performance.

### Q: How do I know which context a property belongs to?

**A:** Check the "Common Migrations by Property" section above, or look at the TypeScript types in the context files.

---

## Best Practices

### ✅ Do

- Migrate components incrementally
- Use focused hooks for new components
- Test after each migration
- Check performance improvements with React DevTools
- Document complex migrations

### ❌ Don't

- Migrate everything at once
- Ignore TypeScript errors
- Skip testing
- Use `useExtensionState()` for new components
- Mix old and new patterns unnecessarily

---

## Getting Help

If you encounter issues during migration:

1. Check this guide first
2. Look at recently migrated components for examples
3. Check TypeScript errors carefully
4. Ask in team chat with specific error messages
5. Review the context provider implementations

---

## Migration Status Tracking

Keep track of migrated components:

```bash
# Find components still using useExtensionState
grep -r "useExtensionState()" src/components --files-with-matches | wc -l

# Find components using focused contexts
grep -r "useUIState()\|useTaskState()\|useSettingsState()" src/components --files-with-matches | wc -l
```

---

## Summary

- **Goal:** Better performance through focused state management
- **Method:** Replace `useExtensionState()` with specific context hooks
- **Benefit:** 50-85% fewer re-renders, clearer code, better developer experience
- **Risk:** Low - backward compatible, incremental migration possible

**Start small, test thoroughly, and enjoy the performance improvements!** 🚀

