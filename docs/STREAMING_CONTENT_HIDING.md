# Streaming Content Hiding Implementation

## Overview

This document describes the implementation of hiding streaming/thinking responses in the chat view, preventing them from appearing until complete, while still showing approval prompts when user interaction is needed.

## Problem

Due to an unresolvable glitch with the streaming display, the decision was made to hide all streaming/thinking responses from the chat view until they're complete, avoiding real-time stream content display issues.

## Solution

The implementation filters out partial/streaming messages at the message filtering level, preventing them from appearing in the chat until they're complete, while preserving user interaction prompts.

### Key Component

#### Message Filtering Logic

**File**: `webview-ui/src/components/chat/chat-view/utils/messageUtils.ts`

Updated the `filterVisibleMessages` function to filter out streaming messages before they're displayed.

Logic:
```typescript
export function filterVisibleMessages(messages: ClineMessage[]): ClineMessage[] {
	return messages.filter((message) => {
		// Filter out partial/streaming messages UNLESS they need user interaction
		// This hides all streaming content until it's complete
		// But keeps approval prompts visible immediately
		if (message.partial === true && message.type !== "ask") {
			return false
		}
		// ... rest of filtering logic
	})
}
```

This ensures:
- ✅ Streaming text messages are hidden until complete
- ✅ Streaming thinking/reasoning blocks are hidden until complete
- ✅ Approval prompts always show immediately (when `message.type === "ask"`)
- ✅ Tool approvals, command confirmations, and other user interactions remain visible
- ✅ Once streaming completes (`partial: false`), messages naturally appear in the chat
- ✅ No infinite loading placeholders - messages simply don't exist in the visible list until ready

## User Experience Flow

### Before (with streaming glitch)
1. User sends a task
2. Chat shows real-time streaming text (with glitches)
3. Thinking blocks stream in real-time (with issues)
4. Scroll behavior is problematic
5. Message updates cause UI jitter

### After (with filtering)
1. User sends a task
2. Chat remains clean with no partial messages visible
3. No streaming text or thinking blocks displayed
4. Smooth, stable UI with no scroll issues
5. When AI needs approval, prompt appears immediately
6. Once complete, full response appears at once

## Technical Details

### Message States

Messages have a `partial` property that indicates streaming state:
- `partial: true` → Message is currently streaming
- `partial: false` (or undefined) → Message is complete

### User Interaction Detection

Messages requiring user interaction are identified by:
- `message.type === "ask"` → User approval/input needed

This includes:
- Tool approvals (`ask: "tool"`)
- Command execution (`ask: "command"`)
- Browser actions (`ask: "browser_action_launch"`)
- MCP server approvals (`ask: "use_mcp_server"`)
- Task completion options (`ask: "completion_result"`)
- Error recovery (`ask: "api_req_failed"`)
- And other approval prompts

### Browser Sessions

Browser session messages are handled separately by `BrowserSessionRow`, which already has its own loading states via the `isBrowsing` flag. Since it uses `ChatRowContent` for nested messages, the streaming placeholder automatically applies to browser session text/reasoning messages as well.

## Benefits

1. **Clean UX**: No more jarring streaming text updates
2. **Better Performance**: Less DOM manipulation during streaming - messages don't exist in DOM until ready
3. **Stable Scrolling**: No scroll position jumps from incremental updates
4. **Clear States**: Clean separation between thinking and responding
5. **Preserved Interaction**: All approval prompts remain fully functional
6. **Simple Implementation**: Single filter check at the message level
7. **No Infinite Loaders**: Messages simply appear when ready, no stuck placeholders

## Files Modified

1. `webview-ui/src/components/chat/chat-view/utils/messageUtils.ts` (modified)

## Testing

Build verification completed:
- ✅ TypeScript compilation successful
- ✅ No linter errors
- ✅ Webview build successful
- ✅ Extension build successful

## Future Enhancements

If needed in the future, the system could be enhanced with:
- Optional loading indicator in task header during streaming
- Progress percentage if API provides streaming progress metadata
- Estimated time remaining based on historical data
- Different visual states for different operations (thinking, writing, analyzing)

However, the current approach is intentionally minimal and robust.

