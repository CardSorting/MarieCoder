# Webview Request Resolution Fixes

## Summary

Fixed critical issues in the webview-ui request handling system that could cause requests to hang indefinitely and never resolve, leading to a frozen UI.

---

## Issues Identified and Fixed

### 1. **Inconsistent UUID Generation** (Critical)
**File**: `webview-ui/src/services/grpc-client-base.ts`

**Problem**:
- `makeUnaryRequest()` used `generateUUID()` helper with fallback logic
- `makeStreamingRequest()` directly called `crypto.randomUUID()` without fallback
- This inconsistency could cause failures in environments where `crypto.randomUUID()` isn't available
- When UUID generation fails, requests are never sent properly, causing them to hang indefinitely

**Fix**:
```typescript
// Before (Line 85)
const requestId = crypto.randomUUID()

// After
const requestId = generateUUID()
```

**Impact**: Ensures consistent, reliable UUID generation across all request types with proper fallback support.

---

### 2. **Missing Timeout Mechanism** (Critical)
**File**: `webview-ui/src/services/grpc-client-base.ts`

**Problem**:
- No timeout mechanism for unary or streaming requests
- If the extension fails to respond (crashes, busy, unhandled error), promises never resolve/reject
- UI remains in perpetual loading state with no error message
- Users have no indication that something went wrong

**Fix**:
Added configurable timeout with default of 30 seconds for both request types:

**Unary Requests**:
```typescript
static async makeUnaryRequest<TRequest, TResponse>(
    // ... parameters
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<TResponse> {
    return new Promise((resolve, reject) => {
        const requestId = generateUUID()
        let timeoutId: NodeJS.Timeout | null = null

        // Set up timeout to prevent hanging requests
        timeoutId = setTimeout(() => {
            window.removeEventListener("message", handleResponse)
            const errorMsg = `Request timeout: ${this.serviceName}.${methodName} did not respond within ${timeoutMs}ms...`
            debug.error(errorMsg)
            reject(new Error(errorMsg))
        }, timeoutMs)

        // ... rest of implementation
        // Clear timeout when response is received
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
    })
}
```

**Streaming Requests**:
```typescript
static makeStreamingRequest<TRequest, TResponse>(
    // ... parameters
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): () => void {
    const requestId = generateUUID()
    let hasReceivedFirstResponse = false
    let timeoutId: NodeJS.Timeout | null = null

    // Set up timeout for the initial response to prevent hanging streams
    timeoutId = setTimeout(() => {
        if (!hasReceivedFirstResponse) {
            window.removeEventListener("message", handleResponse)
            const errorMsg = `Stream timeout: ${this.serviceName}.${methodName} did not start within ${timeoutMs}ms...`
            debug.error(errorMsg)
            if (callbacks.onError) {
                callbacks.onError(new Error(errorMsg))
            }
        }
    }, timeoutMs)

    // Clear timeout once first response is received
    if (!hasReceivedFirstResponse && timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
        hasReceivedFirstResponse = true
    }
}
```

**Impact**: 
- Prevents indefinite hanging requests
- Provides clear, actionable error messages to users
- Allows UI to recover from extension failures gracefully

---

### 3. **Unhandled Promise Rejections in Message Handler** (High Priority)
**File**: `src/hosts/vscode/VscodeWebviewProvider.ts`

**Problem**:
- `handleWebviewMessage()` is async but was called without `await`
- Errors during message handling were silently swallowed
- No error responses sent back to webview
- Requests could be sent but never receive a response due to unhandled errors

**Fix**:
```typescript
// Before
private setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
        (message) => {
            this.handleWebviewMessage(message)  // No await!
        },
        null,
        this.disposables,
    )
}

// After
private setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
        async (message) => {
            try {
                await this.handleWebviewMessage(message)
            } catch (error) {
                console.error("Error handling webview message:", error)
                // Send error back to webview if it was a grpc_request
                if (message.type === "grpc_request" && message.grpc_request?.request_id) {
                    await this.postMessageToWebview({
                        type: "grpc_response",
                        grpc_response: {
                            error: error instanceof Error ? error.message : String(error),
                            request_id: message.grpc_request.request_id,
                            is_streaming: false,
                        },
                    })
                }
            }
        },
        null,
        this.disposables,
    )
}
```

**Impact**:
- Catches and logs all message handling errors
- Sends proper error responses back to webview
- Prevents silent failures and hanging requests
- Improves debuggability

---

### 4. **Improved Error Handling in Response Processing** (Medium Priority)
**File**: `webview-ui/src/services/grpc-client-base.ts`

**Problem**:
- When receiving invalid responses (no message and no error), logged error but didn't reject promise
- Request would hang even though an error was detected

**Fix**:
```typescript
// Before
} else {
    debug.error("Received ProtoBus message with no response or error ", JSON.stringify(message))
}

// After
} else {
    debug.error("Received ProtoBus message with no response or error ", JSON.stringify(message))
    reject(new Error("Received invalid response from extension"))
}
```

