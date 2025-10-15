# CLI Quick Wins - Implementation Guide

> *Concrete examples for immediate, high-impact improvements*

This guide shows **specific before/after code examples** for quick improvements to the CLI. Each example follows the MarieCoder development standards and can be implemented independently.

---

## 🎯 Quick Win #1: Use Constants Instead of Magic Numbers

### ✅ Files to Update

1. Update `cli_task_monitor.ts`
2. Update `cli_interaction_handler.ts`
3. Update `cli_stream_handler.ts`
4. Update `index.ts`

### 📝 Example: cli_task_monitor.ts

**Before:**
```typescript
export class CliTaskMonitor {
    private lineLimit: number
    
    constructor(
        private autoApprove: boolean = false,
        config?: TerminalOutputConfig,
    ) {
        this.lineLimit = config?.lineLimit || 500
    }
    
    startMonitoring(task: Task): void {
        this.monitorInterval = setInterval(() => this.checkForNewMessages(), 100)
    }
    
    private async handleAskMessage(message: ClineMessage): Promise<void> {
        const timeoutId = setTimeout(() => this.handleTimeout(), 5 * 60 * 1000)
        // ...
    }
}
```

**After:**
```typescript
import { OUTPUT_LIMITS, TIMEOUTS } from "./cli_constants"

export class CliTaskMonitor {
    private lineLimit: number
    
    constructor(
        private autoApprove: boolean = false,
        config?: TerminalOutputConfig,
    ) {
        this.lineLimit = config?.lineLimit || OUTPUT_LIMITS.DEFAULT_LINE_LIMIT
    }
    
    startMonitoring(task: Task): void {
        this.monitorInterval = setInterval(
            () => this.checkForNewMessages(),
            TIMEOUTS.MESSAGE_CHECK_INTERVAL
        )
    }
    
    private async handleAskMessage(message: ClineMessage): Promise<void> {
        const timeoutId = setTimeout(
            () => this.handleTimeout(),
            TIMEOUTS.APPROVAL_REQUEST
        )
        // ...
    }
}
```

**Impact**: Self-documenting, easier to maintain, all timeouts in one place

---

## 🎯 Quick Win #2: Consolidate Color Definitions

### ✅ Files to Update

1. Update `cli_diff_provider.ts` (remove COLORS, import TerminalColors)
2. Update `cli_message_formatter.ts` (import from shared file)
3. Update `cli_stream_handler.ts` (import from shared file)
4. Update `cli_logger.ts` (import from shared file)

### 📝 Example: cli_diff_provider.ts

**Before:**
```typescript
// ANSI color codes for terminal output
const COLORS = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
}

export class CliDiffViewProvider extends DiffViewProvider {
    private formatDiffLine(line: string): string {
        if (line.startsWith("+++") || line.startsWith("---")) {
            return `${COLORS.bright}${COLORS.yellow}${line}${COLORS.reset}`
        }
        // ...
    }
}
```

**After:**
```typescript
import { TerminalColors } from "./cli_terminal_colors"

export class CliDiffViewProvider extends DiffViewProvider {
    private formatDiffLine(line: string): string {
        if (line.startsWith("+++") || line.startsWith("---")) {
            return `${TerminalColors.bright}${TerminalColors.yellow}${line}${TerminalColors.reset}`
        }
        // ...
    }
}
```

**Impact**: Single source of truth, consistent colors across CLI

---

## 🎯 Quick Win #3: Replace `any` Types

### ✅ Files to Update

1. Update `cli_diff_provider.ts`
2. Update `cli_task_monitor.ts`
3. Update `cli_logger.ts`
4. Update `cli_progress_manager.ts`

### 📝 Example: cli_diff_provider.ts

**Before:**
```typescript
protected async saveDocument(): Promise<Boolean> {
    if (!this.activeDiffEditorId) {
        return false
    }

    try {
        await HostProvider.diff.saveDocument({ diffId: this.activeDiffEditorId })
        return true
    } catch (err: any) {
        console.error("Failed to save document:", err)
        return false
    }
}
```

