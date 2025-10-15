# CLI Advanced Features - Complete Guide

**MarieCoder CLI - Advanced UI Components**

*Comprehensive documentation for immersive, interactive, and visually rich CLI experiences*

---

## 📚 Table of Contents

1. [Animations](#animations)
2. [Interactive Components](#interactive-components)
3. [Data Visualization](#data-visualization)
4. [Immersive Experience](#immersive-experience)
5. [Enhanced Feedback](#enhanced-feedback)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

---

## 🎬 Animations

### Typewriter Effect

Creates a character-by-character reveal effect.

```typescript
import { TypewriterEffect } from './cli_animations'

const typewriter = new TypewriterEffect("Hello, World!", 50)

typewriter.start(
  (text) => console.log(text),
  () => console.log("Complete!")
)

// Stop animation
typewriter.stop()
```

**Use Cases:**
- Welcome messages
- Important announcements
- Tutorial text
- Storytelling

---

### Wave Animation

Creates a flowing wave pattern.

```typescript
import { WaveAnimation } from './cli_animations'

const wave = new WaveAnimation(20)

// In animation loop
setInterval(() => {
  console.log(wave.render("Loading"))
}, 100)
```

**Use Cases:**
- Loading states
- Background animations
- Decorative elements

---

### Particle Effect

Creates animated particles in a bounded area.

```typescript
import { ParticleEffect } from './cli_animations'

const particles = new ParticleEffect(40, 5, 20)

setInterval(() => {
  console.clear()
  console.log(particles.render("Particle Animation"))
}, 50)
```

**Use Cases:**
- Splash screens
- Celebration animations
- Visual interest

---

### Loading Sequence

Multi-stage loading with progress tracking.

```typescript
import { LoadingSequence } from './cli_animations'

const sequence = new LoadingSequence([
  { label: "Initializing...", duration: 1000, icon: "🔧" },
  { label: "Loading modules...", duration: 2000, icon: "📦" },
  { label: "Connecting...", duration: 1500, icon: "🌐" },
  { label: "Ready!", icon: "✓" }
])

const interval = setInterval(() => {
  console.clear()
  console.log(sequence.render())
  
  if (sequence.isStageComplete()) {
    if (!sequence.nextStage()) {
      clearInterval(interval)
    }
  }
}, 100)
```

**Use Cases:**
- Application startup
- Multi-step operations
- Installation processes

---

### Pulse Effect

Creates pulsing/breathing effect for attention.

```typescript
import { PulseEffect } from './cli_animations'

const pulse = new PulseEffect()

setInterval(() => {
  console.log(pulse.nextFrame("⚠ ATTENTION", TerminalColors.red))
}, 100)
```

**Use Cases:**
- Alerts
- Warnings
- Important status indicators

---

### Rainbow Effect

Applies rainbow colors to text.

```typescript
import { RainbowEffect } from './cli_animations'

const rainbow = new RainbowEffect()

setInterval(() => {
  console.log(rainbow.apply("MarieCoder"))
}, 100)
```

**Use Cases:**
- Celebration messages
- Easter eggs
- Fun elements

---

### Matrix Effect

Falling text like The Matrix.

```typescript
import { MatrixEffect } from './cli_animations'

const matrix = new MatrixEffect(60, 10)

setInterval(() => {
  console.clear()
  console.log(matrix.nextFrame())
}, 50)
```

**Use Cases:**
- Screensavers
- Loading backgrounds
- Tech-themed displays

---

## 🎮 Interactive Components

### Enhanced Input

Input field with validation and suggestions.

```typescript
import { EnhancedInput } from './cli_interactive_components'

const input = new EnhancedInput(
  "Username",
  "Enter your username",
  // Validator
  (value) => ({
    valid: value.length >= 3,
    message: value.length < 3 ? "Username must be at least 3 characters" : undefined
  }),
  // Suggestion provider
  (value) => ["alice", "bob", "charlie"].filter(s => s.startsWith(value))
)

// Update value
input.setValue("al")

// Render
console.log(input.render())

// Navigate suggestions
input.nextSuggestion()
input.acceptSuggestion()
```

**Features:**
- Real-time validation
- Auto-suggestions
- Cursor positioning
- Visual feedback

---

### Multi-Select List

Checkbox-style multi-selection.

```typescript
import { MultiSelectList } from './cli_interactive_components'

const multiSelect = new MultiSelectList(
  "Select Features",
  [
    { label: "Dark Mode", value: "dark_mode", description: "Enable dark theme" },
    { label: "Notifications", value: "notifications" },
    { label: "Analytics", value: "analytics", disabled: true }
  ],
  [0] // Initially selected indices
)

// Navigation
multiSelect.moveDown()
multiSelect.moveUp()
multiSelect.toggleCurrent()

// Get selections
const selected = multiSelect.getSelected()

// Render
console.log(multiSelect.render())
```

**Features:**
- Keyboard navigation
- Multiple selections
- Disabled options
- Descriptions

---

### Searchable Dropdown

Filterable dropdown menu.

```typescript
import { SearchableDropdown } from './cli_interactive_components'

const dropdown = new SearchableDropdown(
  "Select Language",
  [
    { label: "JavaScript", value: "js", tags: ["web", "frontend"] },
    { label: "TypeScript", value: "ts", tags: ["web", "typed"] },
    { label: "Python", value: "py", tags: ["data", "backend"] }
  ]
)

dropdown.open()
dropdown.setQuery("type")
dropdown.moveSelection("down")

const selected = dropdown.getSelected()
console.log(dropdown.render())
```

**Features:**
- Fuzzy search
- Tag-based filtering
- Keyboard navigation
- Real-time filtering

---

### Command Palette

Quick action launcher.

```typescript
import { CommandPalette } from './cli_interactive_components'

const palette = new CommandPalette([
  {
    label: "Create New File",
    description: "Create a new file in the project",
    action: "file:new",
    keywords: ["new", "create", "file"],
    icon: "📄"
  },
  {
    label: "Open Settings",
    description: "Open application settings",
    action: "settings:open",
    keywords: ["settings", "config"],
    icon: "⚙"
  }
])

palette.setQuery("new")
const command = palette.getSelected()
console.log(palette.render())
```

**Features:**
- Keyword search
- Icons
- Descriptions
- Quick access

---

### Confirm Dialog

Confirmation prompts.

```typescript
import { ConfirmDialog } from './cli_interactive_components'

const dialog = new ConfirmDialog(
  "Delete File?",
  "Are you sure you want to delete this file?\nThis action cannot be undone.",
  ["Yes", "No", "Cancel"]
)

dialog.moveSelection("right")
const choice = dialog.getSelected()
console.log(dialog.render())
```

**Features:**
- Multiple options
- Keyboard navigation
- Clear messaging

---

### Rating Selector

Star rating input.

```typescript
import { RatingSelector } from './cli_interactive_components'

const rating = new RatingSelector("Rate this feature", 5, "★")

rating.setRating(4)
rating.increment()
rating.decrement()

console.log(rating.render())
// Output: Rate this feature: ★★★★☆ (4/5)
```

**Features:**
- Custom icons
- Keyboard control
- Visual feedback

---

## 📊 Data Visualization

### Bar Chart

Horizontal bar charts.

```typescript
import { BarChart } from './cli_data_visualization'

const chart = new BarChart(
  "Monthly Sales",
  [
    { label: "January", value: 120, color: Colors256.presets.skyBlue },
    { label: "February", value: 150, color: Colors256.presets.teal },
    { label: "March", value: 180, color: Colors256.presets.limeGreen }
  ],
  { showValues: true, showPercentages: true }
)

console.log(chart.render())
```

---

### Vertical Bar Chart

Column-style charts.

```typescript
import { VerticalBarChart } from './cli_data_visualization'

const chart = new VerticalBarChart(
  "Quarterly Revenue",
  [
    { label: "Q1", value: 100 },
    { label: "Q2", value: 150 },
    { label: "Q3", value: 120 },
    { label: "Q4", value: 180 }
  ],
  10 // height
)

console.log(chart.render())
```

---

### Sparkline

Compact inline charts.

```typescript
import { Sparkline } from './cli_data_visualization'

const spark = new Sparkline([10, 20, 15, 25, 30, 28, 35])

console.log(spark.render({ showMinMax: true }))
// Output: 10 ▁▃▂▅▇▆█ 35

console.log(spark.renderWithLabel("CPU Usage"))
// Output: CPU Usage: ▁▃▂▅▇▆█
```

**Use Cases:**
- Inline metrics
- Trends
- Dashboard widgets

---

### Line Chart

Full line charts with axes.

```typescript
import { LineChart } from './cli_data_visualization'

const chart = new LineChart(
  "Temperature",
  [20, 22, 21, 25, 28, 27, 30],
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
)

console.log(chart.render({ height: 10, width: 60 }))
```

---

### Pie Chart

Distribution visualization.

```typescript
import { PieChart } from './cli_data_visualization'

const pie = new PieChart(
  "Market Share",
  [
    { label: "Product A", value: 45, color: Colors256.presets.skyBlue },
    { label: "Product B", value: 30, color: Colors256.presets.teal },
    { label: "Product C", value: 25, color: Colors256.presets.amber }
  ]
)

console.log(pie.render())
```

---

### Heat Map

2D data visualization.

```typescript
import { HeatMap } from './cli_data_visualization'

const heatmap = new HeatMap(
  "Activity Matrix",
  [
    [5, 10, 15, 20],
    [8, 12, 18, 25],
    [3, 7, 12, 16]
  ],
  ["Row 1", "Row 2", "Row 3"],
  ["Col 1", "Col 2", "Col 3", "Col 4"]
)

console.log(heatmap.render())
```

---

### Histogram

Distribution charts.

```typescript
import { Histogram } from './cli_data_visualization'

const histogram = new Histogram(
  "Response Times",
  [100, 150, 120, 200, 180, 190, 110, 130],
  10 // number of bins
)

console.log(histogram.render())
```

---

### Gauge

Progress/status meters.

```typescript
import { Gauge } from './cli_data_visualization'

const gauge = new Gauge("Disk Usage", 75, 0, 100)

console.log(gauge.render({ width: 30, showValue: true }))
// Output: Disk Usage: [████████████████████░░░░░░░░░░] 75% 75.0/100
```

---

### Trend Indicator

Change indicators.

```typescript
import { TrendIndicator } from './cli_data_visualization'

const trend = new TrendIndicator("Revenue", 15000, 12000)

console.log(trend.render())
// Output: Revenue: 15000.0 ↑ +3000.0 (+25.0%)
```

---

### Data Table

Structured data display.

```typescript
import { DataTable } from './cli_data_visualization'

const table = new DataTable(
  "User Statistics",
  ["Name", "Score", "Level"],
  [
    ["Alice", "1200", "5"],
    ["Bob", "980", "4"],
    ["Charlie", "1500", "6"]
  ]
)

console.log(table.render())
```

---

## 🎭 Immersive Experience

### Splash Screen

Application welcome screen.

```typescript
import { SplashScreen } from './cli_immersive_experience'

const splash = new SplashScreen(
  "MarieCoder",
  "2.0.0",
  "The mindful approach to development",
  [
    " __  __            _       ",
    "|  \\/  | __ _ _ __(_) ___  ",
    "| |\\/| |/ _` | '__| |/ _ \\ ",
    "| |  | | (_| | |  | |  __/ ",
    "|_|  |_|\\__,_|_|  |_|\\___| "
  ]
)

console.log(splash.render())
console.log(splash.renderWithLoading("Starting up..."))
```

---

### Tutorial Overlay

Step-by-step tutorials.

```typescript
import { TutorialOverlay } from './cli_immersive_experience'

const tutorial = new TutorialOverlay([
  {
    title: "Welcome to MarieCoder",
    content: "Let's get you started with the basics.",
    hint: "Press Enter to continue"
  },
  {
    title: "Creating Your First Task",
    content: "Use the command palette to create a new task.",
    action: "Try pressing Ctrl+P"
  }
])

console.log(tutorial.render())
tutorial.nextStep()
console.log(tutorial.render())
```

---

### Contextual Hint

Context-sensitive tips.

```typescript
import { ContextualHint } from './cli_immersive_experience'

const hint = new ContextualHint(
  "You can use Tab to auto-complete commands",
  "tip"
)

console.log(hint.render())
```

**Types:** `tip`, `hint`, `info`, `warning`

---

### Achievement

Celebrate accomplishments.

```typescript
import { Achievement } from './cli_immersive_experience'

const achievement = new Achievement(
  "First Steps",
  "You've completed your first task!",
  "🏆"
)

console.log(achievement.render())
```

---

### Milestone

Track progress milestones.

```typescript
import { Milestone } from './cli_immersive_experience'

const milestone = new Milestone(
  "Complete 100 Tasks",
  75,
  100,
  ["Pro Badge", "+50 XP", "Special Theme"]
)

console.log(milestone.render())
```

---

### Success Animation

Animated success feedback.

```typescript
import { SuccessAnimation } from './cli_immersive_experience'

const success = new SuccessAnimation()

const interval = setInterval(() => {
  console.clear()
  console.log(success.render("Task Completed Successfully!"))
  
  if (success.isComplete()) {
    clearInterval(interval)
  }
}, 200)
```

---

### Guided Tour

Multi-step guided experiences.

```typescript
import { GuidedTourStep } from './cli_immersive_experience'

const step = new GuidedTourStep(
  1,
  5,
  "Getting Started",
  [
    "Open the command palette with Ctrl+P",
    "Type 'new task' to create a task",
    "Press Enter to confirm"
  ],
  "You can cancel anytime with Escape"
)

console.log(step.render())
```

---

### Welcome Message

First-run experience.

```typescript
import { WelcomeMessage } from './cli_immersive_experience'

const welcome = new WelcomeMessage(
  "MarieCoder",
  "2.0.0",
  [
    { command: "marie help", description: "Show available commands" },
    { command: "marie new", description: "Create a new task" },
    { command: "marie status", description: "View current status" }
  ]
)

console.log(welcome.render())
```

---

## 🔔 Enhanced Feedback

### Live Activity Monitor

Real-time activity tracking.

```typescript
import { LiveActivityMonitor } from './cli_enhanced_feedback'

const monitor = new LiveActivityMonitor()

monitor.updateActivity("task1", "Processing files", "active", "3/10 files")
monitor.updateActivity("task2", "Downloading", "active")
monitor.updateActivity("task3", "Completed", "success")

setInterval(() => {
  console.clear()
  console.log(monitor.render())
}, 100)
```

---

### Pulsing Alert

Attention-grabbing alerts.

```typescript
import { PulsingAlert } from './cli_enhanced_feedback'

const alert = new PulsingAlert("Connection Lost", "error")

setInterval(() => {
  console.log(alert.render())
}, 100)
```

---

### Status Indicator

Connection/service status.

```typescript
import { StatusIndicator } from './cli_enhanced_feedback'

const status = new StatusIndicator("Database", "connecting")

setInterval(() => {
  console.log(status.render())
}, 100)

// Update status
setTimeout(() => status.setStatus("online"), 2000)
```

---

### Metrics Display

Real-time metrics dashboard.

```typescript
import { MetricsDisplay } from './cli_enhanced_feedback'

const metrics = new MetricsDisplay()

metrics.updateMetric("Requests", 1250, "/min", "up")
metrics.updateMetric("Response Time", 45, "ms", "down")
metrics.updateMetric("Error Rate", 0.5, "%", "stable")

console.log(metrics.render())
```

---

### Live Log Viewer

Streaming log display.

```typescript
import { LiveLogViewer } from './cli_enhanced_feedback'

const logs = new LiveLogViewer()

logs.addLog("info", "Application started")
logs.addLog("debug", "Loading configuration")
logs.addLog("warn", "Deprecated API used")
logs.addLog("error", "Connection timeout")

// Filter by level
logs.setFilter("error")

console.log(logs.render(10))
```

---

### Resource Monitor

System resource tracking.

```typescript
import { ResourceMonitor } from './cli_enhanced_feedback'

const resources = new ResourceMonitor()

resources.updateResource("CPU", 45, 100, "%")
resources.updateResource("Memory", 2.5, 8, "GB")
resources.updateResource("Disk", 150, 500, "GB")

console.log(resources.render())
```

---

### Connection Status

Network connection panel.

```typescript
import { ConnectionStatus } from './cli_enhanced_feedback'

const connections = new ConnectionStatus()

connections.updateConnection("API Server", "connected", 25)
connections.updateConnection("Database", "connecting")
connections.updateConnection("Cache", "error")

console.log(connections.render())
```

---

## ✨ Best Practices

### Performance

1. **Throttle Updates**: Don't update too frequently
   ```typescript
   // Good
   setInterval(() => update(), 100) // 10fps
   
   // Bad
   setInterval(() => update(), 10) // 100fps - unnecessary
   ```

2. **Clean Up**: Always clear intervals and timeouts
   ```typescript
   const interval = setInterval(() => {}, 100)
   // Later...
   clearInterval(interval)
   ```

3. **Limit History**: Cap array sizes for live data
   ```typescript
   if (logs.length > MAX_LOGS) {
     logs.shift() // Remove oldest
   }
   ```

### User Experience

1. **Provide Feedback**: Always show what's happening
2. **Be Consistent**: Use similar patterns throughout
3. **Enable Escape**: Always allow users to cancel/exit
4. **Show Progress**: For long operations, show ETA
5. **Use Color Meaningfully**: Red=error, Green=success, etc.

### Accessibility

1. **Fallback for Basic Terminals**: Check capabilities
2. **Clear Text**: Don't rely only on color
3. **Keyboard Navigation**: Support arrow keys, Enter, Escape
4. **Screen Reader Friendly**: Include text descriptions

### Code Organization

1. **Modular**: Keep components independent
2. **Reusable**: Create generic, configurable components
3. **Documented**: Add JSDoc comments
4. **Typed**: Use TypeScript for safety

---

## 🎯 Complete Examples

### Application Startup Sequence

```typescript
import { SplashScreen, LoadingSequence } from './cli_immersive_experience'
import { LiveActivityMonitor } from './cli_enhanced_feedback'

async function startup() {
  // Show splash
  const splash = new SplashScreen("MarieCoder", "2.0.0")
  console.clear()
  console.log(splash.render())
  await sleep(2000)
  
  // Loading sequence
  const sequence = new LoadingSequence([
    { label: "Initializing...", duration: 1000 },
    { label: "Loading modules...", duration: 1500 },
    { label: "Connecting...", duration: 1000 }
  ])
  
  const interval = setInterval(() => {
    console.clear()
    console.log(sequence.render())
    
    if (sequence.isStageComplete()) {
      if (!sequence.nextStage()) {
        clearInterval(interval)
        startApp()
      }
    }
  }, 100)
}
```

### Interactive Task Manager

```typescript
import { MultiSelectList, ConfirmDialog } from './cli_interactive_components'
import { Achievement } from './cli_immersive_experience'

class TaskManager {
  private taskList: MultiSelectList
  
  constructor() {
    this.taskList = new MultiSelectList("Tasks", [
      { label: "Write documentation", value: "doc" },
      { label: "Fix bug #123", value: "bug123" },
      { label: "Review PR", value: "pr" }
    ])
  }
  
  async selectTasks() {
    console.clear()
    console.log(this.taskList.render())
    
    // Handle user input...
    const selected = this.taskList.getSelected()
    
    if (selected.length === 3) {
      // Show achievement
      const achievement = new Achievement(
        "Multitasker",
        "Selected 3 tasks at once!"
      )
      console.log(achievement.render())
    }
  }
}
```

### Real-Time Dashboard

```typescript
import { MetricsDisplay, LiveActivityMonitor, ResourceMonitor } from './cli_enhanced_feedback'
import { BarChart, Sparkline } from './cli_data_visualization'

class Dashboard {
  private metrics = new MetricsDisplay()
  private activities = new LiveActivityMonitor()
  private resources = new ResourceMonitor()
  
  start() {
    setInterval(() => {
      console.clear()
      
      // Update metrics
      this.metrics.updateMetric("Users", this.getUserCount(), "")
      this.metrics.updateMetric("Requests", this.getRequestRate(), "/s")
      
      // Show dashboard
      console.log(this.metrics.render())
      console.log(this.activities.render())
      console.log(this.resources.render())
    }, 1000)
  }
}
```

---

## 🚀 Quick Start Template

```typescript
import {
  SplashScreen,
  WelcomeMessage,
  CommandPalette,
  LiveActivityMonitor,
  MetricsDisplay
} from './cli_*'

class MyApp {
  private palette: CommandPalette
  private monitor: LiveActivityMonitor
  private metrics: MetricsDisplay
  
  async start() {
    // Show splash
    await this.showSplash()
    
    // Show welcome
    await this.showWelcome()
    
    // Start main loop
    this.mainLoop()
  }
  
  private async showSplash() {
    const splash = new SplashScreen("MyApp", "1.0.0")
    console.clear()
    console.log(splash.render())
    await sleep(2000)
  }
  
  private async showWelcome() {
    const welcome = new WelcomeMessage("MyApp", "1.0.0", [
      { command: "help", description: "Show help" },
      { command: "start", description: "Start processing" }
    ])
    console.clear()
    console.log(welcome.render())
    await sleep(3000)
  }
  
  private mainLoop() {
    // Initialize components
    this.palette = new CommandPalette([...])
    this.monitor = new LiveActivityMonitor()
    this.metrics = new MetricsDisplay()
    
    // Render loop
    setInterval(() => {
      this.render()
    }, 100)
  }
  
  private render() {
    console.clear()
    console.log(this.palette.render())
    console.log(this.monitor.render())
    console.log(this.metrics.render())
  }
}

// Run app
new MyApp().start()
```

---

## 📖 Additional Resources

- [Terminal Colors Guide](./CLI_UI_QUICK_REFERENCE.md)
- [Core UI Components](./CLI_UI_ENHANCEMENTS.md)
- [Development Standards](../README.md)

---

*Built with ❤️ following the MarieCoder philosophy: clarity, compassion, and continuous evolution.*

