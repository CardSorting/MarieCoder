# CLI UI/UX Enhancements

## Overview

This document details the comprehensive improvements made to the MarieCoder CLI to enhance its visual design, intuitiveness, and perceived quality. The enhancements focus on modern terminal UI patterns, better user feedback, and improved information architecture.

---

## 🎨 Core Improvements

### 1. **Enhanced Color System**

#### 256-Color Palette Support

We've extended the CLI color system beyond basic ANSI colors to support the full 256-color palette and true color (RGB) support:

```typescript
import { Colors256 } from './cli_terminal_colors'

// Use 256-color palette
const text = `${Colors256.fg(117)}Sky Blue Text${TerminalColors.reset}`

// Use RGB colors (true color)
const rgbText = `${Colors256.rgb(100, 200, 255)}Custom Color${TerminalColors.reset}`

// Use presets
const accent = `${Colors256.fg(Colors256.presets.violet)}Violet Text${TerminalColors.reset}`
```

**Available Presets:**
- **Blues**: oceanBlue, skyBlue, deepBlue, teal
- **Greens**: forestGreen, limeGreen, seaGreen, mint
- **Purples**: violet, lavender, purple, magenta
- **Oranges**: orange, coral, peach
- **Reds**: crimson, rose, pink
- **Grays**: darkGray, mediumGray, lightGray, silver
- **Accents**: gold, amber, bronze

#### Gradient Text Effects

Create smooth color transitions across text:

```typescript
import { gradient, Colors256 } from './cli_terminal_colors'

const title = gradient("MARIECODER", Colors256.presets.skyBlue, Colors256.presets.violet)
```

#### Pulsing Effects

Add visual attention to important elements:

```typescript
import { pulse, TerminalColors } from './cli_terminal_colors'

const alertText = pulse("Important!", TerminalColors.red, TerminalColors.brightRed)
```

---

### 2. **Rounded Box Characters**

Softer, more modern UI elements using Unicode rounded corners:

```typescript
import { RoundedBoxChars } from './cli_terminal_colors'

// Before: ┌────┐
// After:  ╭────╮
```

**Available Characters:**
- `topLeft` (╭), `topRight` (╮), `bottomLeft` (╰), `bottomRight` (╯)
- `horizontal` (─), `vertical` (│)
- `heavyHorizontal` (━), `heavyVertical` (┃)

---

### 3. **Advanced UI Components**

#### Notifications

Rich notification system with type-based styling:

```typescript
import { formatNotification } from './cli_advanced_ui'

// Success notification
output.log(formatNotification(
  "Task Completed",
  "All files have been processed successfully.",
  { type: "success", timestamp: true }
))

// Error notification
output.log(formatNotification(
  "Error Occurred",
  "Failed to connect to API. Please check your connection.",
  { type: "error", dismissible: true }
))

// Tip notification
output.log(formatNotification(
  "Pro Tip",
  "Use --auto-approve to skip manual approvals.",
  { type: "tip", icon: "💡" }
))
```

**Notification Types:**
- `info` (blue with ℹ icon)
- `success` (green with ✓ icon)
- `warning` (yellow with ⚠ icon)
- `error` (red with ✗ icon)
- `tip` (purple with 💡 icon)

#### Callouts

Highlight important information in content:

```typescript
import { formatCallout } from './cli_advanced_ui'

output.log(formatCallout(
  "Make sure to backup your data before proceeding.",
  { variant: "important", title: "IMPORTANT" }
))
```

**Callout Variants:**
- `note` (blue, informational)
- `important` (red, critical information)
- `tip` (purple, helpful hints)
- `warning` (yellow, caution)
- `caution` (red, danger)

#### Tooltips

Contextual help for UI elements:

```typescript
import { formatTooltip } from './cli_advanced_ui'

const tooltip = formatTooltip(
  "This command will execute in the current directory",
  "run-command"
)
```

#### Status Dashboard

Display multiple metrics in an organized view:

```typescript
import { formatDashboard } from './cli_advanced_ui'

output.log(formatDashboard("System Status", [
  { label: "API Calls", value: "156/200", status: "good", icon: "📊" },
  { label: "Active Tasks", value: 3, status: "warning", icon: "⚙" },
  { label: "Errors", value: 0, status: "good", icon: "✓" },
  { label: "Memory Usage", value: "45%", status: "neutral", icon: "💾" }
]))
```

#### Timeline Visualization

Show chronological events:

