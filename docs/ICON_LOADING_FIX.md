# Icon Loading Fix

## Problem

Icons (codicons) were not displaying in the webview and showed as blank spaces.

## Root Cause

The codicon CSS and font files were being loaded **twice** with conflicting path resolution:

1. **Extension Level**: `WebviewProvider.ts` correctly loaded codicons from `node_modules/@vscode/codicons/dist/codicon.css` with proper VSCode webview URI conversion
2. **Webview Level**: `webview-ui/src/index.css` also imported codicons via `@import url("@vscode/codicons/dist/codicon.css")`

When the webview CSS was bundled, the font path became `/assets/codicon.ttf`, which:
- Could not be resolved correctly in VSCode webview context
- Required special `vscode-webview-resource://` URI conversion
- Was embedded in CSS so couldn't be converted dynamically

## Solution

Removed the duplicate codicon import from `webview-ui/src/index.css` (line 21).

The extension now loads codicons only once from `node_modules` with proper webview URI handling via `asWebviewUri()`.

## Changes Made

### `/webview-ui/src/index.css`
```diff
- @import url("@vscode/codicons/dist/codicon.css");
+ /* Codicon CSS is loaded by the extension directly from node_modules, not bundled here */
+ /* This prevents path resolution issues with the codicon.ttf font file in VSCode webviews */
```

## Verification

After the fix:
- ✅ `codicon.ttf` is no longer bundled in `webview-ui/build/assets/`
- ✅ `index.css` is smaller (73.48 kB vs previous size)
- ✅ Codicon CSS loads only from extension's `node_modules` with proper URI conversion
- ✅ Icons display correctly in the webview

## Related Files

- `/src/core/webview/WebviewProvider.ts` - Lines 82-86, 110 (codicon loading)
- `/src/hosts/vscode/VscodeWebviewProvider.ts` - Line 27 (`asWebviewUri` conversion)
- `/webview-ui/src/index.css` - Line 21 (removed duplicate import)

## Lessons Learned

**KonMari Reflection**:
- The duplicate codicon import served its purpose during initial development
- We learned that VSCode webviews require special URI handling for all resources
- Evolution: Centralize resource loading at the extension level for proper URI conversion
- Release: Remove bundled resources that can't be properly path-resolved

**Technical Insight**:
When working with VSCode webviews, font files and other resources referenced in CSS must be loaded via the extension's `asWebviewUri()` method. Bundling them into the webview's CSS creates path resolution issues that prevent proper loading.

---

*Fixed: October 15, 2025*

