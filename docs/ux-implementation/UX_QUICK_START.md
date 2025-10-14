# UX Enhancements Quick Start Guide

A quick reference for using the world-class UX enhancements in MarieCoder.

## 🚀 Quick Wins

### 1. Add Haptic Feedback to Buttons (2 min)

```tsx
import { useHapticFeedback } from '@/utils/haptic_feedback'

function MyButton() {
  const { triggerFeedback, triggerRipple } = useHapticFeedback()
  
  return (
    <button onClick={(e) => {
      triggerRipple(e.currentTarget, e.nativeEvent)
      triggerFeedback(e.currentTarget, 'success', 'medium')
      // ... your logic
    }}>
      Click me
    </button>
  )
}
```

### 2. Add Keyboard Shortcuts (3 min)

```tsx
import { useKeyboardShortcuts } from '@/utils/use_keyboard_shortcuts'

function MyComponent() {
  useKeyboardShortcuts([
    {
      key: 's',
      ctrl: true,
      description: 'Save',
      action: () => handleSave(),
    }
  ])
}
```

### 3. Lazy Load Heavy Content (5 min)

```tsx
import { LazyContent } from '@/components/common/LazyContent'

function HeavyComponent() {
  return (
    <LazyContent
      minHeight="200px"
      placeholder={<LoadingSkeleton type="code" lines={5} />}
    >
      {/* Heavy content here */}
    </LazyContent>
  )
}
```

### 4. Add Loading States (2 min)

```tsx
import { LoadingSkeleton, ProgressBar } from '@/components/chat/LoadingSkeleton'

// Skeleton screen
<LoadingSkeleton type="message" lines={4} progressive />

// Progress indicator
<ProgressBar progress={75} variant="success" />
```

## 🎨 CSS Classes

### Animations

```tsx
// Message entry
<div className="message-enter">Content</div>

// Streaming content
<div className="message-streaming">Content</div>

// Progressive reveal
<div className="content-reveal">Content</div>

// Staggered list items
<div className="stagger-item">Item 1</div>
<div className="stagger-item">Item 2</div>
```

### Performance

```tsx
// Optimize rendering
<div className="optimize-rendering">
  {longContent}
</div>

// Smooth scrolling
<div className="scrollable">
  {scrollableContent}
</div>
```

### Interactive Elements

```tsx
// Haptic feedback on click
<button className="haptic-feedback">Click</button>

// Enhanced motion (when preferred)
<div className="enhanced-motion">Hover me</div>

// Interactive element states
<div className="interactive-element">Interactive</div>
```

## ⌨️ Built-in Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Send message |
| `Escape` | Clear input |
| `/` | Focus input |
| `Ctrl/Cmd + End` | Scroll to bottom |
| `Ctrl/Cmd + Home` | Scroll to top |
| `Ctrl/Cmd + X` | Cancel task |
| `Ctrl/Cmd + N` | New task |

## 📊 Performance Monitoring

```tsx
import { PerformanceMonitor } from '@/utils/performance_optimizations'

const monitor = PerformanceMonitor.getInstance()

// Track interaction
const start = performance.now()
doExpensiveOperation()
const duration = performance.now() - start
monitor.trackInteraction('operationName', duration)

// Get stats
const stats = monitor.getStats('operationName')
console.log(stats.avg, stats.p95, stats.p99)
```

## 🎯 Performance Targets

- **User interactions**: <100ms
- **Animations**: 60fps (16.67ms/frame)
- **Initial render**: <500ms
- **Scroll performance**: 58-60fps

## 🔧 Common Patterns

### Optimistic Updates

```tsx
// Clear UI immediately, then send request
setInputValue('')
setSendingDisabled(true)
await sendMessage() // async
```

### Progressive Loading

```tsx
// Show skeleton → Show partial → Show complete
{loading && <LoadingSkeleton type="thinking" />}
{partial && <PartialContent data={partial} />}
{complete && <CompleteContent data={complete} />}
```

### Batch Updates

```tsx
import { useRAFScheduler } from '@/utils/performance_optimizations'

const scheduler = useRAFScheduler()

// Batch multiple updates into single frame
scheduler.schedule(() => {
  updateUI()
})
```

## 🎪 Animation Timing

| Animation Type | Duration | Easing |
|----------------|----------|--------|
| Micro-interactions | 80-150ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| UI transitions | 200-300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Page transitions | 300-500ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Loading indicators | 1000-2000ms | `ease-in-out` |

## 🚫 Anti-Patterns

❌ **Don't:**
```tsx
// Blocking main thread
while(condition) { /* heavy work */ }

// Animating layout properties
.element { transition: width 0.3s; }

// Too many animations
.element {
  transition: all 0.3s; /* expensive! */
}

// Ignoring reduced motion
@keyframes { /* forced animation */ }
```

✅ **Do:**
```tsx
// Use RAF for heavy work
requestAnimationFrame(() => { /* work */ })

// Animate transforms
.element { transition: transform 0.3s; }

// Specific properties only
.element {
  transition: opacity 0.3s, transform 0.3s;
}

// Respect preferences
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

## 📱 Responsive Design

```tsx
// Mobile-first approach
<div className="touch-friendly interactive-element">
  {/* Large tap targets (min 44x44px) */}
</div>

// Optimize for touch
const handleTouch = (e: TouchEvent) => {
  // Immediate visual feedback
  triggerRipple(element, e.touches[0])
}
```

## 🔍 Debugging Performance

```tsx
// Chrome DevTools
// Performance tab → Record → Analyze

// React DevTools Profiler
// Identify slow components

// Custom logging
if (process.env.NODE_ENV === 'development') {
  const start = performance.now()
  // ... operation
  console.log(`Took ${performance.now() - start}ms`)
}
```

## 📚 Related Documentation

- [Full Documentation](./WORLDCLASS_UX_ENHANCEMENTS.md)
- [MarieCoder Development Standards](../README.md)
- [Web Performance Best Practices](https://web.dev/vitals/)

---

**Pro Tip**: Start with keyboard shortcuts and haptic feedback for immediate impact, then gradually add lazy loading and performance monitoring.

*Last Updated: October 2025*

