# Task Handling Fix - Duplicate Messages and Missing Result Parameter

## Issue Description

Users were experiencing duplicate messages in the chat UI and seeing errors about missing required parameters when the AI attempted to complete tasks. Specifically:

1. **Duplicate Messages**: The same content was appearing multiple times in the chat
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

## Benefits

1. **No Duplicate Messages**: Empty partial messages are no longer created during streaming
2. **Cleaner UI**: Users only see meaningful messages, not empty placeholders
3. **Better Error Handling**: The validation error is still shown, but without the preceding empty message
4. **Consistent Pattern**: Matches the pattern used in other tool handlers (e.g., `WriteToFileToolHandler`, `BrowserToolHandler`)

## Related Files

- `src/core/task/tools/handlers/AttemptCompletionHandler.ts` - Main fix
- `src/core/task/ToolExecutor.ts` - Tool execution flow
- `src/core/task/services/task_message_service.ts` - Message handling
- `src/core/task/services/task_api_service.ts` - API and streaming logic

## Testing

To verify the fix:

1. Start a task where the model might call `attempt_completion` without all parameters
2. Observe that no empty/undefined messages appear in the chat
3. The error message about missing parameters should still appear (this is correct behavior)
4. The model should retry with the correct parameters

## Notes

- The error message "Cline tried to use attempt_completion without value for required parameter 'result'. Retrying..." is working as designed - it tells the model what went wrong
- The fix prevents the UI clutter that occurred before the validation error
- This pattern of checking parameters before creating streaming messages should be used in all tool handlers

