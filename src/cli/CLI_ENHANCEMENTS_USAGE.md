# CLI Enhancements Usage Guide

**Quick reference for using the new CLI formatting and streaming features**

---

## 📚 Overview

The CLI has been enhanced with rich terminal formatting and streaming support inspired by the webview-ui. This guide shows you how to use these new features.

---

## 🎨 Message Formatters

### Basic Usage

```typescript
import {
  formatThinkingBlock,
  formatMessageBox,
  formatCommandExecution,
  formatFocusChain,
  formatTaskProgress,
  TerminalColors,
} from "./cli_message_formatter"
```

### Thinking Blocks

Display AI reasoning with rich formatting:

```typescript
// Expanded thinking block
const formatted = formatThinkingBlock(
  "I need to analyze the codebase structure...",
  { expanded: true, partial: false }
)
console.log(formatted)

// Collapsed preview
const preview = formatThinkingBlock(
  longText,
  { expanded: false }
)
console.log(preview)

// Streaming (partial) display
const streaming = formatThinkingBlock(
  partialText,
  { expanded: true, partial: true, showCopyHint: false }
)
console.log(streaming)
```

### Message Boxes

Display different types of messages:

```typescript
// Error message
console.log(formatMessageBox(
  "Error",
  "Authentication failed: Invalid credentials",
  { type: "error" }
))

// Success message
console.log(formatMessageBox(
  "Task Completion",
  "All tests passed successfully!",
  { type: "success" }
))

// Warning message
console.log(formatMessageBox(
  "Warning",
  "Deprecated API usage detected",
  { type: "warning" }
))

// Info message (default)
console.log(formatMessageBox(
  "Information",
  "Processing 150 files..."
))
```

### Command Execution

Display command status:

```typescript
// Pending command
console.log(formatCommandExecution("npm test", "pending"))

// Running command
console.log(formatCommandExecution("npm test", "running"))

// Successful command
console.log(formatCommandExecution("npm test", "success"))

// Failed command
console.log(formatCommandExecution("npm test", "error"))
```

### Focus Chain Visualization

Display multi-step task progress:

```typescript
const chain = {
  title: "Implement User Authentication",
  currentStepIndex: 1,
  steps: [
    {
      description: "Create user model",
      status: "completed" as const,
      result: "Successfully created user schema",
      duration: 5,
    },
    {
      description: "Implement authentication logic",
      status: "in_progress" as const,
    },
    {
      description: "Add password hashing",
      status: "pending" as const,
    },
  ],
}

console.log(formatFocusChain(chain))
```

### Task Progress

Display progress bars:

```typescript
// Simple progress
console.log(formatTaskProgress(3, 10, "Processing"))

// With custom label
console.log(formatTaskProgress(7, 10, "Tests"))
```

### Terminal Colors

Use colors directly:

```typescript
import { TerminalColors } from "./cli_message_formatter"

console.log(
  `${TerminalColors.cyan}Info:${TerminalColors.reset} ` +
  `${TerminalColors.bright}Important message${TerminalColors.reset}`
)

console.log(
  `${TerminalColors.green}✓${TerminalColors.reset} Success`
)

console.log(
  `${TerminalColors.red}✗${TerminalColors.reset} ` +
  `${TerminalColors.red}Error${TerminalColors.reset}`
)

console.log(
  `${TerminalColors.dim}(hint: press Enter to continue)${TerminalColors.reset}`
)
```

---

## 🌊 Stream Handler

### Basic Usage

```typescript
import { getStreamHandler } from "./cli_stream_handler"

const streamHandler = getStreamHandler({
  throttleMs: 100,              // Update frequency
  showPartialContent: true,      // Show content while streaming
  autoExpandThinking: true,      // Auto-expand thinking blocks
  maxPartialLength: 500,         // Max preview length
})
```

### Starting a Stream

```typescript
// Start text stream
streamHandler.startStream("text")

// Start thinking stream
streamHandler.startStream("thinking")

// Start command stream
streamHandler.startStream("command")
```

