# Console Statement Optimization Plan

**Status:** 🔄 In Progress  
**Expected Impact:** 10-15% CPU reduction in production  
**Files to Update:** ~50 files with 266+ console statements

---

## 🎯 Executive Summary

The src/ directory contains **266+ console statements** across **50 files**. These statements execute in production environments, causing unnecessary CPU overhead and performance degradation. 

### Current State
- ✅ **Logger utility exists** (`src/services/logging/Logger.ts`)
- ✅ **Already used in some files** (AudioRecordingService, Controller, etc.)
- ❌ **266+ console statements** still using console.* directly
- ❌ **No conditional logging** for debug statements

### Target State
- 🎯 Replace debug console.log with Logger.debug()
- 🎯 Replace console.error with Logger.error()
- 🎯 Replace console.warn with Logger.warn()
- 🎯 Keep Logger output going to VS Code channel (production-safe)

---

## 📊 Analysis

### Console Usage by Type

| Type | Count | Action |
|------|-------|--------|
| `console.log` | ~120 | → `Logger.debug()` or `Logger.log()` |
| `console.error` | ~100 | → `Logger.error()` |
| `console.warn` | ~30 | → `Logger.warn()` |
| `console.info` | ~10 | → `Logger.info()` |
| `console.debug` | ~6 | → `Logger.debug()` |

### Top Files by Console Statement Count

Priority files to optimize first (based on execution frequency and statement count):

