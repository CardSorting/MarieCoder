# CLI Robustness Improvements

## Overview
This document details the improvements made to the MarieCoder CLI to enhance robustness, error handling, and prevent common edge cases.

## Changes Made

### 1. Terminal Manager (`src/cli/cli_terminal_manager.ts`)

#### Created New CLI-Specific Terminal Manager
- **Issue**: Original code was using VSCode-specific terminal APIs that don't exist in Node.js CLI environment
- **Solution**: Created `CliTerminalManager` using Node.js `child_process` module

#### Improvements:
- ✅ **Better error handling**: All stream operations wrapped in try-catch blocks
- ✅ **Signal handling**: Properly handles process termination by signals (SIGTERM, SIGKILL)
- ✅ **Spawn validation**: Checks that process spawned successfully before proceeding
- ✅ **Graceful shutdown**: Tries SIGTERM first, then SIGKILL after timeout when disposing terminals
- ✅ **Error recovery**: Handles encoding errors in stdout/stderr streams gracefully
- ✅ **Process cleanup**: Ensures all child processes are killed on exit

```typescript
// Example: Graceful process termination
disposeAll(): void {
  for (const terminal of this.terminals.values()) {
    if (terminal.process) {
      // Try graceful termination first
      terminal.process.kill("SIGTERM")
      
      // Force kill after timeout if still running
      setTimeout(() => {
        if (terminal.process && !terminal.process.killed) {
          terminal.process.kill("SIGKILL")
        }
      }, 1000)
    }
  }
}
```

### 2. Diff Service (`src/cli/cli_host_bridge.ts`)

#### Enhanced Error Handling:
- ✅ **Line number validation**: Ensures line ranges are valid before replacing text
- ✅ **Directory creation**: Creates parent directories before saving files
- ✅ **Error context**: All errors include helpful context about what failed
- ✅ **Resource cleanup**: Diffs are automatically cleaned up after successful save
- ✅ **Boundary checking**: Validates start/end lines against file length

```typescript
// Example: Line validation
if (params.startLine < 1 || params.startLine > lines.length + 1) {
  throw new Error(`Invalid start line: ${params.startLine} (file has ${lines.length} lines)`)
}
```

### 3. Main CLI (`src/cli/index.ts`)

#### Signal Handling & Cleanup:
- ✅ **SIGINT/SIGTERM handling**: Graceful shutdown on interrupt signals
- ✅ **Uncaught exception handling**: Catches and logs uncaught errors before exit
- ✅ **Unhandled rejection handling**: Prevents silent promise failures
- ✅ **Single cleanup execution**: Prevents cleanup from running multiple times
- ✅ **Proper exit codes**: Uses standard exit codes (130 for SIGINT, 143 for SIGTERM)
- ✅ **Resource cleanup order**: Stops monitoring → closes tasks → cleans up managers → disposes context

```typescript
// Example: Comprehensive signal handling
process.on("SIGINT", () => {
  doCleanup("SIGINT")
  process.exit(130) // Standard exit code for SIGINT
})

process.on("uncaughtException", (error) => {
  console.error("\n❌ Uncaught exception:", error)
  doCleanup()
  process.exit(1)
})
```

### 4. Task Monitor (`src/cli/cli_task_monitor.ts`)

#### Timeout Protection:
- ✅ **Approval timeout**: 5-minute timeout prevents indefinite hanging on approval requests
- ✅ **Message validation**: Validates message structure before processing
- ✅ **Error isolation**: Individual message errors don't stop monitoring loop
- ✅ **Better file edit display**: Parses and displays file edits with proper formatting
- ✅ **Content truncation**: Long diffs are truncated to 50 lines for readability

```typescript
// Example: Timeout protection
const timeoutId = setTimeout(() => {
  console.log("\n⚠️  Approval timeout - auto-rejecting after 5 minutes")
  if (this.task) {
    this.task.handleWebviewAskResponse("noButtonClicked").catch(() => {})
  }
}, 5 * 60 * 1000)
```

### 5. Interaction Handler (`src/cli/cli_interaction_handler.ts`)

#### Input Timeout Protection:
- ✅ **Configurable timeouts**: Default 5-minute timeout for all user input
- ✅ **Graceful timeout handling**: Uses default values when timeout occurs
- ✅ **Double-answer protection**: Prevents race conditions between timeout and user input
- ✅ **Cleanup on completion**: Properly clears timeouts after receiving input

```typescript
// Example: Protected user input
async askApproval(message: string, defaultYes = false, timeoutMs = 300000): Promise<boolean> {
  let timeout: NodeJS.Timeout | null = null
  let answered = false

  if (timeoutMs > 0) {
    timeout = setTimeout(() => {
      if (!answered) {
        answered = true
        console.log("\n⏱️  Timeout - using default response")
        resolve(defaultYes)
      }
    }, timeoutMs)
  }
  // ... rest of implementation
}
```