```typescript
import { formatTimeline } from './cli_advanced_ui'

output.log(formatTimeline([
  { time: "10:00", title: "Task Started", status: "completed" },
  { time: "10:15", title: "Processing Files", status: "completed", description: "Analyzed 50 files" },
  { time: "10:30", title: "Generating Report", status: "in_progress" },
  { time: "10:45", title: "Upload Results", status: "pending" }
]))
```

#### Interactive Menus

Enhanced menu selection with visual feedback:

```typescript
import { formatMenu } from './cli_advanced_ui'

const menu = formatMenu("Select Action", [
  { label: "Continue", description: "Proceed with current task", shortcut: "C" },
  { label: "Pause", description: "Temporarily pause execution", shortcut: "P" },
  { label: "Abort", description: "Cancel and exit", shortcut: "A", disabled: false }
], 0) // selectedIndex
```

---

### 4. **Enhanced Progress Indicators**

#### Progress Bars with ETA

Advanced progress tracking with time estimates:

```typescript
import { EnhancedProgress } from './cli_enhanced_progress'

const progress = new EnhancedProgress(0, 100, "Downloading")

// Update progress
progress.update(45)

// Render with all features
output.log(progress.render({
  width: 40,
  style: "gradient",
  showPercentage: true,
  showEta: true,
  showSpeed: true
}))
```

**Progress Bar Styles:**
- `standard` - Classic solid bar
- `gradient` - Color-changing gradient
- `blocks` - Block-based visualization
- `dots` - Dot-based circular indicators
- `minimal` - Minimal line style

**Features:**
- Real-time ETA calculation
- Speed indicators (items/sec)
- Smoothed speed using history
- Auto-coloring based on completion percentage

#### Animated Spinners

Multiple animation styles for loading states:

```typescript
import { AnimatedSpinner, SpinnerFrames } from './cli_enhanced_progress'

const spinner = new AnimatedSpinner(
  "Processing...",
  SpinnerFrames.dots,
  SemanticColors.progress
)

// Manually render
output.log(spinner.render())
spinner.nextFrame()

// Or auto-animate
spinner.startAnimation((text) => {
  process.stdout.write(`\r${text}`)
}, 80) // 80ms interval
```

**Available Spinner Styles:**
- `dots` - ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏
- `line` - -\|/
- `arrow` - ←↖↑↗→↘↓↙
- `arc` - ◜◠◝◞◡◟
- `box` - ▖▘▝▗
- `bounce` - ⠁⠂⠄⠂
- `earth` - 🌍🌎🌏
- `moon` - 🌑🌒🌓🌔🌕🌖🌗🌘
- `clock` - 🕐🕑🕒🕓🕔🕕...
- `growing` - ▁▂▃▄▅▆▇█
- `pulse` - ●◉◎○

#### Multi-Step Progress

Track progress across multiple sequential steps:

```typescript
import { MultiStepProgress } from './cli_enhanced_progress'

const steps = new MultiStepProgress()
steps.addStep("download", "Downloading files", 100)
steps.addStep("process", "Processing data", 50)
steps.addStep("upload", "Uploading results", 75)

steps.startStep("download")
steps.updateStep("download", 50)

output.log(steps.render())

steps.completeStep("download")  // Auto-starts next step
```

---

### 5. **Advanced Layout Components**

#### Enhanced Panels

Panels with gradient headers and rounded corners:

```typescript
import { formatEnhancedPanel } from './cli_layout_helpers'

output.log(formatEnhancedPanel(
  "Configuration",
  "API Key: ****\nModel: claude-3-5-sonnet\nMax Tokens: 4096",
  { icon: "⚙", gradient: true, rounded: true, footer: "Last updated: 2 min ago" }
))
```

#### Side-by-Side Comparison

Compare two pieces of content:

```typescript
import { formatComparison } from './cli_layout_helpers'

output.log(formatComparison(
  "Before",
  "Old implementation with bugs",
  "After",
  "Refactored code with fixes"
))
```

#### Tabbed Interface

Visual representation of tabs:

```typescript
import { formatTabs } from './cli_layout_helpers'

output.log(formatTabs(
  [
    { label: "Overview", active: true },
    { label: "Details", active: false },
    { label: "Settings", active: false }
  ],
  "This is the overview content showing the main dashboard..."
))
```

#### Accordion Sections

Collapsible content sections:

```typescript
import { formatAccordion } from './cli_layout_helpers'

output.log(formatAccordion([
  {
    title: "Getting Started",
    content: "Follow these steps to begin...",
    expanded: true
  },
  {
    title: "Advanced Configuration",
    content: "For power users, these options...",
    expanded: false
  },
  {
    title: "Troubleshooting",
    content: "Common issues and solutions...",
    expanded: false
  }
]))
```