**After:**
```typescript
protected async saveDocument(): Promise<boolean> {
    if (!this.activeDiffEditorId) {
        return false
    }

    try {
        await HostProvider.diff.saveDocument({ diffId: this.activeDiffEditorId })
        return true
    } catch (error) {
        const errorMessage = error instanceof Error 
            ? error.message 
            : String(error)
        console.error(`Failed to save document: ${errorMessage}`)
        return false
    }
}
```

**Changes**:
- ❌ `Promise<Boolean>` → ✅ `Promise<boolean>` (use primitive)
- ❌ `err: any` → ✅ `error` (no type annotation, let TypeScript infer)
- ✅ Type-safe error handling with proper narrowing

---

### 📝 Example: cli_logger.ts

**Before:**
```typescript
debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
        const formatted = this.formatMessage("DEBUG", message, "gray")
        console.log(formatted, ...args)
    }
}
```

**After:**
```typescript
debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
        const formatted = this.formatMessage("DEBUG", message, "gray")
        console.log(formatted, ...args)
    }
}
```

**Impact**: Better type safety without changing behavior

---

## 🎯 Quick Win #4: Add Actionable Error Messages

### ✅ Files to Update

1. Update error messages throughout CLI files
2. Follow pattern: "What failed" + "Why it might have failed" + "How to fix"

### 📝 Example: cli_connection_pool.ts

**Before:**
```typescript
throw new Error(`Connection pool timeout after ${this.queueTimeout}ms`)
```

**After:**
```typescript
throw new Error(
    `Connection pool timeout after ${this.queueTimeout}ms. ` +
    `The API may be slow or unresponsive. ` +
    `Try: 1) Reduce --max-concurrent-requests, ` +
    `2) Check network connection, ` +
    `3) Verify API endpoint is accessible`
)
```

---

### 📝 Example: cli_task_monitor.ts

**Before:**
```typescript
console.error("Error processing message:", error)
```

**After:**
```typescript
const errorMessage = error instanceof Error ? error.message : String(error)
console.error(
    `Failed to process task message. ` +
    `Error: ${errorMessage}. ` +
    `This may indicate a communication issue with the task. ` +
    `Try restarting the task or checking the task state.`
)
```

---

## 🎯 Quick Win #5: Add JSDoc to Public Methods

### ✅ Focus Areas

1. `cli_diff_provider.ts` - `displayDiff()` method
2. `cli_stream_handler.ts` - All public methods
3. `cli_message_formatter.ts` - All exported functions

### 📝 Example: cli_diff_provider.ts

**Before:**
```typescript
async displayDiff(originalContent: string, newContent: string, filePath: string): Promise<void> {
    const diff = this.generateUnifiedDiff(originalContent, newContent, filePath)
    const stats = this.calculateDiffStats(diff)
    // ...
}
```

**After:**
```typescript
/**
 * Display a formatted diff in the terminal with colors and statistics
 * 
 * Shows file changes with:
 * - Color-coded additions (green) and deletions (red)
 * - Line-by-line diff in unified format
 * - Summary statistics (additions, deletions, total lines)
 * 
 * @param originalContent - Original file content before changes
 * @param newContent - New file content after changes
 * @param filePath - Path to the file (for display in header)
 * 
 * @example
 * ```typescript
 * const diffProvider = new CliDiffViewProvider()
 * await diffProvider.displayDiff(
 *   "const x = 1",
 *   "const x = 2",
 *   "src/example.ts"
 * )
 * // Outputs colored diff to terminal
 * ```
 */
async displayDiff(
    originalContent: string,
    newContent: string,
    filePath: string
): Promise<void> {
    const diff = this.generateUnifiedDiff(originalContent, newContent, filePath)
    const stats = this.calculateDiffStats(diff)
    // ...
}
```

---

### 📝 Example: cli_stream_handler.ts

**Before:**
```typescript
export function getStreamHandler(config?: StreamHandlerConfig): CliStreamHandler {
    if (!globalStreamHandler) {
        globalStreamHandler = new CliStreamHandler(config)
    }
    return globalStreamHandler
}
```

