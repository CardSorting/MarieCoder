# Web Worker CSP Compliance Fix

**Date**: October 16, 2025  
**Issue**: Content Security Policy violations preventing web worker creation  
**Status**: ✅ Resolved

---

## Problem

The webview was experiencing CSP (Content Security Policy) violations when attempting to create web workers:

```
Refused to create a worker from 'vscode-webview://...' because it violates 
the following Content Security Policy directive: "script-src 'unsafe-eval' 
https://* ... 'nonce-...'". Note that 'worker-src' was not explicitly set, 
so 'script-src' is used as a fallback.
```

### Root Cause

The worker import strategy was using Vite's `?worker&url` syntax, which returns a URL string to the worker file:

```typescript
import MarkdownWorkerUrl from "./markdown_worker?worker&url"
```

When creating workers from this URL in the VSCode webview context with its `vscode-webview://` scheme, the URL didn't match the CSP's allowed sources, causing violations.

---

## Solution

### Changed Import Strategy

Switched from `?worker&url` to `?worker&inline` syntax. The `?worker&inline` import returns a **Worker constructor** that automatically creates blob URLs internally, **even in development mode**:

```typescript
// Before: Returns a URL string (CSP violation)
import MarkdownWorkerUrl from "./markdown_worker?worker&url"

// After: Returns a Worker constructor with inline blob URL
import MarkdownWorker from "./markdown_worker?worker&inline"
```

### Why This Works

1. **Blob URLs are CSP-compliant**: The CSP already includes `worker-src blob:` which allows blob: URLs
2. **Automatic handling**: Vite's `?worker&inline` import handles the blob URL creation internally
3. **No URL resolution needed**: No need to resolve paths relative to document base
4. **Development mode compatible**: The `&inline` flag forces blob URLs even in dev mode, avoiding Vite's default behavior of loading workers as separate module scripts

---

## Implementation Details

### Files Changed

#### 1. `webview-ui/src/workers/index.ts`

**Before:**
```typescript
import MarkdownWorkerUrl from "./markdown_worker?worker&url"

export const MARKDOWN_WORKER_URL = MarkdownWorkerUrl

export function getMarkdownWorkerScript(): string {
  // Complex URL resolution logic...
  return workerUrl.href
}
```

**After:**
```typescript
import MarkdownWorker from "./markdown_worker?worker&inline"

export const MARKDOWN_WORKER_CONSTRUCTOR = MarkdownWorker

export function createMarkdownWorker(): Worker {
  return new MarkdownWorker()
}
```

#### 2. `webview-ui/src/utils/web_worker_manager.ts`

Added `workerConstructor` option to `WorkerPoolConfig`:

```typescript
export interface WorkerPoolConfig {
  // ... other options ...
  
  /**
   * Worker constructor (preferred for CSP compliance)
   * Use Vite's ?worker import to get a constructor that creates blob: URLs
   */
  workerConstructor?: () => Worker
  
  /**
   * Worker script URL or inline function (legacy, use workerConstructor instead)
   */
  workerScript?: string | (() => void)
}
```

Updated `initializeWorker()` to prefer `workerConstructor`:

```typescript
private initializeWorker(): Worker {
  let worker: Worker

  // Prefer workerConstructor (CSP-compliant with blob: URLs)
  if (this.workerConstructor) {
    worker = this.workerConstructor()
  } else if (this.workerScript) {
    worker = new Worker(this.workerScript, { type: "module" })
  } else {
    throw new Error("Worker constructor or script not provided...")
  }
  
  // ... rest of setup
}
```

#### 3. Updated Usage Sites

Updated all files using the worker pool:

- `webview-ui/src/components/common/MarkdownBlock.tsx`
- `webview-ui/src/components/history/history_view/hooks/use_history_search.ts`

**Before:**
```typescript
const { executeTask } = useWebWorker({
  workerScript: getMarkdownWorkerScript(),
  debug: false,
})
```

**After:**
```typescript
const { executeTask } = useWebWorker({
  workerConstructor: createMarkdownWorker,
  debug: false,
})
```

---

## Benefits

1. **✅ CSP Compliance**: Workers now use blob: URLs which are explicitly allowed
2. **✅ Simpler Code**: No complex URL resolution logic needed
3. **✅ Better Performance**: Direct worker construction without string manipulation
4. **✅ Backward Compatible**: Old `workerScript` option still supported for legacy code
5. **✅ Type Safety**: Worker constructor is strongly typed

---

## Verification

### Build Output

With `&inline`, the worker is embedded into the main bundle instead of being a separate file:

```
build/assets/index.js   3,887.51 kB  (includes inlined worker)
```

The worker code is approximately 85KB and is now inlined as a blob URL within the main JavaScript bundle.

### CSP Configuration

The existing CSP in `src/core/webview/WebviewProvider.ts` already allows blob: URLs:

```html
<meta http-equiv="Content-Security-Policy" content="
  ...
  worker-src ${this.getCspSource()} blob:;
  ...">
```

---

## Migration Guide

If you're adding new workers or updating existing ones:

### 1. Import Worker with `?worker&inline` Syntax

```typescript
// ✅ Correct (CSP-compliant, works in dev and prod)
import MyWorker from "./my_worker?worker&inline"

// ❌ Avoid (CSP issues in webview)
import MyWorkerUrl from "./my_worker?worker&url"

// ⚠️ Works in prod but has CSP issues in dev mode
import MyWorker from "./my_worker?worker"
```

### 2. Export Worker Constructor

```typescript
export function createMyWorker(): Worker {
  return new MyWorker()
}
```

### 3. Use `workerConstructor` Option

```typescript
const { executeTask } = useWebWorker({
  workerConstructor: createMyWorker,
  debug: false,
})
```

---

## Related Documentation

- [Web Worker Integration Plan](./WEB_WORKER_INTEGRATION_PLAN.md)
- [Web Worker Implementation Report](./WEB_WORKER_IMPLEMENTATION_REPORT.md)
- [Vite Worker Documentation](https://vitejs.dev/guide/features.html#web-workers)
- [CSP Worker Source Directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/worker-src)

---

## Lessons Learned

1. **Vite's Worker Import Options**:
   - `?worker&inline` → Returns a Worker constructor with inline blob URL (works in dev + prod)
   - `?worker` → Returns a Worker constructor, but uses module workers in dev mode (CSP issues)
   - `?worker&url` → Returns a URL string (requires manual worker creation, CSP issues)

2. **Development vs Production Differences**:
   - In production, Vite bundles workers separately or inlines them
   - In dev mode without `&inline`, Vite loads workers as separate module scripts
   - VSCode webviews have strict CSP that blocks module script loading from dev server
   - The `&inline` flag ensures consistent blob URL behavior in both modes

3. **CSP in VSCode Webviews**:
   - The `vscode-webview://` scheme doesn't match standard URL patterns
   - Blob URLs are the most reliable way to load workers in webviews
   - `worker-src` directive must explicitly allow blob: URLs

4. **Worker Pool Design**:
   - Provide both `workerConstructor` and `workerScript` options
   - Prefer constructor approach but maintain backward compatibility
   - Constructor approach eliminates URL resolution complexities

---

*This fix ensures web workers remain functional in the VSCode webview environment while maintaining strict CSP compliance.*

