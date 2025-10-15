# Attempt Completion Button Fix

## Issue Description

When the AI agent attempted to complete a task using `attempt_completion`, the UI would not properly show the "Start New Task" button. Users had to click the "Cancel" button to finish the interaction.

## Root Cause

The bug occurred due to a mismatch in how the completion flow handled message types:

### The Flow

1. **During streaming**: `handlePartialBlock` sent a `say` message:
   ```typescript
   say("completion_result", ..., partial=true)
   ```

2. **After streaming**: `execute` sent another `say` message:
   ```typescript
   say("completion_result", ..., partial=false)
   ```

3. **Then**: Called `ask` to wait for user response:
   ```typescript
   ask("completion_result", "", false)
   ```

### The Problem

After step 2, the last message in the message list was:
```typescript
{ type: "say", say: "completion_result", partial: false }
```

When `ask()` was called in step 3, it checked:
```typescript
lastMessage.type === "ask" && lastMessage.ask === type
```

Since the last message was a `say`, not an `ask`, this check failed. The `ask()` method then created a **new** message instead of converting the existing `say` message to an `ask` message.

This resulted in:
1. A `say` message with `say: "completion_result"` (displayed as text only, no buttons)
2. An `ask` message with `ask: "completion_result"` (should have buttons but UI was confused)

## Solution

Updated the `ask()` method in both `task_message_service.ts` and `task/index.ts` to:

1. **Convert matching `say` messages to `ask` messages**: When calling `ask()`, if the last message is a `say` message with the same type, convert it to an `ask` message instead of creating a new one.

2. **Handle both partial and non-partial cases**: The conversion logic works for both:
   - Partial `say` messages being finalized as `ask` messages
   - Complete `say` messages being converted to `ask` messages

### Code Changes

#### `task_message_service.ts`

Added logic to convert `say` messages to `ask` messages in two places:

1. **When finalizing partial messages** (line 120-135):
   ```typescript
   const canConvertPartialSayToAsk = lastMessage && 
       lastMessage.partial && 
       lastMessage.type === "say" && 
       lastMessage.say === type
   
   if (canConvertPartialSayToAsk) {
       // Convert partial say to non-partial ask
       await this.messageStateHandler.updateClineMessage(lastMessageIndex, {
           type: "ask",
           ask: type,
           text: text || lastMessage.text,
           partial: false,
       })
   }
   ```

2. **When creating non-partial messages** (line 154-164):
   ```typescript
   const canConvertSayToAsk = lastMessage && 
       lastMessage.type === "say" && 
       lastMessage.say === type
   
   if (canConvertSayToAsk) {
       // Convert the existing say message to an ask message
       await this.messageStateHandler.updateClineMessage(lastMessageIndex, {
           type: "ask",
           ask: type,
           text: text || lastMessage.text,
       })
   }
   ```

#### `task/index.ts`

Applied the same fixes to the legacy Task class to maintain consistency.

#### `AttemptCompletionHandler.ts`

Added optimization to avoid sending duplicate `say` messages when one already exists from streaming:

```typescript
const lastMessage = config.messageState.getClineMessages().at(-1)
if (lastMessage && lastMessage.say === "completion_result") {
    // We already have a completion_result say from streaming, just save checkpoint
    await config.callbacks.saveCheckpoint(true, lastMessage.ts)
} else {
    // No previous completion_result message, create one
    const completionMessageTs = await config.callbacks.say("completion_result", result, undefined, undefined, false)
    await config.callbacks.saveCheckpoint(true, completionMessageTs)
}
```

## Impact

This fix ensures that:

1. ✅ The completion result is properly converted from a `say` message to an `ask` message
2. ✅ The UI correctly shows the "Start New Task" button
3. ✅ Users no longer need to click "Cancel" to finish the interaction
4. ✅ The message list remains clean without duplicate messages
5. ✅ The fix applies to all similar flows where `say` messages need to become `ask` messages

## Testing

To verify the fix:

1. Start a task with the AI agent
2. Wait for the agent to call `attempt_completion`
3. Verify that the "Start New Task" button appears automatically
4. Verify that you can click it without needing to cancel first

## Related Files

- `src/core/task/services/task_message_service.ts` - Main message service with say-to-ask conversion
- `src/core/task/index.ts` - Legacy task class with same fix
- `src/core/task/tools/handlers/AttemptCompletionHandler.ts` - Completion handler optimization
- `webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts` - Button configuration (unchanged, just for reference)

## Date

October 15, 2025

