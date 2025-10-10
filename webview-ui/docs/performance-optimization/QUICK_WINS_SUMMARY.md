# WebView-UI Performance Quick Wins Summary

## 🚀 Top 5 Easy Wins (Sorted by ROI)

### 1️⃣ Lazy Load Mermaid (30 min)
- **Save:** ~500KB bundle size
- **Fix:** Dynamic import in `MermaidBlock.tsx`
- **Risk:** Very Low

### 2️⃣ Context Memoization (30 min)
- **Save:** Massive re-render reduction
- **Fix:** Wrap `contextValue` in `useMemo` in `ExtensionStateContext.tsx`
- **Risk:** Very Low

### 3️⃣ Remove Unused Deps (5 min)
- **Save:** ~500KB in dependencies
- **Fix:** `npm uninstall firebase framer-motion`
- **Risk:** None

### 4️⃣ Fix Console Logging (20 min)
- **Save:** Runtime performance + bundle size
- **Fix:** Create debug utility that only logs in dev mode
- **Risk:** Very Low

### 5️⃣ Fix useCallback Deps (15 min)
- **Save:** Prevent function recreations
- **Fix:** Remove setState functions from dependency arrays
- **Risk:** None

---

## ⚡ Quick Implementation Guide

### Step 1: Remove Unused Dependencies (5 min)
```bash
cd /Users/bozoegg/Desktop/MarieCoder/webview-ui
npm uninstall firebase framer-motion
```

### Step 2: Create Debug Utility (10 min)
Create `src/utils/debug_logger.ts`:
```typescript
const isDev = process.env.NODE_ENV === 'development'

export const debug = {
  log: (...args: any[]) => isDev && console.log(...args),
  error: (...args: any[]) => isDev && console.error(...args),
  warn: (...args: any[]) => isDev && console.warn(...args),
}
```

### Step 3: Fix useCallback in ExtensionStateContext (10 min)
```typescript
// Remove setState functions from dependency arrays
const closeMcpView = useCallback(() => {
  setShowMcp(false)
  setMcpTab(undefined)
}, []) // ✅ Empty array - setState is stable

const hideSettings = useCallback(() => setShowSettings(false), [])
const hideHistory = useCallback(() => setShowHistory(false), [])
const hideChatModelSelector = useCallback(() => setShowChatModelSelector(false), [])
```

### Step 4: Memoize Context Value (20 min)
In `ExtensionStateContext.tsx` line 571:
```typescript
const contextValue = useMemo<ExtensionStateContextType>(() => ({
  ...state,
  didHydrateState,
  openRouterModels,
  // ... all other properties
}), [
  state,
  didHydrateState,
  openRouterModels,
  // ... list all dependencies
])
```

### Step 5: Lazy Load Mermaid (30 min)
In `MermaidBlock.tsx`:
```typescript
let mermaidInstance: typeof import("mermaid") | null = null

const loadMermaid = async () => {
  if (!mermaidInstance) {
    const module = await import("mermaid")
    mermaidInstance = module.default
    mermaidInstance.initialize({
      startOnLoad: false,
      // ... existing config
    })
  }
  return mermaidInstance
}

// In useDebounceEffect:
useDebounceEffect(
  async () => {
    if (containerRef.current) {
      containerRef.current.innerHTML = ""
    }
    const mermaid = await loadMermaid()
    mermaid.parse(code, { suppressErrors: true })
    // ... rest of logic
  },
  500,
  [code],
)
```

---

## 📊 Expected Results

After implementing all 5 quick wins:

- **Bundle Size:** ↓ 500-600KB (15-20% reduction)
- **Initial Load:** ↓ 25-35% faster
- **Runtime Performance:** ↓ 15-20% less CPU usage
- **Re-renders:** ↓ 40-60% fewer unnecessary re-renders
- **Total Time:** ~1.5 hours

---

## 🧪 Testing Checklist

After each change:
- [ ] Run `npm run build` successfully
- [ ] Test Chat view works
- [ ] Test Settings view works
- [ ] Test History view works
- [ ] Test MCP view works
- [ ] Verify mermaid diagrams still render (if changed)
- [ ] Check browser console for errors
- [ ] Verify bundle size decreased (if applicable)

---

## 📈 Measuring Impact

### Before Optimizations:
```bash
cd /Users/bozoegg/Desktop/MarieCoder/webview-ui
npm run build:analyze
```
Take note of:
- Total bundle size
- Main chunk size
- Vendor chunk size

### After Optimizations:
```bash
npm run build:analyze
```
Compare the sizes!

### Runtime Performance:
1. Open React DevTools Profiler
2. Record interaction (e.g., switching between views)
3. Compare render times and count before/after

---

## 🎯 Priority Matrix

```
High Impact, Low Effort:
┌──────────────────────────┐
│ 1. Lazy Load Mermaid     │ ⭐⭐⭐⭐⭐
│ 2. Context Memoization   │ ⭐⭐⭐⭐⭐
│ 3. Remove Unused Deps    │ ⭐⭐⭐⭐
│ 4. Console Logging       │ ⭐⭐⭐⭐
│ 5. useCallback Fixes     │ ⭐⭐⭐
└──────────────────────────┘

Medium Impact, Low Effort:
┌──────────────────────────┐
│ 6. Virtuoso Tuning       │ ⭐⭐⭐
│ 7. Styled-Components     │ ⭐⭐
└──────────────────────────┘
```

---

## 🚨 Important Notes

1. **Test thoroughly** - These changes affect core functionality
2. **One at a time** - Implement and test each change independently
3. **Commit often** - Make separate commits for each optimization
4. **Measure impact** - Use build analyzer and profiler to verify improvements
5. **Follow standards** - All changes follow NOORMME development standards

---

## 📝 Commit Message Templates

```
perf(webview): lazy load mermaid library

Reduces initial bundle by ~500KB by dynamically importing
mermaid only when markdown contains diagrams.

- Moved mermaid import to async loader
- Initialize on first use
- No functional changes to diagram rendering
```

```
perf(webview): memoize extension state context value

Prevents unnecessary re-renders across entire app by
memoizing the context value object.

- Wrapped contextValue in useMemo
- Added all dependencies to memo array
- Reduces re-render cascades by ~50%
```

```
chore(webview): remove unused dependencies

Removes firebase and framer-motion dependencies that
are not used anywhere in the codebase.

- Reduces node_modules size by ~500KB
- Faster npm install times
- Cleaner dependency tree
```

---

**See [PERFORMANCE_OPTIMIZATION_OPPORTUNITIES.md](./PERFORMANCE_OPTIMIZATION_OPPORTUNITIES.md) for detailed analysis and additional optimizations.**