---

### 6. **Special Effect Characters**

Rich set of Unicode characters for enhanced visuals:

```typescript
import { EffectChars } from './cli_terminal_colors'

// Progress visualization
const bar = EffectChars.progressFull.repeat(10) + EffectChars.progressEmpty.repeat(10)

// Shapes
const bullet = EffectChars.circleFilled
const arrow = EffectChars.triangleRight

// Decorative
const star = EffectChars.starFilled
const heart = EffectChars.heart
```

**Available Characters:**
- **Progress**: progressFull, progressSeven...progressOne, progressEmpty
- **Blocks**: fullBlock, darkShade, mediumShade, lightShade
- **Triangles**: triangleUp, triangleDown, triangleLeft, triangleRight
- **Circles**: circleFilled, circleEmpty, circleHalf, circleDot
- **Diamonds**: diamondFilled, diamondEmpty
- **Stars**: starFilled, starEmpty
- **Misc**: heart, lightning, gear, lock, unlock

---

## 💡 Usage Best Practices

### Visual Hierarchy

1. **Use gradients for headers** to draw attention
2. **Apply rounded corners** for a modern, friendly feel
3. **Color-code by importance**:
   - Green for success/completion
   - Yellow for warnings/in-progress
   - Red for errors/critical
   - Blue for information
   - Purple for tips/special

### Information Density

1. **Use callouts** for critical information that must be noticed
2. **Use tooltips** for optional, contextual help
3. **Use accordions** for optional details that can be hidden
4. **Use dashboards** for at-a-glance status overviews

### Progress Feedback

1. **Use spinners** for indeterminate waits
2. **Use progress bars with ETA** for known durations
3. **Use multi-step progress** for complex workflows
4. **Color progress bars** by completion percentage

### Layout Organization

1. **Use panels** for grouped related information
2. **Use comparison views** for before/after or alternative options
3. **Use tabs** when content has multiple distinct views
4. **Use timelines** for chronological events

---

## 🎯 Design Principles

### 1. **Responsiveness**

All components adapt to terminal width (60-120 chars) with proper margins and word wrapping.

### 2. **Accessibility**

- Graceful degradation for terminals without color support
- Alternative text for emoji/Unicode characters
- High contrast color choices
- Clear visual hierarchy without relying solely on color

### 3. **Performance**

- Throttled output to prevent terminal flooding
- Efficient ANSI code usage
- Minimal redraw operations

### 4. **Consistency**

- Unified color palette across all components
- Consistent spacing and padding
- Standardized icon usage
- Coherent border styles

---

## 📊 Component Comparison

### Before vs After

#### Progress Indicators

**Before:**
```
Progress: [████████░░░░░░░░░░░░] 40%
```

**After:**
```
Progress [█████████████████░░░░░░░░░░░░░░░░░░] 40/100 | 40% | ETA: 2m 15s | 3.2/s
```

#### Notifications

**Before:**
```
[INFO] Task completed successfully
```

**After:**
```
╭─────────────────────────────────────────────────────────────────╮
│ ✓  TASK COMPLETED                                               │
├─────────────────────────────────────────────────────────────────┤
│  All files have been processed successfully.                    │
│  Files processed: 156                                           │
│  Time taken: 2m 34s                                             │
╰─────────────────────────────────────────────────────────────────╯
```

#### Menus

**Before:**
```
Select an option:
1. Continue
2. Pause
3. Abort
```

**After:**
```
╭─────────────────────────────────────────────────────────────────╮
│ SELECT ACTION                                                   │
├─────────────────────────────────────────────────────────────────┤
│ ▶ 1. Continue [C]                                               │
│      Proceed with current task                                  │
│   2. Pause [P]                                                  │
│      Temporarily pause execution                                │
│   3. Abort [A]                                                  │
│      Cancel and exit                                            │
├─────────────────────────────────────────────────────────────────┤
│ Use arrow keys to navigate, Enter to select                    │
╰─────────────────────────────────────────────────────────────────╯
```

---

## 🚀 Quick Start Examples

### Complete Example: Task Execution Flow