**After:**
```typescript
/**
 * Get or create the global stream handler instance
 * 
 * Uses singleton pattern to ensure only one stream handler exists
 * for managing terminal output streams. Thread-safe for CLI use.
 * 
 * @param config - Optional configuration for stream behavior
 * @param config.throttleMs - Minimum time between updates (default: 100ms)
 * @param config.showPartialContent - Show content while streaming (default: true)
 * @param config.autoExpandThinking - Auto-expand thinking blocks (default: true)
 * @param config.maxPartialLength - Max length for partial display (default: 500)
 * 
 * @returns Global CliStreamHandler instance
 * 
 * @example
 * ```typescript
 * const handler = getStreamHandler({ throttleMs: 50 })
 * handler.startStream("thinking")
 * handler.updateStream("Processing...", true)
 * handler.endStream()
 * ```
 */
export function getStreamHandler(config?: StreamHandlerConfig): CliStreamHandler {
    if (!globalStreamHandler) {
        globalStreamHandler = new CliStreamHandler(config)
    }
    return globalStreamHandler
}
```

---

## 🎯 Quick Win #6: Extract Long Methods

### ✅ Files to Update

1. `index.ts` - `executeTask()` method
2. `index.ts` - `interactiveMode()` method
3. `index.ts` - `main()` function
4. `cli_message_formatter.ts` - `formatThinkingBlock()`

### 📝 Example: index.ts executeTask()

**Before:**
```typescript
async executeTask(prompt: string): Promise<void> {
    console.log("\n" + "=".repeat(80))
    console.log("📝 Task:", prompt)
    console.log("=".repeat(80) + "\n")

    try {
        const controller = this.webviewProvider.controller
        const apiConfig = await this.checkApiConfiguration()
        if (!apiConfig) {
            return
        }

        const { text: processedPrompt, mentions } = await this.mentionsParser.resolveAllMentions(prompt)
        
        if (mentions.length > 0) {
            const formatted = this.mentionsParser.formatResolvedMentions(mentions)
            console.log(formatted)
        }

        let enhancedPrompt = processedPrompt
        for (const mention of mentions) {
            if (mention.content && !mention.error) {
                enhancedPrompt += `\n\nReferenced ${mention.type} (${mention.path}):\n${mention.content}`
            }
        }

        await controller.clearTask()
        console.log("🤖 Starting task execution...\n")
        
        const taskId = await controller.initTask(enhancedPrompt)
        console.log(`✓ Task initialized with ID: ${taskId}\n`)

        if (controller.task) {
            this.taskMonitor.startMonitoring(controller.task)
        }

        await this.waitForTaskCompletion(controller)
        this.taskMonitor.stopMonitoring()
    } catch (error) {
        this.taskMonitor.stopMonitoring()
        console.error("\n❌ Error executing task:", error)
        if (this.options.verbose && error instanceof Error) {
            console.error("Stack trace:", error.stack)
        }
        throw error
    }
}
```

**After:**
```typescript
async executeTask(prompt: string): Promise<void> {
    this.displayTaskHeader(prompt)

    try {
        const controller = this.webviewProvider.controller
        
        // Check API configuration
        const apiConfig = await this.checkApiConfiguration()
        if (!apiConfig) {
            return
        }

        // Process prompt with mentions
        const enhancedPrompt = await this.processPromptWithMentions(prompt)

        // Initialize and monitor task
        await this.initializeAndMonitorTask(controller, enhancedPrompt)
    } catch (error) {
        this.handleTaskError(error)
        throw error
    }
}

/**
 * Display task header with separator
 */
private displayTaskHeader(prompt: string): void {
    console.log("\n" + "=".repeat(80))
    console.log("📝 Task:", prompt)
    console.log("=".repeat(80) + "\n")
}

/**
 * Process prompt and resolve all mentions
 * @returns Enhanced prompt with mention content appended
 */
private async processPromptWithMentions(prompt: string): Promise<string> {
    const { text: processedPrompt, mentions } = 
        await this.mentionsParser.resolveAllMentions(prompt)
    
    // Display resolved mentions
    if (mentions.length > 0) {
        const formatted = this.mentionsParser.formatResolvedMentions(mentions)
        console.log(formatted)
    }

    // Enhance prompt with mention content
    let enhancedPrompt = processedPrompt
    for (const mention of mentions) {
        if (mention.content && !mention.error) {
            enhancedPrompt += 
                `\n\nReferenced ${mention.type} (${mention.path}):\n${mention.content}`
        }
    }

    return enhancedPrompt
}

/**
 * Initialize task and start monitoring
 */
private async initializeAndMonitorTask(
    controller: any,
    enhancedPrompt: string
): Promise<void> {
    await controller.clearTask()
    console.log("🤖 Starting task execution...\n")
    
    const taskId = await controller.initTask(enhancedPrompt)
    console.log(`✓ Task initialized with ID: ${taskId}\n`)

    if (controller.task) {
        this.taskMonitor.startMonitoring(controller.task)
    }

    await this.waitForTaskCompletion(controller)
    this.taskMonitor.stopMonitoring()
}

/**
 * Handle task execution errors
 */
private handleTaskError(error: unknown): void {
    this.taskMonitor.stopMonitoring()
    console.error("\n❌ Error executing task:", error)
    
    if (this.options.verbose && error instanceof Error && error.stack) {
        console.error("Stack trace:", error.stack)
    }
}
```

