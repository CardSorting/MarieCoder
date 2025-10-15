# CLI UI Quick Reference

**Quick lookup guide for MarieCoder CLI enhanced UI components**

---

## 🎨 Colors

### 256-Color Palette
```typescript
import { Colors256 } from './cli_terminal_colors'

Colors256.fg(color)           // Foreground (0-255)
Colors256.bg(color)           // Background (0-255)
Colors256.rgb(r, g, b)        // RGB foreground
Colors256.bgRgb(r, g, b)      // RGB background
```

### Presets
```typescript
Colors256.presets.skyBlue     // 117
Colors256.presets.violet      // 93
Colors256.presets.forestGreen // 28
Colors256.presets.crimson     // 196
Colors256.presets.gold        // 220
```

### Effects
```typescript
gradient(text, startColor, endColor)  // Color gradient
pulse(text, style1, style2)           // Pulsing effect
```

---

## 📦 Notifications

```typescript
import { formatNotification } from './cli_advanced_ui'

formatNotification(title, message, options)
```

**Types**: `info`, `success`, `warning`, `error`, `tip`

**Example**:
```typescript
formatNotification("Success", "Task completed!", { 
  type: "success", 
  timestamp: true 
})
```

---

## 📝 Callouts

```typescript
import { formatCallout } from './cli_advanced_ui'

formatCallout(content, options)
```

**Variants**: `note`, `important`, `tip`, `warning`, `caution`

**Example**:
```typescript
formatCallout("Remember to backup!", { variant: "important" })
```

---

## 📊 Progress Bars

### Basic Progress
```typescript
import { EnhancedProgress } from './cli_enhanced_progress'

const progress = new EnhancedProgress(current, total, "Label")
progress.update(50)
progress.render({ 
  style: "gradient",    // gradient, blocks, dots, minimal
  showEta: true,
  showSpeed: true 
})
```

### Multi-Step
```typescript
import { MultiStepProgress } from './cli_enhanced_progress'

const steps = new MultiStepProgress()
steps.addStep("id", "Label", total)
steps.startStep("id")
steps.updateStep("id", current)
steps.completeStep("id")
```

---

## 🔄 Spinners

```typescript
import { AnimatedSpinner, SpinnerFrames } from './cli_enhanced_progress'

const spinner = new AnimatedSpinner(
  "Loading...",
  SpinnerFrames.dots  // dots, line, arrow, earth, moon, clock
)
spinner.render()
spinner.nextFrame()
```

**Frames**: `dots`, `line`, `arrow`, `arc`, `box`, `bounce`, `earth`, `moon`, `clock`, `growing`, `pulse`

---

## 📋 Dashboard

```typescript
import { formatDashboard } from './cli_advanced_ui'

formatDashboard("Title", [
  { label: "Metric", value: "123", status: "good", icon: "📊" }
])
```

**Status**: `good`, `warning`, `error`, `neutral`

---

## 📅 Timeline

```typescript
import { formatTimeline } from './cli_advanced_ui'

formatTimeline([
  { 
    time: "10:00", 
    title: "Event", 
    status: "completed",  // completed, in_progress, pending, failed
    description: "Details..." 
  }
])
```

---

## 🗂️ Menus

```typescript
import { formatMenu } from './cli_advanced_ui'

formatMenu("Select Option", [
  { 
    label: "Continue", 
    description: "Keep going",
    shortcut: "C" 
  }
], selectedIndex)
```

---

## 🏷️ Badges

```typescript
import { formatInlineBadge } from './cli_advanced_ui'

formatInlineBadge("NEW", "primary")
```

**Variants**: `primary`, `success`, `warning`, `error`, `info`, `neutral`

---

## 📐 Layouts

### Enhanced Panel
```typescript
import { formatEnhancedPanel } from './cli_layout_helpers'

formatEnhancedPanel("Title", "Content", {
  icon: "⚙",
  gradient: true,
  rounded: true,
  footer: "Footer text"
})
```

### Comparison
```typescript
import { formatComparison } from './cli_layout_helpers'

formatComparison(
  "Before", "Old content",
  "After", "New content"
)
```

