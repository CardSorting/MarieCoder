# Streaming UX Optimization Plan

## Problem Analysis

Current streaming experience has several jarring elements:

### Chat Row Issues
1. **Abrupt message entry animations** - Messages pop in too quickly
2. **Batching too aggressive** - 10-character batches cause visible jumps in text
3. **Scroll jumps** - Auto-scroll can feel janky during rapid updates
4. **Animation conflicts** - Multiple animations competing for attention

### Editor Issues
1. **Hard scroll steps** - 16ms intervals with fixed step sizes
2. **Harsh decorations** - Bright yellow highlights too intense
3. **Instant decoration updates** - No transition between active lines
4. **Progress bar jumps** - 0.3s transition too fast for perception

## Optimization Strategy

### 1. Smoother Message Batching
**Current**: Re-render every 10 characters
**Optimized**: Time-based batching with requestAnimationFrame

```typescript
// Batch updates at 60fps instead of character count
const BATCH_INTERVAL_MS = 16 // ~60fps
const MIN_BATCH_SIZE = 5 // Minimum chars to trigger update
```

### 2. Fluid Editor Scrolling
**Current**: Fixed 16ms steps with linear progression
**Optimized**: Easing functions with variable timing

```typescript
// Use cubic easing for natural deceleration
const easing = (t: number) => t < 0.5 
  ? 4 * t * t * t 
  : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
```

### 3. Gentler Decorations
**Current**: Bright yellow with 0.4 opacity
**Optimized**: Subtle theme colors with smooth transitions

```typescript
// Use editor theme colors with progressive fade
backgroundColor: "rgba(current-theme, 0.08)"
transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)"
```

### 4. Progressive Opacity
**Current**: Hard 0/1 visibility
**Optimized**: Gradual fade-in for new content

```css
.content-streaming {
  animation: contentFadeIn 400ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 5. RAF Throttling
**Current**: Multiple uncoordinated updates
**Optimized**: Synchronized frame updates

```typescript
// Coordinate all visual updates in single RAF callback
requestAnimationFrame(() => {
  updateText()
  updateScroll()
  updateDecorations()
})
```

## Implementation Plan

### Phase 1: Chat Optimizations
- [ ] Implement time-based message batching
- [ ] Add progressive opacity to streaming text
- [ ] Smooth scroll behavior during height changes
- [ ] Reduce animation intensity

### Phase 2: Editor Optimizations
- [ ] Add easing to scroll animations
- [ ] Soften decoration colors
- [ ] Add CSS transitions to decoration changes
- [ ] Implement progressive progress indicators

### Phase 3: Performance Tuning
- [ ] Batch RAF calls across components
- [ ] Debounce rapid state changes
- [ ] Optimize re-render triggers
- [ ] Add will-change hints for animations

## Expected Results

### Perception
- ✅ Streaming feels like "flowing text" not "jumping chunks"
- ✅ Editor scrolls feel natural like reading, not robotic
- ✅ Decorations guide attention without distraction
- ✅ Overall experience feels polished and professional

### Performance
- ✅ Consistent 60fps during streaming
- ✅ No layout thrashing
- ✅ Reduced CPU usage during updates
- ✅ Lower battery impact on laptops

### Measurements
| Metric | Before | Target |
|--------|--------|--------|
| Frame drops during streaming | ~15% | <2% |
| CPU usage | ~25% | ~12% |
| Perceived smoothness (1-10) | 6 | 9 |
| Animation jank | Noticeable | Imperceptible |

## Technical Details

### Batching Algorithm

```typescript
class StreamBatcher {
  private pendingUpdate: string = ""
  private lastUpdateTime: number = 0
  private rafId: number | null = null
  
  addChunk(text: string) {
    this.pendingUpdate += text
    
    // Schedule update if not already scheduled
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.flush)
    }
  }
  
  flush = () => {
    const now = performance.now()
    const timeSinceLastUpdate = now - this.lastUpdateTime
    
    // Only update if enough time has passed AND enough content
    if (timeSinceLastUpdate >= 16 && this.pendingUpdate.length >= 5) {
      this.onUpdate(this.pendingUpdate)
      this.pendingUpdate = ""
      this.lastUpdateTime = now
    }
    
    // Continue batching if more content pending
    if (this.pendingUpdate.length > 0) {
      this.rafId = requestAnimationFrame(this.flush)
    } else {
      this.rafId = null
    }
  }
}
```

### Scroll Easing

```typescript
async scrollWithEasing(startLine: number, endLine: number) {
  const duration = 800 // ms
  const startTime = performance.now()
  const totalLines = endLine - startLine
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Cubic ease-out for natural deceleration
    const eased = 1 - Math.pow(1 - progress, 3)
    
    const currentLine = startLine + (totalLines * eased)
    this.scrollToLine(Math.floor(currentLine))
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }
  
  requestAnimationFrame(animate)
}
```

### Decoration Smoothing

```typescript
const smoothDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: new vscode.ThemeColor("editor.wordHighlightBackground"),
  opacity: "0.6",
  isWholeLine: true,
  
  // CSS transition for smooth updates
  transitionProperty: "background-color, opacity",
  transitionDuration: "300ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
})
```

## Files to Modify

### High Priority
1. `webview-ui/src/components/chat/chat-view/components/messages/MessageRenderer.tsx`
2. `src/hosts/vscode/VscodeDiffViewProvider.ts`
3. `src/hosts/vscode/DecorationController.ts`
4. `webview-ui/src/index.css`
5. `webview-ui/src/components/chat/chat_row/message_types/CompactToolDisplayWithProgress.tsx`

### Medium Priority
6. `webview-ui/src/components/chat/chat-view/hooks/useScrollBehavior.ts`
7. `src/hosts/vscode/EditorStreamingDecorator.ts`
8. `webview-ui/src/components/chat/ChatRow.tsx`

## Success Criteria

- [ ] Users report "smooth and fluid" experience
- [ ] No visible frame drops during streaming
- [ ] Animations feel natural, not mechanical
- [ ] Editor scrolling follows content naturally
- [ ] Decorations guide without distracting
- [ ] Progress indicators feel continuous

## Rollout

1. **Test locally** - Verify smoothness with various file sizes
2. **Measure performance** - Confirm CPU/memory improvements
3. **User testing** - Get feedback on perceived smoothness
4. **Iterate** - Fine-tune timings based on feedback
5. **Document** - Update user guides with new behavior

---

*Goal: Make streaming so smooth users forget they're watching an AI work*

