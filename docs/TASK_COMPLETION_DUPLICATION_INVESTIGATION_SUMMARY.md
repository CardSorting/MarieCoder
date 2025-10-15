# Task Completion Message Duplication - Investigation Summary

**Date**: October 15, 2025  
**Status**: ✅ Fixed (with debug logging for validation)

---

## Issue

Message history of the last message per task completion was getting duplicated.

---

## Investigation Findings

### Root Cause

The `AttemptCompletionHandler` was causing **two rapid `FULL_SYNC` events** when a task completes:

1. **Event 1**: Creating a `say("completion_result")` message
   - Calls `postStateToWebview()` → Sends `FULL_SYNC` #1

2. **Event 2**: Converting the say to `ask("completion_result")`
   - Calls `postStateToWebview()` → Sends `FULL_SYNC` #2

**Result**: The webview receives the full message array twice within milliseconds.

### Why It Bypassed Existing Safeguards

The `subscribeToMessageStream.ts` has a timeout check to prevent FULL_SYNC during streaming:
```typescript
if (timeSinceLastPartial < STREAMING_TIMEOUT_MS) {
    return  // Skip FULL_SYNC
}
```

However, this only works during active streaming. For non-streaming completions (or after streaming ends), both updates went through.

---

## Solution

### Added `skipPostState` Parameter

Modified the `say()` method to accept an optional `skipPostState` parameter that:
- Saves the message to disk
- **Skips** calling `postStateToWebview()`
- Allows the subsequent conversion to trigger the only necessary state update

### Changes Made

1. **task_message_service.ts**: Added `skipPostState` parameter to `say()` method
2. **TaskConfig.ts**: Updated `TaskCallbacks` interface
3. **AttemptCompletionHandler.ts**: Pass `skipPostState: true` when creating completion messages that will be immediately converted

### Code Change Example

```typescript
// Before:
await config.callbacks.say("completion_result", result, undefined, undefined, false)
// ↓ Triggers postStateToWebview() → FULL_SYNC

// After:
await config.callbacks.say("completion_result", result, undefined, undefined, false, true)
//                                                                              ↑ skipPostState
// ↓ Skips postStateToWebview(), only saves to disk
```

Then the conversion still triggers one state update:
```typescript
await config.callbacks.ask("completion_result", result, false)
// ↓ Triggers postStateToWebview() → FULL_SYNC (the only one needed)
```

---

## Debug Logging

Added comprehensive logging to validate the fix:

### AttemptCompletionHandler
- Shows when creating vs. finding existing completion messages
- Logs conversion from say to ask

### TaskMessageService  
- Shows when postStateToWebview is called vs. skipped
- Displays message creation details

### MessageStreamService
- Logs FULL_SYNC events with message details
- Shows when syncs are skipped due to streaming/timeout

---

## Testing the Fix

To verify the fix works:

1. **Complete a simple task** and check console for:
   ```
   [DEBUG AttemptCompletion] Creating new completion_result say message (will skip postState)
   [DEBUG TaskMessageService.say] Skipping postStateToWebview (will be called after conversion)
   [DEBUG AttemptCompletion] Converting completion_result say to ask
   [DEBUG MessageStream] Sending FULL_SYNC with N messages  ← Should see ONLY ONE
   ```

2. **Before the fix**, you would see:
   ```
   [DEBUG MessageStream] Sending FULL_SYNC ...  ← First sync (say message)
   [DEBUG MessageStream] Sending FULL_SYNC ...  ← Second sync (ask message) - DUPLICATE!
   ```

3. **After the fix**, you should see:
   ```
   [DEBUG MessageStream] Sending FULL_SYNC ...  ← Only one sync (ask message)
   ```

---

## Files Modified

| File | Changes |
|------|---------|
| `task_message_service.ts` | Added `skipPostState` parameter, conditional postStateToWebview logic, debug logs |
| `AttemptCompletionHandler.ts` | Pass `skipPostState: true` for completion messages, added debug logs |
| `TaskConfig.ts` | Updated TaskCallbacks interface signature |
| `subscribeToMessageStream.ts` | Added debug logging |

---

## Impact

✅ **Eliminates duplicate FULL_SYNC events** during task completion  
✅ **Reduces unnecessary webview updates** (better performance)  
✅ **Prevents potential message duplication** in the UI  
✅ **Fully backwards compatible** (parameter is optional)  
✅ **Well-documented** with debug logging for validation

---

## Next Steps

1. ✅ Implementation complete
2. ⏳ **Testing**: Manually test task completion scenarios
3. ⏳ **Validation**: Monitor debug logs to confirm single FULL_SYNC
4. ⏳ **Cleanup**: After validation, decide whether to keep or reduce debug logging
5. ⏳ **Documentation**: Update user-facing docs if needed

---

## Notes

- Debug logging is intentionally verbose for initial validation
- The fix is conservative: only affects completion_result messages that will be converted
- All other say/ask flows remain unchanged
- The timestamp is preserved during conversion (no impact on React keys)

---

*Investigation and fix by: Marie Coder*  
*For detailed technical documentation, see: `TASK_COMPLETION_DUPLICATION_FIX.md`*