**Impact**: Ensures all error conditions properly reject the promise instead of leaving it pending.

---

## Architecture Overview

### Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          Webview (React)                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. User action triggers request                                │
│ 2. ProtoBusClient.makeUnaryRequest() creates:                  │
│    - Unique request ID (generateUUID)                          │
│    - Message event listener                                     │
│    - Timeout timer (NEW)                                        │
│ 3. postMessage() sends to extension                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              VSCode Extension (VscodeWebviewProvider)           │
├─────────────────────────────────────────────────────────────────┤
│ 4. onDidReceiveMessage (with await/try-catch - NEW)           │
│ 5. handleWebviewMessage() routes to handleGrpcRequest()       │
│ 6. handleUnaryRequest() or handleStreamingRequest()           │
│ 7. getHandler() retrieves service method                       │
│ 8. Execute handler and return response                         │
│ 9. postMessageToWebview() sends response                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Webview (React)                        │
├─────────────────────────────────────────────────────────────────┤
│ 10. handleResponse() receives message                          │
│ 11. Match request_id with pending request                      │
│ 12. Clear timeout (NEW)                                        │
│ 13. Decode response and resolve/reject promise                 │
│ 14. Remove event listener                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Error Scenarios Now Handled

1. **Extension Never Responds**: Timeout triggers after 30s, promise rejects with clear error
2. **Extension Crashes During Processing**: Timeout or try-catch sends error response
3. **Invalid Response Format**: Promise rejects instead of hanging
4. **UUID Generation Fails**: Fallback implementation ensures request is still created
5. **Message Handler Throws Error**: Caught and sent back as error response

---

## Testing Recommendations

### Manual Testing Scenarios

1. **Normal Request Flow**
   - Verify all requests complete successfully
   - Check response times are reasonable

2. **Timeout Scenario**
   - Artificially delay/block extension response
   - Verify timeout triggers after 30s
   - Verify error message is displayed to user

3. **Extension Error**
   - Trigger an error in request handler
   - Verify error is caught and sent to webview
   - Verify UI shows appropriate error message

4. **Streaming Request**
   - Start a streaming request
   - Verify first response clears timeout
   - Verify stream continues without timeout
   - Test stream cancellation

5. **Cross-Browser Compatibility**
   - Test in environments without native `crypto.randomUUID()`
   - Verify fallback UUID generation works

### Automated Testing

Recommended test cases:

```typescript
describe("ProtoBusClient", () => {
  test("should timeout after specified duration", async () => {
    // Don't send response
    await expect(
      ProtoBusClient.makeUnaryRequest("TestService", "testMethod", encode, decode, 1000)
    ).rejects.toThrow(/timeout/i)
  })

  test("should clear timeout when response received", async () => {
    // Send response before timeout
    // Verify timeout is cleared
  })

  test("should use fallback UUID when crypto.randomUUID unavailable", () => {
    // Mock crypto as undefined
    // Verify UUID is still generated
  })

  test("should handle invalid responses", async () => {
    // Send response with neither message nor error
    await expect(
      ProtoBusClient.makeUnaryRequest("TestService", "testMethod", encode, decode)
    ).rejects.toThrow(/invalid response/i)
  })
})
```

---

## Migration Notes

### Breaking Changes
None - all changes are backward compatible. The timeout parameter is optional with sensible defaults.

### API Changes
- `makeUnaryRequest()` now accepts optional `timeoutMs` parameter (default: 30000ms)
- `makeStreamingRequest()` now accepts optional `timeoutMs` parameter (default: 30000ms)

### Configuration
To customize timeout globally, modify:
```typescript
// webview-ui/src/services/grpc-client-base.ts
const DEFAULT_REQUEST_TIMEOUT_MS = 30000 // Adjust as needed
```

---

## Related Files Modified

1. `webview-ui/src/services/grpc-client-base.ts` - Core request handling
2. `src/hosts/vscode/VscodeWebviewProvider.ts` - Extension message handler
3. `docs/webview-ui/REQUEST_RESOLUTION_FIX.md` - This documentation

---

## Future Improvements

1. **Retry Logic**: Add automatic retry for failed requests
2. **Request Queuing**: Implement request queue with concurrency limits
3. **Performance Monitoring**: Track request/response times
4. **Error Recovery**: Implement graceful degradation strategies
5. **Request Deduplication**: Prevent duplicate requests in flight
6. **Timeout Configuration**: Make timeout configurable per-request or per-service

---

## Conclusion

These fixes address critical reliability issues in the webview-extension communication layer. The changes ensure that:

- Requests always eventually resolve (success or error)
- Users receive clear error messages when things go wrong
- The UI can recover from extension failures
- All error conditions are properly logged and handled

The fixes maintain backward compatibility while significantly improving system reliability and user experience.

