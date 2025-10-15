# Task Completion Message Duplication Fix

**Date**: October 15, 2025  
**Issue**: Message history of the last message per task completion was getting duplicated  
**Status**: Fixed with debug logging (ready for testing)

---

## Problem Identified

When a task completes, the completion message handling was causing duplicate `FULL_SYNC` events to be sent to the webview in rapid succession. This happened because:

1. **First State Update**: A `say("completion_result", ...)` message was created
   - This called `addToClineMessages()` which triggered `postStateToWebview()`
   - Sent a `FULL_SYNC` with the `say` message

2. **Second State Update**: Immediately after, `ask("completion_result", ...)` was called to convert the say to ask
   - This called `updateClineMessage()` which also triggered `postStateToWebview()`
   - Sent another `FULL_SYNC` with the converted `ask` message (same timestamp)

The two rapid `FULL_SYNC` events could cause the webview to render the message twice or appear duplicated in certain scenarios.

---

## Root Cause Analysis

### Flow in `AttemptCompletionHandler.ts` (lines 117-144)

```typescript
// Step 1: Create completion_result say message
const completionMessageTs = await config.callbacks.say("completion_result", result, undefined, undefined, false)
// ↑ This triggers postStateToWebview() → FULL_SYNC #1

// Step 2: Convert to ask message
const { response, text, images, files } = await config.callbacks.ask("completion_result", result, false)
// ↑ This triggers postStateToWebview() → FULL_SYNC #2
```

### Why This Causes Issues

- **Timing**: Both `FULL_SYNC` events happen within milliseconds of each other
- **Streaming Check Bypass**: The streaming timeout check (`STREAMING_TIMEOUT_MS = 2000ms`) in `subscribeToMessageStream.ts` only applies when streaming is active
- **Non-Streaming Completion**: When a task completes without streaming (or after streaming ends), both updates go through
- **Result**: Webview receives the full message array twice in rapid succession

---

## Solution Implemented

### 1. Added `skipPostState` Parameter

**File**: `task_message_service.ts`  
Added an optional `skipPostState` parameter to the `say()` method:

```typescript
async say(
    type: ClineSay,
    text?: string,
    images?: string[],
    files?: string[],
    partial?: boolean,
    skipPostState?: boolean  // NEW PARAMETER
): Promise<number | undefined>
```

**Behavior**:
- When `skipPostState=true`, the method saves the message to disk but **skips** calling `postStateToWebview()`
- This prevents the unnecessary first `FULL_SYNC` event
- The conversion to `ask` will still trigger a `postStateToWebview()`, sending only one `FULL_SYNC`

### 2. Updated AttemptCompletionHandler

**File**: `AttemptCompletionHandler.ts` (lines 135 and 92)

Changed completion_result say calls to use `skipPostState=true`:

```typescript
// Before:
const completionMessageTs = await config.callbacks.say("completion_result", result, undefined, undefined, false)

// After:
const completionMessageTs = await config.callbacks.say("completion_result", result, undefined, undefined, false, true)
//                                                                                                           ↑ skipPostState=true
```

This applies to both cases:
1. Normal completion without command (line 135)
2. Completion with command execution (line 92)

### 3. Updated Interface Definitions

**File**: `TaskConfig.ts` (line 81)

Updated the `TaskCallbacks` interface to include the new parameter:

```typescript
export interface TaskCallbacks {
    say: (type: ClineSay, text?: string, images?: string[], files?: string[], partial?: boolean, skipPostState?: boolean) => Promise<number | undefined>
    // ...
}
```

---

## Debug Logging Added

Extensive debug logging was added to track the message flow:

### AttemptCompletionHandler.ts
- Logs when existing completion_result is found vs. when creating new one
- Logs before and after conversion from say to ask
- Shows message state at key decision points

### task_message_service.ts
- Logs when creating new say messages (partial, non-partial, standard)
- Shows when postStateToWebview is called vs. skipped
- Displays conversion details when say→ask happens

### subscribeToMessageStream.ts
- Logs when FULL_SYNC is sent, skipped due to streaming, or within timeout
- Shows message count and last message details
- Helps verify that duplicate FULL_SYNC events are eliminated

---

## Expected Behavior After Fix

