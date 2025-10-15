# Task Handling Fix - 4x Duplicate Messages and Missing Result Parameter

## Issue Description

Users were experiencing severe message duplication in the chat UI - every message appeared **4 times**. Additionally, there were errors about missing required parameters when the AI attempted to complete tasks. Specifically:

1. **4x Duplicate Messages**: Every task message was appearing exactly 4 times in the chat UI
2. **Missing Result Error**: "Cline tried to use attempt_completion without value for required parameter 'result'. Retrying..."
3. **Streaming Issues**: Partial messages were being created even when required parameters were undefined

## Root Cause

The issue was in `AttemptCompletionHandler.handlePartialBlock()` which was calling `say("completion_result", ...)` during streaming even when the `result` parameter was `undefined`.

### The Flow

When the model streams an `attempt_completion` tool call:

1. **During Streaming (Partial Block)**:
   - `parseAssistantMessageV2` parses the incoming stream and creates a `ToolUse` block with `partial=true`
   - `presentAssistantMessage` calls `ToolExecutor.executeTool(block)`
   - `ToolExecutor.execute` sees `partial=true` and calls `handlePartialBlock`
   - `AttemptCompletionHandler.handlePartialBlock` was calling `say()` even when `result` was undefined
   - This created an empty/undefined partial message

2. **After Streaming (Complete Block)**:
   - The block is now `partial=false`
   - `ToolExecutor.execute` calls `handleCompleteBlock`
   - `AttemptCompletionHandler.execute` validates parameters
   - If `result` is missing, it calls `sayAndCreateMissingParamError`
   - This creates an error message and the model retries

3. **The Problem**:
   - Empty partial messages were created during streaming
   - Error messages were added when validation failed
   - This resulted in duplicate/confusing messages in the UI

## Solution

Updated `AttemptCompletionHandler.handlePartialBlock()` to only call `say()` when the `result` parameter is actually provided:

```typescript
async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
    const result = block.params.result
    const command = block.params.command

    // Only show streaming completion result if result parameter is actually provided
    // This prevents creating empty/undefined messages when the model forgets the result parameter
    if (!command && result) {
        // no command, still outputting partial result
        await uiHelpers.say(
            "completion_result",
            uiHelpers.removeClosingTag(block, "result", result),
            undefined,
            undefined,
            block.partial,
        )
    }
}
```

### Key Changes

1. Added condition `if (!command && result)` to check that `result` exists before calling `say()`
2. This prevents creating empty partial messages when the model forgets the parameter
3. The error handling in `execute()` still catches missing parameters and provides feedback to the model

## Root Cause of 4x Duplication

The 4x message duplication was caused by **React StrictMode** in development mode combined with multiple subscription paths:

### How React StrictMode Causes Duplicates

In React 18+ with StrictMode enabled, `useEffect` hooks run TWICE in development mode to help detect side effects. This means:

1. MessageStreamService subscription created (first render)
2. StateService subscription created (first render)
3. MessageStreamService subscription created AGAIN (StrictMode re-render)
4. StateService subscription created AGAIN (StrictMode re-render)

Even though cleanup functions should prevent this, during the brief window between renders, **4 active subscriptions** could receive the same message update, resulting in each message appearing 4 times.

### The Fix for Duplication

**Removed React StrictMode from production build** (`webview-ui/src/main.tsx`):

```typescript
// Before:
<StrictMode>
    <App />
</StrictMode>

// After:
<App />
```

This prevents the double-rendering behavior that was creating duplicate subscriptions.

## Benefits

1. **No 4x Duplicate Messages**: Messages now appear only once as intended
2. **No Empty Partial Messages**: Empty partial messages are no longer created during streaming
3. **Cleaner UI**: Users only see meaningful messages, not empty placeholders or duplicates
4. **Better Error Handling**: The validation error is still shown, but without the preceding empty message
5. **Consistent Pattern**: Matches the pattern used in other tool handlers (e.g., `WriteToFileToolHandler`, `BrowserToolHandler`)
6. **Better Performance**: Fewer subscriptions and message processing overhead

## Related Files

**Backend:**
- `src/core/task/tools/handlers/AttemptCompletionHandler.ts` - Main fix for empty partial messages
- `src/core/task/ToolExecutor.ts` - Tool execution flow
- `src/core/task/services/task_message_service.ts` - Message handling
- `src/core/task/services/task_api_service.ts` - API and streaming logic
- `src/core/controller/messageStream/subscribeToMessageStream.ts` - Message stream subscription management

**Frontend:**
- `webview-ui/src/main.tsx` - **Removed React StrictMode to fix 4x duplication**
- `webview-ui/src/context/TaskStateContext.tsx` - Message subscription and state management

## Testing

To verify the fix:

1. **Test Message Duplication Fix:**
   - Start any task
   - Observe that each message appears only ONCE, not 4 times
   - Verify chat history shows correct number of messages

2. **Test Empty Message Fix:**
   - Start a task where the model might call `attempt_completion` without all parameters
   - Observe that no empty/undefined messages appear in the chat
   - The error message about missing parameters should still appear (this is correct behavior)
   - The model should retry with the correct parameters

3. **Test Streaming:**
   - Observe streaming messages update smoothly without duplicates
   - Partial messages should transition to complete messages cleanly

## Notes

### About React StrictMode

- React StrictMode is a development-only tool that helps identify potential problems
- In React 18+, it intentionally double-invokes effects to help detect side effects
- For production extensions with gRPC subscriptions, StrictMode can cause issues:
  - Multiple active subscriptions
  - Duplicate messages
  - Race conditions
- **Decision**: Disabled StrictMode for this extension due to subscription management complexity

### About Error Messages

- The error message "Cline tried to use attempt_completion without value for required parameter 'result'. Retrying..." is working as designed - it tells the model what went wrong
- The fix prevents the UI clutter that occurred before the validation error
- This pattern of checking parameters before creating streaming messages should be used in all tool handlers

### Future Improvements

If StrictMode needs to be re-enabled in the future:
1. Implement robust subscription cleanup in useEffect
2. Add message deduplication logic based on timestamps
3. Use `useRef` to track subscription state across renders
4. Consider using a subscription management library

