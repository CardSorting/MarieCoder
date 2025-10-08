# Hooks Directory

Global, reusable hooks that can be used across different features and domains.

## Organization Principle

**Hooks in this directory should be:**
- **Reusable** across multiple features/domains
- **General-purpose** (not specific to one feature)
- **Well-documented** with JSDoc comments

## When to Place Hooks Here

✅ **Place hooks here if they:**
- Can be used in multiple unrelated components
- Provide general utility (debouncing, keyboard shortcuts, etc.)
- Don't depend on specific domain knowledge

❌ **Don't place hooks here if they:**
- Are specific to one feature area (use `components/[domain]/hooks/` instead)
- Depend heavily on domain-specific logic
- Are only used in one place

## Available Hooks

### `useAutoApproveActions`
Manages auto-approve actions state and operations.

### `useDebounceEffect`
Debounces effect execution with configurable delay.

### `useKeyboard`
- `useMetaKeyDetection`: Detects platform-specific meta keys (Cmd/Ctrl)
- `useShortcut`: Registers keyboard shortcuts with modifier keys

## Example Usage

```typescript
import { useDebounceEffect, useShortcut } from "@/hooks"

function MyComponent() {
  // Debounce expensive operations
  useDebounceEffect(() => {
    performExpensiveOperation()
  }, 500, [dependency])

  // Register keyboard shortcuts
  useShortcut("Meta+K", handleSearch)
}
```

## Domain-Specific Hooks

For feature-specific hooks, organize them alongside their components:

```
components/
├── chat/
│   └── hooks/
│       └── useChatState.ts
├── settings/
│   └── hooks/
│       └── useSettingsForm.ts
```

This keeps related code together and makes dependencies clear.
