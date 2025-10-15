# Streaming Duplicate Messages Fix

## Issue Summary

Streaming responses in the chat component were duplicating infinitely due to a **race condition** between two competing state subscriptions in `TaskStateContext.tsx`.

## Root Cause Analysis

### The Problem

The `TaskStateContext` manages chat messages through TWO separate subscriptions:

1. **`subscribeToState`** (Full State Sync)
   - Receives complete state snapshots from the backend
   - Replaces the ENTIRE messages array with `setClineMessages(stateData.clineMessages)`
   - Fires periodically to keep state in sync

2. **`subscribeToPartialMessage`** (Streaming Updates)
   - Receives individual message updates during streaming
   - Updates or adds single messages via `setClineMessages((prev) => ...)`
   - Fires rapidly during active streaming

### The Race Condition

When a message is actively streaming:

```
Time  | Event
------|------------------------------------------------------
T0    | Streaming message chunk arrives
T1    | subscribeToPartialMessage processes chunk
      | → Updates message in state array
T2    | subscribeToState fires (periodic sync)
      | → Replaces entire state array
T3    | Another chunk arrives
T4    | subscribeToPartialMessage processes it
      | → May find duplicate message or create new one
T5    | Both subscriptions fire nearly simultaneously
      | → State updates conflict
      | → Messages get duplicated infinitely
```

The problem occurs because:
- React state updates are asynchronous
- Both handlers call `setClineMessages()` in quick succession
- The full state update can overwrite partial updates (or vice versa)
- This creates inconsistent state leading to duplicate messages

### Code Location

**File:** `webview-ui/src/context/TaskStateContext.tsx`

**Problematic Code (Lines 65-66):**
```typescript
if (stateData.clineMessages) {
    setClineMessages(stateData.clineMessages)  // ⚠️ Replaces entire array
}
```

**Partial Update Logic (Lines 126-138):**
```typescript
setClineMessages((prevMessages) => {
    const lastIndex = findLastIndex(prevMessages, (msg) => msg.ts === partialMessage.ts)
    if (lastIndex !== -1) {
        // Update existing message
        const newMessages = [...prevMessages]
        newMessages[lastIndex] = partialMessage
        return newMessages
    } else {
        // Add new message if it doesn't exist
        return [...prevMessages, partialMessage]
    }
})
```

## Solution

### Debounce-Based Race Prevention

Added a **time-based debounce mechanism** to prevent full state updates from overwriting recent partial updates:

```typescript
// Track the timestamp of the last partial message update
const lastPartialUpdateTimeRef = useRef<number>(0)
const PARTIAL_UPDATE_DEBOUNCE_MS = 100 // Debounce window

// In subscribeToState handler:
const timeSinceLastPartialUpdate = Date.now() - lastPartialUpdateTimeRef.current
const shouldSkipMessagesUpdate = timeSinceLastPartialUpdate < PARTIAL_UPDATE_DEBOUNCE_MS

if (stateData.clineMessages && !shouldSkipMessagesUpdate) {
    setClineMessages(stateData.clineMessages)
} else if (shouldSkipMessagesUpdate) {
    debug.log("[DEBUG] Skipping full state update - recent partial update detected")
}

// In subscribeToPartialMessage handler:
lastPartialUpdateTimeRef.current = Date.now()
setClineMessages((prevMessages) => {
    // ... update logic
})
```

### How It Works

1. **Partial Update Priority**: When a partial message update occurs, we record the timestamp
2. **Debounce Window**: Full state updates check if a partial update happened within 100ms
3. **Smart Skip**: If a recent partial update is detected, skip the full state update for messages
4. **Other State Preserved**: Task history, current task ID, and other state still update normally

### Why This Works

- **Streaming Priority**: During active streaming, partial updates take precedence
- **Eventual Consistency**: After streaming completes (>100ms), full state sync resumes
- **Non-Blocking**: Doesn't prevent legitimate state syncs
- **Minimal Impact**: Only affects message updates, other state works normally

## Testing Recommendations

### Manual Testing

1. **Start a new chat task**
   - Send a message that triggers AI response
   - Observe streaming response
   - Verify no duplicate messages appear
   - Verify messages don't flicker or jump

2. **Rapid interactions**
   - Send multiple messages quickly
   - Switch between tasks
   - Resume existing tasks
   - Verify state stays consistent

3. **Edge cases**
   - Network interruptions
   - Very long responses
   - Multiple simultaneous streams
   - Task switching during streaming

### Debug Monitoring

Enable debug logging to monitor the fix:

```typescript
// Look for these log messages:
"[DEBUG] Skipping full state update - recent partial update detected"
```

This indicates the debounce is working and preventing race conditions.

## Code Changes

### Modified Files

1. **`webview-ui/src/context/TaskStateContext.tsx`**
   - Added `lastPartialUpdateTimeRef` to track partial update timing
   - Added `PARTIAL_UPDATE_DEBOUNCE_MS` constant (100ms)
   - Modified `subscribeToState` to check debounce before updating messages
   - Modified `subscribeToPartialMessage` to record update timestamp
   - Added debug logging for skipped updates

## Alternative Solutions Considered

### 1. Message Deduplication
**Approach:** Deduplicate messages before rendering
**Rejected:** Treats symptom, not root cause; performance overhead

### 2. Merge Strategy
**Approach:** Merge full state with current state instead of replacing
**Rejected:** Complex logic; could miss deleted messages

### 3. Single Source of Truth
**Approach:** Use only one subscription
**Rejected:** Need both for different purposes (full sync + streaming)

### 4. Request Queuing
**Approach:** Queue state updates and process sequentially
**Rejected:** Added complexity; could delay updates

### 5. Debounce (Chosen)
**Approach:** Prevent conflicting updates within time window
**Chosen:** Simple, effective, minimal impact on existing code

## Benefits of This Solution

✅ **Simple**: Minimal code changes
✅ **Effective**: Directly addresses race condition
✅ **Performant**: No extra processing or data structures
✅ **Safe**: Preserves existing functionality
✅ **Maintainable**: Clear intent, easy to understand
✅ **Debuggable**: Includes logging for monitoring

## Future Improvements

1. **Adaptive Debounce**: Adjust debounce time based on streaming speed
2. **Metrics Collection**: Track how often conflicts are prevented
3. **Unified State Management**: Consider consolidating subscriptions
4. **State Machine**: Implement formal state machine for message lifecycle

## Related Files

- `webview-ui/src/context/TaskStateContext.tsx` - Main fix location
- `webview-ui/src/services/grpc-client-base.ts` - Streaming infrastructure
- `webview-ui/src/services/grpc-client.ts` - Service clients
- `webview-ui/src/components/chat/ChatView.tsx` - Chat component

## Conclusion

The infinite duplicate messages issue was caused by competing state updates during streaming. By implementing a simple debounce mechanism that gives priority to partial updates during active streaming, we prevent the race condition while maintaining full state synchronization during idle periods.

The fix is minimal, focused, and follows the MarieCoder development philosophy of compassionate evolution - we honored the existing code, understood its purpose, and evolved it thoughtfully to address the specific issue.