```typescript
import { formatNotification } from './cli_advanced_ui'
import { MultiStepProgress } from './cli_enhanced_progress'
import { formatDashboard } from './cli_advanced_ui'
import { output } from './cli_output'

// 1. Show notification
output.log(formatNotification(
  "Task Started",
  "Beginning file processing workflow",
  { type: "info" }
))

// 2. Setup multi-step progress
const progress = new MultiStepProgress()
progress.addStep("scan", "Scanning files", 100)
progress.addStep("analyze", "Analyzing content", 100)
progress.addStep("process", "Processing data", 100)

progress.startStep("scan")

// 3. Update progress
for (let i = 0; i <= 100; i += 10) {
  progress.updateStep("scan", i)
  output.log(progress.render())
  await delay(100)
}

progress.completeStep("scan")

// 4. Show dashboard
output.log(formatDashboard("Final Status", [
  { label: "Files Scanned", value: 156, status: "good" },
  { label: "Issues Found", value: 3, status: "warning" },
  { label: "Duration", value: "2m 34s", status: "neutral" }
]))

// 5. Success notification
output.log(formatNotification(
  "Completed",
  "All tasks finished successfully!",
  { type: "success", timestamp: true }
))
```

---

## 🔧 Migration Guide

### Updating Existing Code

#### 1. Replace Basic Progress Bars

**Old:**
```typescript
console.log(`Progress: ${current}/${total}`)
```

**New:**
```typescript
import { EnhancedProgress } from './cli_enhanced_progress'

const progress = new EnhancedProgress(current, total, "Processing")
output.log(progress.render())
```

#### 2. Upgrade Notifications

**Old:**
```typescript
console.log(`✓ Success: ${message}`)
```

**New:**
```typescript
import { formatNotification } from './cli_advanced_ui'

output.log(formatNotification("Success", message, { type: "success" }))
```

#### 3. Enhance Menus

**Old:**
```typescript
console.log("Select option:\n1. Option A\n2. Option B")
```

**New:**
```typescript
import { formatMenu } from './cli_advanced_ui'

output.log(formatMenu("Select Option", [
  { label: "Option A", description: "First choice" },
  { label: "Option B", description: "Second choice" }
], 0))
```

---

## 📚 API Reference

### Colors256

| Method | Description |
|--------|-------------|
| `fg(color)` | Foreground color from 256-palette |
| `bg(color)` | Background color from 256-palette |
| `rgb(r, g, b)` | True color foreground |
| `bgRgb(r, g, b)` | True color background |

### EnhancedProgress

| Method | Description |
|--------|-------------|
| `update(current)` | Update current progress |
| `increment(amount)` | Increment by amount |
| `getPercentage()` | Get completion percentage |
| `getEta()` | Get estimated time remaining |
| `formatEta()` | Format ETA as string |
| `formatSpeed()` | Format speed as string |
| `render(options)` | Render progress bar |
| `isComplete()` | Check if complete |

### MultiStepProgress

| Method | Description |
|--------|-------------|
| `addStep(id, label, total)` | Add a step |
| `startStep(id)` | Start a step |
| `updateStep(id, current)` | Update step progress |
| `completeStep(id, success)` | Mark step as complete |
| `render()` | Render all steps |
| `getOverallPercentage()` | Get total completion |

---

## 🎨 Color Palette Reference

### Semantic Colors

| Name | Use Case | Color |
|------|----------|-------|
| `success` | Completions, confirmations | Green |
| `error` | Errors, failures | Red |
| `warning` | Warnings, caution | Yellow |
| `info` | Information, neutral | Cyan |
| `progress` | In-progress states | Bright Yellow |
| `complete` | Completed states | Bright Green |
| `pending` | Pending, queued | Gray |

### 256-Color Presets

Organized by category for consistent theming:

**Cool Colors** (Professional, Calm):
- Ocean Blue (#21), Sky Blue (#117), Teal (#37), Mint (#121)

**Warm Colors** (Energetic, Attention):
- Orange (#208), Coral (#209), Amber (#214), Gold (#220)

**Vibrant Colors** (Accent, Highlight):
- Violet (#93), Lavender (#183), Purple (#127), Magenta (#201)

---

## 💬 Feedback & Iteration

These enhancements align with modern terminal UI best practices and the MarieCoder philosophy:

> **"Honor existing work, learn from friction, evolve with intention"**

The improvements maintain backward compatibility while providing a more polished, intuitive experience that makes the CLI feel modern and professional.

---

## 🔗 Related Files

- `cli_terminal_colors.ts` - Core color system and utilities
- `cli_advanced_ui.ts` - Advanced UI components
- `cli_enhanced_progress.ts` - Progress indicators
- `cli_layout_helpers.ts` - Layout components
- `cli_message_formatter.ts` - Message formatting

---

*Created with care for developers who appreciate beautiful, functional CLIs.* ✨