### Tabs
```typescript
import { formatTabs } from './cli_layout_helpers'

formatTabs([
  { label: "Tab 1", active: true },
  { label: "Tab 2", active: false }
], "Tab content")
```

### Accordion
```typescript
import { formatAccordion } from './cli_layout_helpers'

formatAccordion([
  { 
    title: "Section", 
    content: "Content",
    expanded: true,
    icon: "▼"
  }
])
```

---

## 🎯 Common Patterns

### Success Message
```typescript
output.log(formatNotification(
  "Success", 
  message, 
  { type: "success" }
))
```

### Error with Callout
```typescript
output.log(formatNotification(
  "Error", 
  "Something went wrong", 
  { type: "error" }
))
output.log(formatCallout(
  "Try checking your configuration", 
  { variant: "tip" }
))
```

### Progress with Spinner
```typescript
const spinner = new AnimatedSpinner("Processing...")
const progress = new EnhancedProgress(0, 100, "Progress")

// Update in loop
spinner.nextFrame()
progress.update(currentValue)
output.log(spinner.render())
output.log(progress.render())
```

### Status Overview
```typescript
output.log(formatDashboard("System Status", [
  { label: "API", value: "Online", status: "good" },
  { label: "Tasks", value: 5, status: "warning" },
  { label: "Errors", value: 0, status: "good" }
]))
```

---

## 🎨 Semantic Colors

```typescript
import { SemanticColors } from './cli_terminal_colors'

SemanticColors.success     // Green
SemanticColors.error       // Red
SemanticColors.warning     // Yellow
SemanticColors.info        // Cyan
SemanticColors.progress    // Bright Yellow
SemanticColors.complete    // Bright Green
SemanticColors.pending     // Gray
SemanticColors.highlight   // Bright Yellow
SemanticColors.metadata    // Dim
```

---

## 📦 Box Characters

### Standard
```typescript
import { BoxChars } from './cli_terminal_colors'

BoxChars.topLeft       // ┌
BoxChars.topRight      // ┐
BoxChars.bottomLeft    // └
BoxChars.bottomRight   // ┘
BoxChars.horizontal    // ─
BoxChars.vertical      // │
```

### Rounded
```typescript
import { RoundedBoxChars } from './cli_terminal_colors'

RoundedBoxChars.topLeft      // ╭
RoundedBoxChars.topRight     // ╮
RoundedBoxChars.bottomLeft   // ╰
RoundedBoxChars.bottomRight  // ╯
```

### Effects
```typescript
import { EffectChars } from './cli_terminal_colors'

EffectChars.progressFull     // █
EffectChars.progressEmpty    // ░
EffectChars.circleFilled     // ●
EffectChars.triangleRight    // ▶
EffectChars.starFilled       // ★
```

---

## 🔧 Utilities

```typescript
import { 
  stripAnsi,      // Remove ANSI codes
  truncate,       // Truncate text
  centerText,     // Center within width
  rightAlign,     // Right align text
  leftPad,        // Left pad text
  colorize,       // Apply color if supported
  style           // Apply multiple styles
} from './cli_terminal_colors'

// Strip ANSI for length calculation
const length = stripAnsi(coloredText).length

// Truncate with ellipsis
truncate(text, 50, "end")  // end, middle, start

// Alignment
centerText(text, 80)
rightAlign(text, 80)
leftPad(text, 20)

// Conditional coloring
colorize("Text", TerminalColors.green)  // Only if terminal supports it

// Multiple styles
style("Bold Cyan", TerminalColors.bright, TerminalColors.cyan)
```

---

## 🚀 Best Practices

1. **Use semantic colors** for consistency
2. **Show progress** for long operations
3. **Use notifications** for important messages
4. **Add ETA** to progress bars when possible
5. **Group related info** in panels/dashboards
6. **Color-code status** (green=good, yellow=warning, red=error)
7. **Provide context** with callouts and tooltips
8. **Use gradients** for headers to draw attention
9. **Keep it responsive** with proper wrapping
10. **Gracefully degrade** for basic terminals

---

*For complete documentation, see `CLI_UI_ENHANCEMENTS.md`*