### Updating a Stream

```typescript
// Partial update (streaming)
streamHandler.updateStream("Partial content...", true)

// Complete update (finalize)
streamHandler.updateStream("Complete content.", false)
```

### Ending a Stream

```typescript
// End current stream
streamHandler.endStream()
```

### Handling Messages

```typescript
import type { ClineMessage } from "@/shared/ExtensionMessage"

// Process a message through the stream handler
const message: ClineMessage = {
  type: "say",
  say: "text",
  text: "Hello world",
  partial: true,
}

streamHandler.handleMessage(message)
```

### Complete Example

```typescript
import { getStreamHandler } from "./cli_stream_handler"

const handler = getStreamHandler()

// Start streaming
handler.startStream("thinking")

// Simulate streaming updates
const chunks = [
  "I need to analyze",
  "I need to analyze the code",
  "I need to analyze the code structure",
  "I need to analyze the code structure to understand...",
]

for (const chunk of chunks) {
  handler.updateStream(chunk, true)
  await new Promise(resolve => setTimeout(resolve, 100))
}

// Finalize
handler.updateStream(chunks[chunks.length - 1], false)
handler.endStream()
```

---

## 🔄 Integration Patterns

### Task Monitor Integration

The `CliTaskMonitor` automatically uses these features:

```typescript
import { CliTaskMonitor } from "./cli_task_monitor"

const monitor = new CliTaskMonitor(
  false, // autoApprove
  {
    lineLimit: 500,
    shellIntegrationTimeout: 30000,
    terminalReuseEnabled: true,
  }
)

// Start monitoring (automatic streaming support)
monitor.startMonitoring(task)
```

### Focus Chain Manager Integration

The `CliFocusChainManager` uses enhanced formatters:

```typescript
import { CliFocusChainManager } from "./cli_focus_chain_manager"

const manager = new CliFocusChainManager(true) // verbose

// Display focus chain (automatically formatted)
console.log(manager.displayFocusChain())
```

---

## 💡 Best Practices

### 1. Use Appropriate Message Types

```typescript
// ✅ Good - Semantic message types
console.log(formatMessageBox("Error", errorMessage, { type: "error" }))
console.log(formatMessageBox("Success", result, { type: "success" }))

// ❌ Bad - Generic formatting
console.log("Error:", errorMessage)
console.log("Success:", result)
```

### 2. Handle Streaming Properly

```typescript
// ✅ Good - Clean lifecycle
streamHandler.startStream("thinking")
try {
  // ... streaming updates
  streamHandler.updateStream(content, true)
} finally {
  streamHandler.endStream() // Always cleanup
}

// ❌ Bad - Missing cleanup
streamHandler.startStream("thinking")
streamHandler.updateStream(content, true)
// Missing endStream()
```

### 3. Use Colors Consistently

```typescript
// ✅ Good - Consistent color scheme
console.log(`${TerminalColors.cyan}🤖 AI:${TerminalColors.reset} ${text}`)
console.log(`${TerminalColors.green}✓${TerminalColors.reset} Success`)
console.log(`${TerminalColors.red}✗${TerminalColors.reset} Error`)

// ❌ Bad - Inconsistent colors
console.log(`${TerminalColors.red}🤖 AI:${TerminalColors.reset} ${text}`)
console.log(`${TerminalColors.yellow}✓${TerminalColors.reset} Success`)
```

### 4. Reset Colors After Use

```typescript
// ✅ Good - Always reset
console.log(`${TerminalColors.bright}Important${TerminalColors.reset}`)

// ❌ Bad - No reset (affects subsequent output)
console.log(`${TerminalColors.bright}Important`)
```

### 5. Provide Context in Messages

```typescript
// ✅ Good - Descriptive messages
formatMessageBox(
  "Authentication Error",
  "Invalid credentials provided. Please check your username and password.",
  { type: "error" }
)

// ❌ Bad - Vague messages
formatMessageBox("Error", "Failed", { type: "error" })
```

---

