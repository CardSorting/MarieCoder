# Fix for Duplicate Messages During AI Streaming

## Problem
Users were experiencing duplicate message content appearing during AI streaming responses. The same text would render multiple times within a single message bubble, creating a confusing and broken UX.

## Root Cause
The issue was caused by **redundant `key` props** on components rendered within the Virtuoso virtualized list.

In `MessageRenderer.tsx`, both `BrowserSessionRow` and `ChatRow` components had explicit `key` props set:

```tsx
<ChatRow
    key={messageOrGroup.ts}  // ❌ Redundant key prop
    message={messageOrGroup}
    ...
/>
```

However, the parent `Virtuoso` component in `MessagesArea.tsx` already manages keys via its `computeItemKey` function:

```tsx
<Virtuoso
    computeItemKey={(index, item) =>
        Array.isArray(item) ? `group-${item[0]?.ts ?? index}` : `msg-${item.ts ?? index}`
    }
    ...
/>
```

### Why This Caused Duplicates

When React components have **both**:
1. A `key` prop set directly on the component
2. Keys managed by the parent virtualized list

This creates a conflict in React's reconciliation process:

1. **During streaming**, the same message is updated with incremental text
2. The message timestamp (`ts`) remains the same
3. **With redundant keys**, React may fail to recognize the component as the same instance
4. Instead of updating the existing component, React mounts a new one
5. **Result**: Both the old and new components render, showing duplicate content

## Solution

**Remove the redundant `key` props** from components within the Virtuoso list and let Virtuoso's `computeItemKey` be the single source of truth for component identity.

### Changes Made

**File**: `webview-ui/src/components/chat/chat-view/components/messages/MessageRenderer.tsx`

**Before**:
```tsx
// Browser session group
if (Array.isArray(messageOrGroup)) {
    return (
        <BrowserSessionRow
            key={messageOrGroup[0]?.ts}  // ❌ Removed
            ...
        />
    )
}

// Regular message
return (
    <ChatRow
        key={messageOrGroup.ts}  // ❌ Removed
        ...
    />
)
```

**After**:
```tsx
// Browser session group
if (Array.isArray(messageOrGroup)) {
    return (
        <BrowserSessionRow
            // ✅ No key prop - Virtuoso handles it
            ...
        />
    )
}

// Regular message
return (
    <ChatRow
        // ✅ No key prop - Virtuoso handles it
        ...
    />
)
```

## How Virtuoso Key Management Works

The Virtuoso list uses `computeItemKey` to generate stable keys for each item:

```tsx
computeItemKey={(index, item) =>
    Array.isArray(item) 
        ? `group-${item[0]?.ts ?? index}`  // For browser session groups
        : `msg-${item.ts ?? index}`         // For individual messages
}
```

This ensures:
- ✅ Each message has a unique, stable key based on its timestamp
- ✅ During streaming updates, the same timestamp = same key = same component instance
- ✅ React properly updates the component instead of remounting it
- ✅ No duplicate content appears

## Testing

To verify the fix:

1. **Start a new task** with a prompt that generates a long response
2. **Watch the streaming response** as it appears
3. **Verify**: 
   - Text appears incrementally without duplication
   - Only one instance of each sentence/paragraph appears
   - No flickering or component remounting

## Related Files

- `webview-ui/src/components/chat/chat-view/components/messages/MessageRenderer.tsx` - Fixed component
- `webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx` - Virtuoso configuration
- `webview-ui/src/context/TaskStateContext.tsx` - Message update logic
- `docs/INFINITE_SCROLL_CRASH_FIX.md` - Related infinite scroll fix

## Lessons Learned

### ⚠️ Best Practices for Virtualized Lists

1. **Never set explicit `key` props** on items within a virtualized list
2. **Let the virtualization library manage keys** via `computeItemKey` or similar
3. **Use stable, unique identifiers** (like timestamps) for keys
4. **Test streaming/dynamic updates** to catch reconciliation issues

### React Key Management

When using libraries like Virtuoso, react-window, or react-virtualized:
- The library's key management takes precedence
- Setting explicit keys on child components creates conflicts
- Trust the library's optimization strategies

## Impact

- ✅ **Eliminates** duplicate message content during streaming
- ✅ **Improves** streaming response UX
- ✅ **Reduces** unnecessary re-renders
- ✅ **Maintains** proper React component lifecycle during updates

## Date
October 15, 2025

