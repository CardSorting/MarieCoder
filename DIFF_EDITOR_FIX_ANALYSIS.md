# Diff Editor Fix Analysis

## Investigation Complete ✅

I've added comprehensive debug logging to trace the entire execution flow for diff editor operations.

## Key Difference Found

Comparing MarieCoder and cline-main's `WriteToFileToolHandler.ts`, I found one potential issue:

### MarieCoder (Line 170)
```typescript
// Auto-focus editor so user can see code being written
await config.services.diffViewProvider.open(absolutePath, { displayPath: relPath, autoFocus: true })
```

### cline-main (Line 141)
```typescript
// Open the editor and prepare to stream content in
await config.services.diffViewProvider.open(absolutePath, { displayPath: relPath })
```

**Difference**: MarieCoder passes `autoFocus: true`, cline-main doesn't.

This shouldn't break the editor opening, but it changes the behavior. However, the real issue is likely **elsewhere in the flow**.

## Debug Logs Added

### Complete Trace Path
```
1. TaskApiService.presentAssistantMessage()
   → Log: Block type and partial status
   
2. ToolExecutor.executeTool()
   → Log: Tool name, partial flag, path
   
3. ToolExecutor.execute()
   → Log: Which branch taken (partial vs complete)
   
4. WriteToFileToolHandler.handlePartialBlock()
   → Log: Call entry, parameter status, validation result
   
5. DiffViewProvider.open()
   → Log: Editor opening attempt
   
6. VscodeDiffViewProvider.openDiffEditor()
   → Log: Start, progress, success/failure
```

## How to Diagnose

### Test Command
1. Open MarieCoder in VS Code
2. Open Developer Tools (Help → Toggle Developer Tools)
3. Send this message to MarieCoder:
   ```
   Create a new file called hello.js with a simple hello world function
   ```

### Expected Console Output (Working)
```
[TaskApiService] presentAssistantMessage - Block type: tool_use, partial: true
[TaskApiService] 🔥 Calling toolExecutor.executeTool for write_to_file
[ToolExecutor] Executing tool: write_to_file, partial: true, path: hello.js
[ToolExecutor] ✅ Calling handlePartialBlock for write_to_file
[WriteToFileToolHandler] handlePartialBlock called for write_to_file, path: hello.js
[WriteToFileToolHandler] 🔥 Opening diff editor for /absolute/path/to/hello.js
[VscodeDiffViewProvider] 🔥 openDiffEditor called for /absolute/path/to/hello.js
[VscodeDiffViewProvider] Starting openDiffEditorWithRetry...
[VscodeDiffViewProvider] ✅ Diff editor opened successfully
[WriteToFileToolHandler] ✅ Diff editor opened successfully
[WriteToFileToolHandler] Content updated in diff editor
```

### Broken Scenarios

#### Scenario 1: Partial Flag Not Set
```
[TaskApiService] presentAssistantMessage - Block type: tool_use, partial: false  ← ❌
[ToolExecutor] Executing tool: write_to_file, partial: false, path: hello.js  ← ❌
[ToolExecutor] Calling handleCompleteBlock for write_to_file  ← Should be handlePartialBlock!
```
**Fix**: Check `parse-assistant-message.ts` - ensure partial flag is set when closing tag not found

#### Scenario 2: Early Return (Missing Data)
```
[WriteToFileToolHandler] handlePartialBlock called for write_to_file, path: hello.js
[WriteToFileToolHandler] Not enough data yet - path: true, content: false, diff: false  ← ❌
```
**Fix**: Parameters not being extracted - check XML parsing

#### Scenario 3: Validation Failure
```
[WriteToFileToolHandler] handlePartialBlock called for write_to_file, path: hello.js
[WriteToFileToolHandler] Validation failed, skipping partial block  ← ❌
```
**Fix**: Add logging to `validateAndPrepareFileOperation` to see why it's failing

#### Scenario 4: Editor Opening Failure
```
[WriteToFileToolHandler] 🔥 Opening diff editor for /path/to/hello.js
[VscodeDiffViewProvider] 🔥 openDiffEditor called for /path/to/hello.js
[VscodeDiffViewProvider] Starting openDiffEditorWithRetry...
❌ Error: Failed to open diff editor within 15 seconds
```
**Fix**: VS Code command timing out - check VS Code version, file system permissions

## Potential Root Causes (Ranked by Likelihood)

