# Infinite Scroll Crash Fix

## Issue Summary

**Problem**: When a streaming file tool call (create/edit file) encounters an error (e.g., permission denied, clineignore blocked), the chat view scrolls infinitely downward until the application crashes.

**Severity**: Critical - causes application crash and data loss

**Affected Operations**:
- File creation (`write_to_file`)
- File editing (`replace_in_file`)
- Any file operation that fails during streaming

## Root Cause Analysis

### The Bug Flow

1. **Initial Partial Block**: AI starts streaming a file operation, creating a partial tool message with `partial=true`
2. **Validation Failure**: Subsequent partial block fails validation (clineignore error, permission error, diff error)
3. **Orphaned Partial Message**: Error message is added, but the partial tool message is **never finalized or removed**
4. **Infinite Loop**: 
   - Message remains with `partial=true`, continuously receiving streaming updates
   - Each update triggers `ResizeObserver` in `ChatRow.tsx`
   - Height change triggers scroll via `handleRowHeightChange`
   - Scroll triggers re-render, which triggers another height change
   - Loop continues until crash

### Technical Details

**Component Chain**:
```
WriteToFileToolHandler.handlePartialBlock
  → validateAndPrepareFileOperation (fails, returns undefined)
  → handlePartialBlock returns early
  → Partial tool message left in messages array with partial=true
  → UI continues receiving partial message updates
  → ChatRow.useSize hook detects height changes
  → useScrollBehavior.handleRowHeightChange triggers scroll
  → Virtuoso re-renders → height changes again → LOOP
```

**Key Files Involved**:
- `src/core/task/tools/handlers/WriteToFileToolHandler.ts` - Server-side tool handler
- `webview-ui/src/components/chat/ChatRow.tsx` - Height tracking
- `webview-ui/src/components/chat/chat-view/hooks/useScrollBehavior.ts` - Scroll behavior
- `webview-ui/src/utils/hooks.ts` - useSize hook with ResizeObserver

## The Fix

### Changes Made

**File**: `src/core/task/tools/handlers/WriteToFileToolHandler.ts`

**Location**: `handlePartialBlock` method, lines 47-52

**Before**:
```typescript
const result = await this.validateAndPrepareFileOperation(config, block, rawRelPath, rawDiff, rawContent)
if (!result) {
    return
}
```

**After**:
```typescript
const result = await this.validateAndPrepareFileOperation(config, block, rawRelPath, rawDiff, rawContent)
if (!result) {
    // Validation failed (e.g., clineignore error, diff error)
    // Remove any partial tool message to prevent infinite scroll loop in UI
    await uiHelpers.removeLastPartialMessageIfExistsWithType("ask", "tool")
    await uiHelpers.removeLastPartialMessageIfExistsWithType("say", "tool")
    return
}
```

### Why This Works

1. **Clean Removal**: When validation fails, we explicitly remove any partial tool messages that may have been created in previous streaming iterations
2. **Prevents Orphans**: Ensures no messages are left in `partial=true` state after errors
3. **Stops Update Loop**: Without a partial message, streaming updates stop triggering UI re-renders
4. **Maintains Error Display**: The error messages (clineignore_error, diff_error) are still properly displayed to the user

## Error Scenarios Covered

This fix handles all validation failure cases in `validateAndPrepareFileOperation`:

### 1. Clineignore Errors (lines 323-342)
```typescript
if (!accessValidation.ok) {
    await config.callbacks.say("clineignore_error", resolvedPath)
    // ... error handling
    return // undefined
}
```

### 2. Diff Construction Errors (lines 377-410)
```typescript
try {
    newContent = await constructNewFileContent(...)
} catch (error) {
    await config.callbacks.say("diff_error", relPath)
    // ... error handling
    return // undefined
}
```

### 3. Permission/Access Errors
Any other validation failure that causes early return with `undefined`

## Testing Recommendations

### Manual Testing

1. **Clineignore Error Test**:
   - Add a path pattern to `.clineignore`
   - Ask AI to create/edit a file matching that pattern
   - Verify: Error message shows, no infinite scroll, no crash

2. **Diff Error Test**:
   - Ask AI to edit a file with a search pattern that doesn't exist
   - Verify: diff_error shows, no infinite scroll, no crash

3. **Permission Error Test**:
   - Create a read-only file
   - Ask AI to edit it
   - Verify: Error shows, no infinite scroll, no crash

### Automated Testing

```typescript
describe('WriteToFileToolHandler.handlePartialBlock', () => {
    it('should remove partial messages when validation fails', async () => {
        // Setup: Create partial tool message
        // Simulate: Validation failure
        // Assert: Partial message is removed
        // Assert: Error message exists
    })
})
```

## Related Issues

### Similar Patterns to Check

Other tool handlers may have similar issues. Review:
- `ReadFileToolHandler.ts`
- `SearchFilesToolHandler.ts`
- `ExecuteCommandToolHandler.ts`
- `BrowserToolHandler.ts`
- `UseMcpToolHandler.ts`

### Prevention Strategy

**Pattern to Follow**:
```typescript
async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
    // Early validation
    const result = await validateOperation(...)
    if (!result) {
        // ALWAYS clean up partial messages on error
        await uiHelpers.removeLastPartialMessageIfExistsWithType("ask", <message_type>)
        await uiHelpers.removeLastPartialMessageIfExistsWithType("say", <message_type>)
        return
    }
    
    // Continue with successful operation
}
```

## Impact

### Before Fix
- ❌ Application crashes on file operation errors during streaming
- ❌ User loses context and work in progress
- ❌ Poor user experience
- ❌ Difficult to debug (appears as UI performance issue)

### After Fix
- ✅ Graceful error handling during streaming
- ✅ Error messages display correctly
- ✅ No infinite scroll or crashes
- ✅ Stable application behavior
- ✅ Better user experience

## Future Improvements

1. **UI-Side Safety Net**: Add height change throttling in `ChatRow.tsx` to detect runaway loops
2. **Monitoring**: Add telemetry to track partial message cleanup events
3. **Validation**: Add automated tests for all error paths in tool handlers
4. **Documentation**: Update tool handler development guide with this pattern

## Commit Message Template

```
fix: prevent infinite scroll crash when file operations error during streaming

When a streaming file tool call encounters a validation error (clineignore, 
permission denied, diff error), the partial tool message was left in the 
messages array with partial=true. This caused continuous UI updates leading 
to an infinite scroll loop and crash.

Fix: Remove partial tool messages when validation fails in handlePartialBlock.

Affected operations:
- File creation (write_to_file)
- File editing (replace_in_file)

Root cause: Orphaned partial messages receiving streaming updates
Solution: Explicit cleanup via removeLastPartialMessageIfExistsWithType

Fixes infinite scroll crash reported in user feedback.
```

---

**Date**: October 15, 2025  
**Author**: AI Analysis  
**Status**: Fixed  
**Priority**: Critical