**Benefits**:
- Each method has a single, clear responsibility
- Easier to test individual pieces
- Better error handling isolation
- More readable and maintainable

---

## 🎯 Implementation Checklist

Use this checklist to track your progress:

### Phase 1: Constants (30 minutes)
- [x] Created `cli_constants.ts` with all constants
- [ ] Updated `cli_task_monitor.ts` to use constants
- [ ] Updated `cli_interaction_handler.ts` to use constants
- [ ] Updated `cli_stream_handler.ts` to use constants
- [ ] Updated `index.ts` to use constants
- [ ] Verified no hardcoded numbers remain

### Phase 2: Colors (15 minutes)
- [x] Created `cli_terminal_colors.ts` with consolidated colors
- [ ] Updated `cli_diff_provider.ts` to use shared colors
- [ ] Updated `cli_message_formatter.ts` to import from shared
- [ ] Updated `cli_stream_handler.ts` to import from shared
- [ ] Updated `cli_logger.ts` to import from shared
- [ ] Removed old COLORS constant from diff_provider

### Phase 3: Type Safety (1 hour)
- [ ] Replaced all `any` types in `cli_diff_provider.ts`
- [ ] Replaced all `any` types in `cli_task_monitor.ts`
- [ ] Replaced all `any` types in `cli_logger.ts`
- [ ] Replaced all `any` types in `cli_progress_manager.ts`
- [ ] Replaced all `any` types in `cli_connection_pool.ts`
- [ ] Used `unknown` where type is truly unknown, then narrowed
- [ ] Fixed `Boolean` → `boolean` (use primitive types)

### Phase 4: Error Messages (1 hour)
- [ ] Updated all error messages to include "what, why, how"
- [ ] Added context (file paths, settings) to error messages
- [ ] Verified all user-facing errors are actionable
- [ ] Consistent error formatting across CLI

### Phase 5: JSDoc (45 minutes)
- [ ] Documented all public methods in `cli_diff_provider.ts`
- [ ] Documented all public methods in `cli_stream_handler.ts`
- [ ] Documented all exported functions in `cli_message_formatter.ts`
- [ ] Documented all public methods in `cli_task_monitor.ts`
- [ ] Added examples to complex methods

### Phase 6: Extract Methods (2 hours)
- [ ] Extracted methods from `executeTask()` in `index.ts`
- [ ] Extracted methods from `interactiveMode()` in `index.ts`
- [ ] Refactored `main()` function in `index.ts`
- [ ] Extracted helper methods in `cli_message_formatter.ts`
- [ ] Verified all methods are < 50 lines
- [ ] Each method has single responsibility

---

## 🧪 Testing Your Changes

After each phase, verify:

1. **Run TypeScript compiler**:
   ```bash
   npm run build
   ```

2. **Run existing tests**:
   ```bash
   npm test
   ```

3. **Manual CLI testing**:
   ```bash
   mariecoder "simple test task"
   ```

4. **Check for regressions**:
   - Colors still work
   - Timeouts behave correctly
   - Error messages are helpful
   - All features work as before

---

## 💡 Tips for Success

1. **One phase at a time**: Complete each phase fully before moving to next
2. **Test incrementally**: Don't accumulate untested changes
3. **Commit frequently**: Small, focused commits make issues easier to track
4. **Use git blame**: See why code was written a certain way before changing
5. **Keep standards**: Follow MarieCoder philosophy throughout

---

*Implementation guide prepared with care for the code that came before. ✨*