### Before Fix:
```
[DEBUG AttemptCompletion] Creating new completion_result say message
[DEBUG TaskMessageService.say] Creating new non-partial say message: completion_result
[DEBUG TaskMessageService.say] Calling postStateToWebview after adding say message
[DEBUG MessageStream] Sending FULL_SYNC with N messages           ← FIRST SYNC
[DEBUG MessageStream] Last message: { type: 'say', say: 'completion_result', ts: 1234567890 }

[DEBUG AttemptCompletion] Converting completion_result say to ask
[DEBUG TaskMessageService.ask] Converting say to ask, ts: 1234567890
[DEBUG TaskMessageService.ask] Calling postStateToWebview after conversion
[DEBUG MessageStream] Sending FULL_SYNC with N messages           ← SECOND SYNC (DUPLICATE)
[DEBUG MessageStream] Last message: { type: 'ask', ask: 'completion_result', ts: 1234567890 }
```

### After Fix:
```
[DEBUG AttemptCompletion] Creating new completion_result say message (will skip postState)
[DEBUG TaskMessageService.say] Creating new non-partial say message: completion_result skipPostState: true
[DEBUG TaskMessageService.say] Skipping postStateToWebview (will be called after conversion)

[DEBUG AttemptCompletion] Converting completion_result say to ask
[DEBUG TaskMessageService.ask] Converting say to ask, ts: 1234567890
[DEBUG TaskMessageService.ask] Calling postStateToWebview after conversion
[DEBUG MessageStream] Sending FULL_SYNC with N messages           ← SINGLE SYNC
[DEBUG MessageStream] Last message: { type: 'ask', ask: 'completion_result', ts: 1234567890 }
```

---

## Files Modified

1. **src/core/task/services/task_message_service.ts**
   - Added `skipPostState` parameter to `say()` method
   - Conditional logic to skip `postStateToWebview()` when parameter is true
   - Still saves to disk even when skipping webview update
   - Added debug logging

2. **src/core/task/tools/handlers/AttemptCompletionHandler.ts**
   - Pass `skipPostState: true` when creating completion_result say messages (2 locations)
   - Added debug logging for message creation and conversion flow

3. **src/core/task/tools/types/TaskConfig.ts**
   - Updated `TaskCallbacks` interface to include `skipPostState` parameter

4. **src/core/controller/messageStream/subscribeToMessageStream.ts**
   - Added debug logging to track FULL_SYNC events

---

## Testing Recommendations

### Manual Testing

1. **Complete a simple task**
   - Start a task that completes quickly (e.g., "create a hello world function")
   - Check debug logs for FULL_SYNC events
   - Verify only ONE FULL_SYNC is sent after task completion

2. **Complete a task with command**
   - Start a task that includes `attempt_completion` with a command
   - Check debug logs for proper skipPostState behavior
   - Verify no duplicate messages in UI

3. **Complete a task with streaming**
   - Start a longer task that streams completion_result
   - Verify existing streaming path still works correctly
   - Check that conversion from streaming say to ask happens smoothly

4. **Resume a completed task**
   - Complete a task
   - Resume it from history
   - Verify no duplicate completion_result messages appear

### Automated Testing

Consider adding integration tests for:
- `AttemptCompletionHandler` with and without commands
- Verifying `postStateToWebview()` call counts during completion
- Message state consistency after say→ask conversion

---

## Debug Logging Cleanup

The debug logging should be **kept temporarily** for:
- Initial testing and validation
- Monitoring in production for a release cycle
- Troubleshooting any edge cases

After validation, consider:
- Converting `console.log` to proper `Logger.debug()` calls
- Making logging configurable via debug flag
- Reducing verbosity while keeping critical checkpoints

---

## Backwards Compatibility

The fix is **fully backwards compatible**:
- `skipPostState` parameter is optional (defaults to `undefined/false`)
- Existing calls to `say()` without the parameter work exactly as before
- Only the specific completion_result flows are optimized

---

## Related Issues

This fix addresses the root cause of:
- Duplicate message rendering during task completion
- Unnecessary full state syncs causing performance overhead
- Potential race conditions in message state updates

This complements previous fixes:
- **Duplicate Messages Fix** (`docs/DUPLICATE_MESSAGES_FIX_SUMMARY.md`) - Virtuoso key management
- **Streaming Duplicate Fix** (`docs/STREAMING_DUPLICATE_FIX.md`) - Streaming content duplication

---

## Conclusion

The fix eliminates duplicate `FULL_SYNC` events during task completion by:
1. Skipping the unnecessary webview update when creating the intermediate say message
2. Allowing only the final converted ask message to trigger a state update
3. Maintaining full backwards compatibility
4. Adding comprehensive debug logging for validation

**Impact**: Reduces webview updates, improves performance, and eliminates potential duplication in message display.

---

*Documented by: Marie Coder*  
*Review Status: Pending Testing*