## 🧪 Testing

### Manual Testing

```typescript
// Test formatters
import * as formatters from "./cli_message_formatter"

// Test thinking block
console.log(formatters.formatThinkingBlock("Test content", { expanded: true }))

// Test message box
console.log(formatters.formatMessageBox("Test", "Content", { type: "success" }))

// Test stream handler
import { getStreamHandler } from "./cli_stream_handler"
const handler = getStreamHandler()
handler.startStream("text")
handler.updateStream("Test", true)
handler.endStream()
```

### Integration Testing

```typescript
// Test with actual task
import { CliTaskMonitor } from "./cli_task_monitor"
import type { Task } from "@/core/task"

const monitor = new CliTaskMonitor()
monitor.startMonitoring(testTask)

// Verify messages are formatted correctly
// ... assertions here
```

---

## 🔧 Configuration

### Stream Handler Configuration

```typescript
const handler = getStreamHandler({
  throttleMs: 100,              // Min time between updates (ms)
  showPartialContent: true,      // Show content while streaming
  autoExpandThinking: true,      // Auto-expand thinking blocks
  maxPartialLength: 500,         // Max length for partial display
})
```

### Task Monitor Configuration

```typescript
const monitor = new CliTaskMonitor(
  false, // autoApprove
  {
    lineLimit: 500,              // Max lines per command output
    shellIntegrationTimeout: 30000, // Shell command timeout (ms)
    terminalReuseEnabled: true,   // Reuse terminal sessions
  }
)
```

---

## 📖 API Reference

### Formatters

| Function | Purpose | Returns |
|----------|---------|---------|
| `formatThinkingBlock()` | Format AI reasoning block | `string` |
| `formatMessageBox()` | Format message with border | `string` |
| `formatCommandExecution()` | Format command display | `string` |
| `formatFocusChain()` | Format task chain progress | `string` |
| `formatTaskProgress()` | Format progress bar | `string` |
| `formatSeparator()` | Create separator line | `string` |

### Stream Handler Methods

| Method | Purpose |
|--------|---------|
| `startStream()` | Start new stream session |
| `updateStream()` | Update stream content |
| `endStream()` | End current stream |
| `handleMessage()` | Process ClineMessage |
| `dispose()` | Cleanup resources |

### Constants

```typescript
// Terminal colors
TerminalColors.reset
TerminalColors.bright
TerminalColors.dim
TerminalColors.red
TerminalColors.green
TerminalColors.yellow
TerminalColors.blue
TerminalColors.magenta
TerminalColors.cyan
TerminalColors.white
TerminalColors.gray
TerminalColors.black

// Box drawing characters
BoxChars.topLeft
BoxChars.topRight
BoxChars.bottomLeft
BoxChars.bottomRight
BoxChars.horizontal
BoxChars.vertical
BoxChars.checkMark
BoxChars.crossMark
// ... and more
```

---

## 🐛 Troubleshooting

### Colors Not Showing

**Problem**: Terminal colors appear as escape sequences  
**Solution**: Ensure terminal supports ANSI colors

```bash
# Check terminal support
echo $TERM
```

### Stream Not Updating

**Problem**: Stream content not appearing  
**Solution**: Ensure throttling config is appropriate

```typescript
// Reduce throttle time
const handler = getStreamHandler({ throttleMs: 50 })
```

### Box Characters Not Rendering

**Problem**: Box drawing characters appear as question marks  
**Solution**: Ensure terminal uses UTF-8 encoding

```bash
# Check encoding
locale | grep UTF
```

---

## 📚 Further Reading

- [CLI_IMPROVEMENTS_SUMMARY.md](../../CLI_IMPROVEMENTS_SUMMARY.md) - Complete implementation details
- [Webview ThinkingBlock Documentation](../../webview-ui/docs/thinking-stream-styling-improvements.md)
- [MarieCoder Development Standards](../../.cursor/rules) - Coding standards

---

**Last Updated:** October 15, 2025  
**Maintained with:** KonMari Principles