## Edge Cases Addressed

### 1. **Process Management**
- ✅ Child processes that fail to spawn
- ✅ Processes terminated by signals
- ✅ Zombie processes after parent exits
- ✅ Encoding errors in stdout/stderr

### 2. **File Operations**
- ✅ Non-existent directories when saving files
- ✅ Invalid line numbers in diffs
- ✅ Permission errors when reading/writing files
- ✅ Concurrent diff operations

### 3. **User Input**
- ✅ User not responding to prompts
- ✅ Malformed JSON in tool messages
- ✅ Empty or whitespace-only inputs
- ✅ Interrupted readline operations

### 4. **Task Management**
- ✅ Tasks completing while waiting for approval
- ✅ Multiple approval requests queued
- ✅ Invalid message structures
- ✅ Concurrent message processing

### 5. **Resource Cleanup**
- ✅ Multiple cleanup attempts
- ✅ Cleanup with partially initialized components
- ✅ Cleanup during active operations
- ✅ Memory leaks from event listeners

## Testing Recommendations

### Manual Testing:
1. **Signal handling**: Press Ctrl+C during various operations
2. **Timeout handling**: Don't respond to approval prompts for 5+ minutes
3. **Error recovery**: Try editing non-existent files, invalid paths
4. **Long-running commands**: Test with commands that take >30 seconds
5. **Multiple operations**: Run multiple file edits in sequence

### Edge Case Testing:
1. **File permissions**: Try editing files in protected directories
2. **Invalid paths**: Use paths with special characters, very long names
3. **Concurrent operations**: Start multiple tasks simultaneously
4. **Resource exhaustion**: Run many commands to test cleanup
5. **Network issues**: Test with slow/failing API connections

## Performance Considerations

- Timeouts prevent resource leaks from hanging operations
- Graceful shutdown (SIGTERM → SIGKILL) prevents orphaned processes
- Cleanup order ensures resources are freed properly
- Error isolation prevents cascade failures

## Backward Compatibility

All changes are backward compatible:
- Existing CLI commands work unchanged
- Optional timeout parameters have sensible defaults
- Error messages are more informative but don't break parsing
- Exit codes follow standard conventions

## Advanced Features Implemented

### 1. Structured Logging System (`src/cli/cli_logger.ts`)

#### Features:
- ✅ **Multiple log levels**: DEBUG, INFO, WARN, ERROR, SILENT
- ✅ **Colorized output**: Different colors for different log levels
- ✅ **Timestamps**: Optional timestamp support
- ✅ **Child loggers**: Create loggers with prefixes
- ✅ **Grouping**: Group related log messages
- ✅ **Table output**: Display data in table format

```typescript
import { getLogger, LogLevel } from "./cli_logger"

const logger = getLogger({ level: LogLevel.INFO })
logger.info("Application started")
logger.warn("This is a warning")
logger.error("Error occurred", error)
logger.success("Task completed successfully")
```

### 2. Progress Bar System (`src/cli/cli_progress_manager.ts`)

#### Features:
- ✅ **Visual progress bars**: Show progress for long operations
- ✅ **ETA calculation**: Estimated time to completion
- ✅ **Multiple bars**: Manage multiple progress bars simultaneously
- ✅ **Spinners**: For indeterminate operations
- ✅ **Throttling**: Prevents performance issues with frequent updates

```typescript
import { getProgressManager } from "./cli_progress_manager"

const progressManager = getProgressManager()
const bar = progressManager.create("download", {
	total: 100,
	label: "Downloading files",
	showEta: true,
})

bar.update(50) // Update progress
bar.complete() // Mark as complete

// For indeterminate operations
const spinner = progressManager.createSpinner("Processing...")
spinner.start()
spinner.succeed("Processing complete")
```

### 3. Cancellation Token System (`src/cli/cli_cancellation.ts`)

#### Features:
- ✅ **Graceful cancellation**: Cancel long-running operations
- ✅ **Token propagation**: Pass tokens through async operations
- ✅ **Timeout support**: Automatic cancellation after timeout
- ✅ **Retry with cancellation**: Retry operations with cancellation support
- ✅ **Parallel operations**: Cancel all parallel operations

```typescript
import { CancellationTokenSource, withTimeout } from "./cli_cancellation"

const source = new CancellationTokenSource()

// Execute with timeout
const result = await withTimeout(
	async (token) => {
		token.throwIfCancellationRequested()
		return await longOperation()
	},
	30000, // 30 second timeout
	"Operation timed out"
)

// Manual cancellation
source.cancel()
```

### 4. Connection Pool & Rate Limiting (`src/cli/cli_connection_pool.ts`)