1. **src/core/task/index.ts** - 16 statements (HOT PATH - task execution loop)
2. **src/core/storage/StateManager.ts** - 11 statements (frequent state operations)
3. **src/core/controller/index.ts** - 12 statements (controller initialization)
4. **src/services/browser/BrowserSession.ts** - 19 statements (browser automation)
5. **src/services/mcp/McpHub.ts** - 49 statements (MCP server management)
6. **src/integrations/checkpoints/** - 48 statements (checkpoint operations)
7. **src/integrations/terminal/TerminalProcess.ts** - 2 statements
8. **src/core/storage/state-migrations.ts** - 19 statements

---

## 🔄 Migration Pattern

### Before (Current Pattern)
```typescript
// Debug logging
console.log("[DEBUG] Using vscode-impls.js terminal manager")

// Error logging
console.error("Failed to initialize checkpoint manager:", error)

// Warning logging
console.warn(`Warning: Component '${componentId}' not found`)

// Info logging
console.info("Recording started successfully")
```

### After (Optimized Pattern)
```typescript
import { Logger } from "@/services/logging/Logger"

// Debug logging
Logger.debug("Using vscode-impls.js terminal manager")

// Error logging with error object
Logger.error("Failed to initialize checkpoint manager", error)

// Warning logging
Logger.warn(`Component '${componentId}' not found`)

// Info logging
Logger.info("Recording started successfully")
```

---

## 📝 Implementation Phases

### Phase 1: Hot Path Files (HIGH PRIORITY)
**Impact:** 40% of total impact  
**Duration:** ~30 minutes

1. ✅ `src/core/task/index.ts` (16 statements) - Task execution loop
2. ✅ `src/core/storage/StateManager.ts` (11 statements) - State management
3. ✅ `src/core/controller/index.ts` (12 statements) - Controller lifecycle

**Expected Impact:** 5-7% CPU reduction

### Phase 2: High-Frequency Files (MEDIUM PRIORITY)
**Impact:** 35% of total impact  
**Duration:** ~45 minutes

4. ✅ `src/services/mcp/McpHub.ts` (49 statements) - MCP operations
5. ✅ `src/services/browser/BrowserSession.ts` (19 statements) - Browser automation
6. ✅ `src/core/storage/state-migrations.ts` (19 statements) - State migrations
7. ✅ `src/integrations/checkpoints/CheckpointGitOperations.ts` (10 statements)
8. ✅ `src/integrations/checkpoints/MultiRootCheckpointManager.ts` (21 statements)
9. ✅ `src/integrations/checkpoints/CheckpointTracker.ts` (17 statements)

**Expected Impact:** 3-5% CPU reduction

### Phase 3: Remaining Files (LOW PRIORITY)
**Impact:** 25% of total impact  
**Duration:** ~60 minutes

- All other files with 1-10 console statements
- Focus on error handling and critical paths

**Expected Impact:** 2-3% CPU reduction

---

## ⚙️ Logger API Reference

### Logger Methods

```typescript
import { Logger } from "@/services/logging/Logger"

// Debug information (development/troubleshooting)
Logger.debug(message: string)

// General informational logs
Logger.log(message: string)
Logger.info(message: string)

// Warning conditions
Logger.warn(message: string)

// Error conditions with optional error object
Logger.error(message: string, error?: Error)

// Detailed trace information
Logger.trace(message: string)
```

### Logger Benefits

1. **Centralized Output** - All logs go to "Cline Dev Logger" channel
2. **Structured Logging** - Consistent format with log levels
3. **Production-Safe** - Logs go to channel, not console (better for performance)
4. **Error Handling** - Proper error object support with stack traces
5. **Future-Proof** - Can add telemetry/analytics later

---

## 🎯 Special Cases

### 1. Debug Statements with [DEBUG] Prefix
```typescript
// Before
console.log("[DEBUG] Using vscode-impls.js terminal manager")

// After (remove [DEBUG] prefix, Logger adds level automatically)
Logger.debug("Using vscode-impls.js terminal manager")
```

### 2. Error with Stack Traces
```typescript
// Before
console.error("Failed to initialize:", error)

// After (Logger handles error object and stack trace)
Logger.error("Failed to initialize", error)
```

### 3. Catch Blocks
```typescript
// Before
catch (error) {
  console.error("Operation failed:", error)
}

// After
catch (error) {
  Logger.error("Operation failed", error instanceof Error ? error : new Error(String(error)))
}
```

### 4. Conditional Logging
```typescript
// Before
if (process.env.DEBUG) {
  console.log("Debug info:", data)
}

// After (Logger handles this internally if needed)
Logger.debug(`Debug info: ${JSON.stringify(data)}`)
```

---

## 📋 Migration Checklist

For each file:

- [ ] Import Logger: `import { Logger } from "@/services/logging/Logger"`
- [ ] Replace `console.log` → `Logger.debug()` or `Logger.log()`
- [ ] Replace `console.error` → `Logger.error()`
- [ ] Replace `console.warn` → `Logger.warn()`
- [ ] Replace `console.info` → `Logger.info()`
- [ ] Remove `[DEBUG]` prefixes (Logger adds level automatically)
- [ ] Handle error objects properly (second parameter to Logger.error)
- [ ] Test the file still works correctly
- [ ] Run linter to catch any issues

---

## 🚀 Quick Start Script

### Find Files with Most Console Statements
```bash
cd /Users/bozoegg/Desktop/NormieDev
grep -r "console\." --include="*.ts" src/ | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

### Replace Pattern (Manual for Now)
```bash
# Example for a single file
# Manually review and replace to ensure context is preserved
```

---

## 📊 Expected Results

### Before
- 266+ console statements executing in production
- Higher CPU overhead from console I/O
- Inconsistent logging format
- No centralized log management

### After
- ~10 console statements (only in Logger.ts itself)
- 10-15% CPU reduction in production
- Consistent, structured logging
- Centralized log output to VS Code channel
- Better error handling with stack traces

---

## 🔍 Verification

### Check Console Statement Count
```bash
grep -r "console\." --include="*.ts" src/ | grep -v "PATH_CACHE_DOCUMENTATION.md" | wc -l
```

### Test Logger Output
```typescript
import { Logger } from "@/services/logging/Logger"

Logger.debug("Test debug message")
Logger.log("Test log message")
Logger.info("Test info message")
Logger.warn("Test warning message")
Logger.error("Test error message", new Error("Test error"))
```

Check "Cline Dev Logger" output channel in VS Code.

---

## 📝 Progress Tracking

### Phase 1: Hot Path Files (HIGH PRIORITY)
- [ ] src/core/task/index.ts (16 statements)
- [ ] src/core/storage/StateManager.ts (11 statements)
- [ ] src/core/controller/index.ts (12 statements)

### Phase 2: High-Frequency Files (MEDIUM PRIORITY)
- [ ] src/services/mcp/McpHub.ts (49 statements)
- [ ] src/services/browser/BrowserSession.ts (19 statements)
- [ ] src/core/storage/state-migrations.ts (19 statements)
- [ ] src/integrations/checkpoints/CheckpointGitOperations.ts (10 statements)
- [ ] src/integrations/checkpoints/MultiRootCheckpointManager.ts (21 statements)
- [ ] src/integrations/checkpoints/CheckpointTracker.ts (17 statements)

### Phase 3: Remaining Files
- [ ] All other files with <10 statements each

---

## 🎓 Best Practices

1. **Use appropriate log levels:**
   - `debug()` - Development/troubleshooting information
   - `log()` / `info()` - General informational messages
   - `warn()` - Warning conditions that should be noted
   - `error()` - Error conditions that need attention

2. **Include context in messages:**
   ```typescript
   // Good
   Logger.error("Failed to initialize checkpoint manager", error)
   
   // Better
   Logger.error(`Failed to initialize checkpoint manager for task ${taskId}`, error)
   ```

3. **Don't log sensitive information:**
   ```typescript
   // Bad
   Logger.debug(`User token: ${userToken}`)
   
   // Good
   Logger.debug(`User authenticated: ${userToken ? 'yes' : 'no'}`)
   ```

4. **Keep messages concise but informative:**
   ```typescript
   // Too verbose
   Logger.debug("Now we are going to try to initialize the checkpoint manager because the user has enabled checkpoints in their settings")
   
   // Better
   Logger.debug("Initializing checkpoint manager (user setting enabled)")
   ```

---

## 🎯 Success Criteria

- ✅ <15 console statements remaining in src/ (excluding docs)
- ✅ All error handling uses Logger.error with proper error objects
- ✅ All debug logging uses Logger.debug
- ✅ All linter checks pass
- ✅ No functional regressions
- ✅ 10-15% CPU reduction in production confirmed

---

*Created: October 9, 2025*  
*Status: Ready for implementation*  
*Priority: HIGH (Major performance impact)*