### 1. ⚠️⚠️⚠️ MOST LIKELY: Early Return Due to Missing Parameters
The `handlePartialBlock` has this early return:
```typescript
if (!rawRelPath || (!rawContent && !rawDiff)) {
    return  // ← Exits without opening editor!
}
```

If the partial block arrives with `path` but NO `content` or `diff` yet (because they're still streaming), it returns early and never opens the editor.

**Why this happens during streaming**:
```xml
<write_to_file>
<path>hello.js</path>  ← Parsed, path available
<content>              ← Tag started but content still streaming...
```

At this point, `path` exists but `content` is empty or undefined, so the early return triggers.

**Solution**: Remove or modify the early return condition to allow editor opening even without full content:

```typescript
// Allow opening editor with just path, even if content not yet available
if (!rawRelPath) {
    return  // Only return if path is missing
}

// If we have path but no content/diff yet, open editor in preparation
if (!rawContent && !rawDiff) {
    // Open editor with empty content, ready to receive streaming updates
    if (!config.services.diffViewProvider.isEditing) {
        const absolutePath = await resolvePath(config.cwd, rawRelPath)
        await config.services.diffViewProvider.open(absolutePath, { displayPath: rawRelPath, autoFocus: true })
    }
    return // Wait for content/diff to arrive
}
```

### 2. ⚠️⚠️ LIKELY: Validation Returning null
The `validateAndPrepareFileOperation` might be returning null during partial blocks.

**Add logging to verify**:
```typescript
const result = await this.validateAndPrepareFileOperation(config, block, rawRelPath, rawDiff, rawContent)
console.log(`[WriteToFileToolHandler] Validation result:`, result ? 'SUCCESS' : 'FAILED')
```

### 3. ⚠️ POSSIBLE: VS Code Command Failure
The `vscode.diff` command might be failing silently.

**Already has logging** - check for timeouts or errors

### 4. ⚠️ UNLIKELY: Auto-approval Blocking
Auto-approval settings might be preventing editor from opening.

**Already handled** - both auto-approve and manual approval paths open the editor

## Quick Fix to Try

If the issue is the early return condition (most likely), try this:

### File: `/src/core/task/tools/handlers/WriteToFileToolHandler.ts`

Replace the early return (line ~38-42):
```typescript
// OLD (Broken):
if (!rawRelPath || (!rawContent && !rawDiff)) {
    return
}

// NEW (Fixed):
if (!rawRelPath) {
    return  // Only return if path is missing
}

// Open editor with path alone, content will stream in
const config = uiHelpers.getConfig()

if (!config.services.diffViewProvider.isEditing && rawRelPath) {
    try {
        const result = await this.validateAndPrepareFileOperation(config, block, rawRelPath, rawDiff, rawContent)
        if (result) {
            const { relPath, absolutePath, fileExists } = result
            
            // Show partial UI message
            const sharedMessageProps: ClineSayTool = {
                tool: fileExists ? "editedExistingFile" : "newFileCreated",
                path: getReadablePath(config.cwd, relPath),
                content: "", // Empty until content streams in
                operationIsLocatedInWorkspace: await isLocatedInWorkspace(relPath),
            }
            const partialMessage = JSON.stringify(sharedMessageProps)
            
            if (await uiHelpers.shouldAutoApproveToolWithPath(block.name, relPath)) {
                await uiHelpers.say("tool", partialMessage, undefined, undefined, true)
            } else {
                await uiHelpers.ask("tool", partialMessage, true).catch(() => {})
            }
            
            // Open editor immediately, ready for content
            await config.services.diffViewProvider.open(absolutePath, { displayPath: relPath, autoFocus: true })
        }
    } catch (error) {
        console.error(`[WriteToFileToolHandler] Early editor open failed:`, error)
    }
}

// If no content/diff yet, wait for next partial update
if (!rawContent && !rawDiff) {
    return
}
```

## Testing After Fix

1. Rebuild: `npm run compile`
2. Restart VS Code
3. Test file creation/edit
4. Check console logs
5. Verify diff editor opens

## Build Status
✅ Current build successful with debug logging added
```
npm run compile
# Checked 1054 files in 2s. No fixes applied.
# [watch] build finished
```

## Files Ready for Testing

1. ✅ `ToolExecutor.ts` - Debug logging added
2. ✅ `TaskApiService.ts` - Debug logging added
3. ✅ `WriteToFileToolHandler.ts` - Debug logging added
4. ✅ `VscodeDiffViewProvider.ts` - Debug logging added

**Next**: Test in VS Code and analyze console output to identify exact failure point.