#### Features:
- ✅ **Connection pooling**: Limit concurrent API requests
- ✅ **Rate limiting**: Enforce requests per second/minute
- ✅ **Queue management**: Queue requests when pool is full
- ✅ **Statistics**: Monitor pool utilization and rate limits
- ✅ **Multiple pools**: Create named pools for different services

```typescript
import { getApiConnectionPoolManager } from "./cli_connection_pool"

const poolManager = getApiConnectionPoolManager()

// Create a custom pool
poolManager.createPool("api", {
	maxConnections: 10,
	requestsPerMinute: 60,
	requestsPerSecond: 10,
})

// Execute request with pooling
const result = await poolManager.execute(
	async () => {
		return await apiCall()
	},
	"api", // Pool name
	cancellationToken
)

// Get statistics
const stats = poolManager.getAllStats()
console.log(`Active: ${stats.api.activeConnections}/${stats.api.maxConnections}`)
```

## CLI Command-Line Options

New options added for advanced features:

```bash
# Set log level
mariecoder --log-level DEBUG "Your task"

# Configure connection pool
mariecoder --max-concurrent-requests 5 --requests-per-minute 30 "Your task"

# Combine with existing options
mariecoder --verbose --log-level DEBUG --max-concurrent-requests 10 "Your task"
```

## Integration Examples

### Example 1: Progress Bar for File Processing

```typescript
const progressManager = getProgressManager()
const files = await getFilesToProcess()
const bar = progressManager.create("files", {
	total: files.length,
	label: "Processing files",
	showEta: true,
})

for (const file of files) {
	await processFile(file)
	bar.increment()
}

bar.complete()
```

### Example 2: Cancellable API Calls with Rate Limiting

```typescript
const source = new CancellationTokenSource()
const poolManager = getApiConnectionPoolManager()

try {
	const result = await poolManager.execute(
		async () => {
			return await withTimeout(
				async (token) => {
					return await apiCall(token)
				},
				30000,
				"API call timed out"
			)
		},
		"api",
		source.token
	)
} catch (error) {
	if (isCancellationError(error)) {
		logger.warn("Operation was cancelled")
	} else {
		logger.error("API call failed", error)
	}
}
```

### Example 3: Structured Logging in Operations

```typescript
const logger = getLogger({ level: LogLevel.DEBUG })
logger.info("Starting task")

logger.group("Phase 1: Analysis")
logger.debug("Analyzing codebase...")
logger.info("Found 42 files")
logger.groupEnd()

logger.group("Phase 2: Processing")
logger.debug("Processing files...")
logger.success("Processed all files")
logger.groupEnd()
```

### 5. Request Deduplication (`src/cli/cli_request_deduplicator.ts`)

#### Features:
- ✅ **Concurrent request deduplication**: Identical concurrent requests share the same promise
- ✅ **Result caching**: Cache successful results for configurable TTL
- ✅ **Cancellation support**: Respect cancellation tokens
- ✅ **Custom key generation**: Flexible request identification
- ✅ **Automatic cleanup**: Remove expired entries periodically
- ✅ **Statistics tracking**: Monitor cache hits and pending requests

```typescript
import { getDeduplicationManager } from "./cli_request_deduplicator"

const deduplicationManager = getDeduplicationManager()

// Execute with deduplication
const result = await deduplicationManager.execute(
	"api:getUserData:123", // Unique request key
	async () => {
		return await fetchUserData(userId)
	},
	[], // Arguments
	"api", // Deduplicator name (optional)
	cancellationToken
)

// Get statistics
const stats = deduplicationManager.getAllStats()
console.log(`Cache hit rate: ${stats.api.cacheHitRate}%`)
```

**Integration with Connection Pool**:
```typescript
// Connection pool with deduplication enabled (default)
poolManager.createPool("api", {
	maxConnections: 10,
	requestsPerMinute: 60,
	enableDeduplication: true,
	deduplicationTtl: 60000, // 1 minute cache
})

// Execute with automatic deduplication
const result = await poolManager.execute(
	async () => await apiCall(),
	"api", // Pool name
	cancellationToken,
	"api:endpoint:param" // Request key for deduplication
)
```

## Future Improvements

Potential areas for further enhancement:
- [ ] Distributed tracing for multi-step operations
- [ ] Metrics collection and reporting
- [ ] Advanced retry strategies (exponential backoff with jitter)

## Summary

These improvements make the CLI significantly more robust by:
1. **Preventing hangs**: Timeouts on all blocking operations
2. **Better error handling**: Comprehensive error catching with context
3. **Graceful shutdown**: Proper cleanup on all exit paths
4. **Resource safety**: No leaked processes or file handles
5. **User experience**: Clear error messages and progress indication

The CLI should now handle edge cases gracefully and provide a stable experience even in error conditions.

