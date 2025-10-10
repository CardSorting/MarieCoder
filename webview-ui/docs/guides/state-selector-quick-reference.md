# State Selector Hooks - Quick Reference Card

## 📌 When to Use Selector Hooks

| Scenario | Use Selector? | Why |
|----------|---------------|-----|
| Component uses 1-2 properties from context | ✅ Yes | Reduce re-renders significantly |
| Component uses most of context | ❌ No | No benefit, use original hook |
| Context updates frequently | ✅ Yes | Prevent cascade of re-renders |
| Context rarely updates | ⚠️ Maybe | Profile first, may not need |
| High-frequency component (e.g., chat messages) | ✅ Yes | Critical for performance |
| Low-frequency component (e.g., settings modal) | ⚠️ Maybe | Less critical, but still beneficial |

---

## 🎯 Available Selectors

```typescript
// UI State (views, navigation)
useUIStateSelector(state => state.showSettings)

// Task State (messages, tasks)
useTaskStateSelector(state => state.clineMessages)

// Settings (preferences, config)
useSettingsStateSelector(state => state.autoApprovalSettings)

// Models (AI model lists)
useModelsStateSelector(state => state.openRouterModels)

// MCP (servers, catalog)
useMcpStateSelector(state => state.mcpServers)
```

---

## 📋 Common Patterns

### Pattern 1: Single Property
```typescript
// ❌ Before (re-renders on every UI state change)
const { showSettings } = useUIState()

// ✅ After (re-renders only when showSettings changes)
const showSettings = useUIStateSelector(state => state.showSettings)
```

### Pattern 2: Multiple Properties
```typescript
// ✅ Batch related properties
const { showSettings, showHistory } = useUIStateSelector(
  state => ({
    showSettings: state.showSettings,
    showHistory: state.showHistory,
  })
)
```

### Pattern 3: Computed Value
```typescript
// ✅ Inline computation
const messageCount = useTaskStateSelector(
  state => state.clineMessages.length
)
```

### Pattern 4: Filtered Data
```typescript
// ✅ Simple filtering
const userMessages = useTaskStateSelector(
  state => state.clineMessages.filter(msg => msg.type === 'say')
)
```

### Pattern 5: Data + Actions
```typescript
// ✅ Selector for data, hook for actions
const messages = useTaskStateSelector(state => state.clineMessages)
const { setClineMessages } = useTaskState() // Actions don't cause re-renders
```

---

## ⚡ Performance Tips

### ✅ DO

```typescript
// Simple property access
const showSettings = useUIStateSelector(state => state.showSettings)

// Batch related properties
const { a, b, c } = useUIStateSelector(state => ({ a: state.a, b: state.b, c: state.c }))

// Use original hook for actions only
const { updateSettings } = useSettingsState()
```

### ❌ DON'T

```typescript
// Don't select entire state (defeats the purpose)
const state = useUIStateSelector(state => state)

// Don't do expensive computation in selector
const data = useTaskStateSelector(
  state => state.messages.map(expensiveTransform) // Too slow!
)

// Instead, use useMemoizedSelector for expensive operations
const data = useMemoizedSelector(
  useTaskState,
  state => state.messages.map(expensiveTransform),
  [state.messages]
)
```

---

## 🔍 Debug & Measure

### Development Mode Logging

Selectors automatically log in development:

```typescript
const showSettings = useUIStateSelector(state => state.showSettings)

// Console output when state changes:
// [Selector] State update detected: {
//   old: false,
//   new: true,
//   renderCount: 3
// }
```

### Performance Tracking

```typescript
function MyComponent() {
  usePerformanceTracking("MyComponent") // Auto-log render performance
  
  const messages = useTaskStateSelector(state => state.clineMessages)
  
  return <div>{messages.length} messages</div>
}

// Console output on each render:
// [Performance] MyComponent: {
//   renderCount: 5,
//   timeSinceLastRender: "234ms"
// }
```

### React DevTools Profiler

1. Open React DevTools
2. Go to Profiler tab
3. Record a session
4. Look for reduced render counts in components using selectors

---

## 🚨 Common Mistakes

### Mistake 1: Selecting Too Much
```typescript
// ❌ Bad - selects entire context
const context = useUIStateSelector(state => state)

// ✅ Good - selects only what's needed
const showSettings = useUIStateSelector(state => state.showSettings)
```

### Mistake 2: Complex Computation
```typescript
// ❌ Bad - expensive computation in selector
const processed = useTaskStateSelector(
  state => state.messages.map(msg => expensiveFunction(msg))
)

// ✅ Good - use useMemoizedSelector
const processed = useMemoizedSelector(
  useTaskState,
  state => state.messages.map(msg => expensiveFunction(msg)),
  [state.messages]
)
```

### Mistake 3: Multiple Separate Selectors
```typescript
// ❌ Less efficient
const a = useUIStateSelector(state => state.a)
const b = useUIStateSelector(state => state.b)
const c = useUIStateSelector(state => state.c)

// ✅ Better - batch related state
const { a, b, c } = useUIStateSelector(
  state => ({ a: state.a, b: state.b, c: state.c })
)
```

---

## 📊 Expected Results

After migrating to selector hooks:

| Component Type | Re-render Reduction | Notes |
|---------------|---------------------|-------|
| Chat messages | 40-50% | High-frequency updates |
| Settings panels | 60-70% | Isolated state access |
| Model selectors | 50-60% | Provider-specific updates |
| Navigation | 50-60% | View-specific state |

---

## 🎓 Learning Path

1. **Start Simple**: Convert one component with obvious re-render issues
2. **Measure**: Use React DevTools Profiler to verify improvement
3. **Iterate**: Gradually migrate more components
4. **Review**: Check console logs for performance insights

---

## 🔗 Full Documentation

- `PHASE_2_2_STATE_OPTIMIZATION_COMPLETE.md` - Comprehensive guide
- `PHASE_2_2_STATE_OPTIMIZATION_SUMMARY.md` - Quick overview
- `src/hooks/use_context_selector.ts` - Implementation details

---

## 💬 Questions?

**Q: Should I migrate all components?**  
A: No, only components that benefit from it. Profile first!

**Q: Will this break existing code?**  
A: No, 100% backward compatible. Original hooks still work.

**Q: How do I know if it's working?**  
A: Check console logs in dev mode or use React DevTools Profiler.

**Q: Can I mix selector and regular hooks?**  
A: Yes! Use selectors for data, regular hooks for actions.

---

**Last Updated**: October 10, 2025  
**For**: NormieDev Contributors

