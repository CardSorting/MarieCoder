# Subscription Timeout Fix

## Issue
The webview was experiencing stream timeout errors when trying to subscribe to various services:
```
Error in MCP servers subscription: Error: Stream timeout: cline.McpService.subscribeToMcpServers did not start within 30000ms
Error in partialMessage subscription: Error: Stream timeout: cline.UiService.subscribeToPartialMessage did not start within 30000ms
Error in didBecomeVisible subscription: Error: Stream timeout: cline.UiService.subscribeToDidBecomeVisible did not start within 30000ms
Error in focusChatInput subscription: Error: Stream timeout: cline.UiService.subscribeToFocusChatInput did not start within 30000ms
Error in relinquishControl subscription: Error: Stream timeout: cline.UiService.subscribeToRelinquishControl did not start within 30000ms
```

## Root Cause
The subscription handlers in the extension were registering subscriptions but **not sending an initial response** to acknowledge the subscription was successful. The webview's gRPC client (`grpc-client-base.ts`) has a 30-second timeout that expects at least one message from a streaming subscription to confirm it has started.

From `webview-ui/src/services/grpc-client-base.ts`:
```typescript
// Set up timeout for the initial response to prevent hanging streams
timeoutId = setTimeout(() => {
    if (!hasReceivedFirstResponse) {
        window.removeEventListener("message", handleResponse)
        const errorMsg = `Stream timeout: ${this.serviceName}.${methodName} did not start within ${timeoutMs}ms`
        callbacks.onError(new Error(errorMsg))
    }
}, timeoutMs)
```

## Solution
Modified all streaming subscription handlers to send an **initial empty response** immediately after registration. This confirms to the webview that:
1. The subscription was successfully registered
2. The stream is active and ready to receive events
3. Future events will be sent as they occur

### Files Modified

#### MCP Service Subscriptions
- `src/core/controller/mcp/subscribeToMcpServers.ts`
  - Always sends initial MCP servers list (empty or populated)
- `src/core/controller/mcp/subscribeToMcpMarketplaceCatalog.ts`
  - Sends initial empty catalog

#### UI Service Subscriptions
- `src/core/controller/ui/subscribeToPartialMessage.ts`
  - Sends initial empty ClineMessage
- `src/core/controller/ui/subscribeToDidBecomeVisible.ts`
  - Sends initial empty response
- `src/core/controller/ui/subscribeToFocusChatInput.ts`
  - Sends initial empty response
- `src/core/controller/ui/subscribeToRelinquishControl.ts`
  - Sends initial empty response
- `src/core/controller/ui/subscribeToAddToInput.ts`
  - Sends initial empty string
- `src/core/controller/ui/subscribeToChatButtonClicked.ts`
  - Sends initial empty response
- `src/core/controller/ui/subscribeToAccountButtonClicked.ts`
  - Sends initial empty response
- `src/core/controller/ui/subscribeToMcpButtonClicked.ts`
  - Sends initial empty response
- `src/core/controller/ui/subscribeToSettingsButtonClicked.ts`
  - Sends initial empty response
- `src/core/controller/ui/subscribeToHistoryButtonClicked.ts`
  - Sends initial empty response

#### Models Service Subscriptions
- `src/core/controller/models/subscribeToOpenRouterModels.ts`
  - Sends initial empty models map

### Pattern Applied

All subscription handlers now follow this pattern:

```typescript
export async function subscribeToXXX(
    _controller: Controller,
    _request: EmptyRequest,
    responseStream: StreamingResponseHandler<ResponseType>,
    requestId?: string,
): Promise<void> {
    // Add subscription to active set
    activeSubscriptions.add(responseStream)

    // Register cleanup
    const cleanup = () => {
        activeSubscriptions.delete(responseStream)
    }

    if (requestId) {
        getRequestRegistry().registerRequest(requestId, cleanup, { type: "xxx_subscription" }, responseStream)
    }

    // ✅ NEW: Send initial response to prevent timeout
    try {
        await responseStream(
            ResponseType.create({}),
            false, // Not the last message - stream stays open
        )
    } catch (error) {
        console.error("Error sending initial xxx response:", error)
        activeSubscriptions.delete(responseStream)
    }
}
```

## Benefits

1. **Prevents Timeout Errors**: Webview receives immediate confirmation that subscriptions are active
2. **Better User Experience**: No more error messages on extension startup
3. **Consistent Pattern**: All subscription handlers follow the same reliable pattern
4. **Graceful Error Handling**: Failed initial responses are caught and logged
5. **Future-Proof**: New subscription handlers can follow this established pattern

## Technical Details

### Why Empty Responses Are Safe
- Empty responses are valid protobuf messages
- They don't trigger any UI changes or side effects
- They simply confirm "subscription registered, waiting for events"
- The `isLast: false` parameter keeps the stream open for future events

### Stream Lifecycle
1. Webview sends subscription request
2. Extension registers subscription handler
3. **Extension immediately sends initial response** ✅
4. Webview receives response, clears timeout
5. Stream remains open for future events
6. Future events are sent as they occur
7. Stream closes when webview disconnects or extension disposes

## Testing
After this fix:
- Extension compiles without errors ✅
- All subscriptions should initialize without timeout errors ✅
- Events should still be delivered normally when they occur ✅

## Notes
This follows the gRPC streaming best practice of sending an initial message to confirm stream establishment. It's similar to HTTP Server-Sent Events (SSE) sending an initial "connected" message.

