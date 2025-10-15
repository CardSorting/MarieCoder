# Diff Editor Debug Guide

## Debug Logging Added ✅

I've added comprehensive debug logging to trace the exact execution flow and identify where the diff editor is failing to open.

## Files Modified with Debug Logging

### 1. ToolExecutor.ts
**Location**: `/src/core/task/ToolExecutor.ts` (line 274, 318, 324)

**Logs added**:
```
[ToolExecutor] Executing tool: ${block.name}, partial: ${block.partial}, path: ${path}
[ToolExecutor] ✅ Calling handlePartialBlock for ${block.name}
[ToolExecutor] Calling handleCompleteBlock for ${block.name}
```

**What to look for**:
- ✅ Check if `partial: true` for write_to_file/replace_in_file
- ✅ Verify handlePartialBlock is called (not handleCompleteBlock)
- ❌ If you see `partial: false`, the parser isn't setting the flag correctly

### 2. TaskApiService.ts
**Location**: `/src/core/task/services/task_api_service.ts` (line 335, 363)

**Logs added**:
```
[TaskApiService] presentAssistantMessage - Block type: tool_use, partial: true
[TaskApiService] 🔥 Calling toolExecutor.executeTool for write_to_file
```

**What to look for**:
- ✅ Verify blocks are being presented
- ✅ Check that tool_use blocks are detected correctly

### 3. WriteToFileToolHandler.ts
**Location**: `/src/core/task/tools/handlers/WriteToFileToolHandler.ts` (lines 33, 41, 51, 82, 86, 90, 94)

**Logs added**:
```
[WriteToFileToolHandler] handlePartialBlock called for write_to_file, path: ${path}
[WriteToFileToolHandler] Not enough data yet - path: true, content: false, diff: false
[WriteToFileToolHandler] Validation failed, skipping partial block
[WriteToFileToolHandler] 🔥 Opening diff editor for ${absolutePath}
[WriteToFileToolHandler] ✅ Diff editor opened successfully
[WriteToFileToolHandler] Editor already open, updating content
[WriteToFileToolHandler] Content updated in diff editor
```

**What to look for**:
- ✅ Check if handlePartialBlock is called
- ✅ Verify path and content/diff are present
- ✅ See if validation passes
- ✅ Confirm diff editor open is attempted
- ❌ Look for errors or early returns

### 4. VscodeDiffViewProvider.ts
**Location**: `/src/hosts/vscode/VscodeDiffViewProvider.ts` (lines 22, 33, 35)

**Logs added**:
```
[VscodeDiffViewProvider] 🔥 openDiffEditor called for ${absolutePath}
[VscodeDiffViewProvider] Starting openDiffEditorWithRetry...
[VscodeDiffViewProvider] ✅ Diff editor opened successfully
```

**What to look for**:
- ✅ Verify openDiffEditor is called
- ✅ Check if VSCode diff command executes
- ❌ Look for errors during editor opening

## How to Test

### Step 1: Open VS Code Developer Tools
1. Open MarieCoder extension
2. Press `Cmd+Shift+P` → "Toggle Developer Tools"
3. Go to Console tab

### Step 2: Start a File Edit Task
Ask MarieCoder to edit or create a file:
```
"Create a new file called test.js with a hello world function"
```

or

```
"Edit the package.json file to add a new script"
```

### Step 3: Watch Console Output
Look for the debug logs in this order:

#### ✅ EXPECTED (Working Flow)
```
[TaskApiService] presentAssistantMessage - Block type: tool_use, partial: true
[TaskApiService] 🔥 Calling toolExecutor.executeTool for write_to_file
[ToolExecutor] Executing tool: write_to_file, partial: true, path: test.js
[ToolExecutor] ✅ Calling handlePartialBlock for write_to_file
[WriteToFileToolHandler] handlePartialBlock called for write_to_file, path: test.js
[WriteToFileToolHandler] 🔥 Opening diff editor for /path/to/test.js
[VscodeDiffViewProvider] 🔥 openDiffEditor called for /path/to/test.js
[VscodeDiffViewProvider] Starting openDiffEditorWithRetry...
[VscodeDiffViewProvider] ✅ Diff editor opened successfully
[WriteToFileToolHandler] ✅ Diff editor opened successfully
[WriteToFileToolHandler] Content updated in diff editor
```

#### ❌ BROKEN FLOW SCENARIOS

**Scenario A: Partial flag not set**
```
[TaskApiService] presentAssistantMessage - Block type: tool_use, partial: false  ← ❌ WRONG!
[ToolExecutor] Executing tool: write_to_file, partial: false, path: test.js
[ToolExecutor] Calling handleCompleteBlock for write_to_file  ← Should be handlePartialBlock!
```
**Problem**: Parser not setting `partial: true`
**Fix**: Check `parse-assistant-message.ts`

**Scenario B: Missing parameters**
```
[WriteToFileToolHandler] handlePartialBlock called for write_to_file, path: undefined
[WriteToFileToolHandler] Not enough data yet - path: false, content: false, diff: false
```
**Problem**: Parameters not being extracted from XML
**Fix**: Check XML parsing in handlePartialBlock

**Scenario C: Validation failure**
```
[WriteToFileToolHandler] handlePartialBlock called for write_to_file, path: test.js
[WriteToFileToolHandler] Validation failed, skipping partial block
```
**Problem**: validateAndPrepareFileOperation returning null
**Fix**: Check why validation is failing

**Scenario D: Editor opening failure**
```
[WriteToFileToolHandler] 🔥 Opening diff editor for /path/to/test.js
[VscodeDiffViewProvider] 🔥 openDiffEditor called for /path/to/test.js
❌ Error: Failed to open diff editor...
```
**Problem**: VSCode diff command failing
**Fix**: Check VS Code version, file permissions

## Common Issues and Fixes

### Issue 1: partial: false instead of true
**Symptom**: `[ToolExecutor] Executing tool: write_to_file, partial: false`
**Diagnosis**: Parser not setting partial flag during streaming
**Fix Location**: `/src/core/assistant-message/parse-assistant-message.ts`
**Solution**: Ensure `partial: true` is set when closing tag not found

### Issue 2: handlePartialBlock never called
**Symptom**: Only see "Calling handleCompleteBlock"
**Diagnosis**: Block always marked as complete
**Fix Location**: Stream processing in `ApiStreamManager` or parser
**Solution**: Verify streaming content is parsed correctly

### Issue 3: Parameters missing
**Symptom**: `Not enough data yet - path: false, content: false`
**Diagnosis**: XML parameter extraction failing
**Fix Location**: `parse-assistant-message.ts` parameter extraction
**Solution**: Check tag parsing for `<path>`, `<content>`, `<diff>`

### Issue 4: Validation fails
**Symptom**: `Validation failed, skipping partial block`
**Diagnosis**: File path or content validation issue
**Fix Location**: `validateAndPrepareFileOperation` method
**Solution**: Add more logging in validation function

### Issue 5: Editor doesn't open
**Symptom**: `Opening diff editor...` but no success message
**Diagnosis**: VSCode diff command failing
**Fix Location**: `VscodeDiffViewProvider.performDiffEditorOpen`
**Solution**: Check VSCode version, file permissions, or timeout

## Quick Diagnostic Commands

### Check if partial blocks exist
```typescript
// In console, after running task:
// This will show you all blocks and their partial status
console.table(taskState.assistantMessageContent.map(b => ({
  type: b.type,
  name: b.type === 'tool_use' ? b.name : 'N/A',
  partial: b.partial
})))
```

### Watch for specific tool
```typescript
// Set breakpoint or add alert in handlePartialBlock:
if (block.name === 'write_to_file') {
    debugger; // Will pause execution in DevTools
}
```

## Next Steps After Testing

1. **Run the test** (Step 2 above)
2. **Capture console output** 
3. **Identify which scenario** matches the logs
4. **Apply the corresponding fix** from "Common Issues and Fixes"
5. **Report findings** with full console output

## Removing Debug Logs

Once the issue is fixed, remove the debug logging by searching for:
```
console.log(`[ToolExecutor]
console.log(`[TaskApiService]
console.log(`[WriteToFileToolHandler]
console.log(`[VscodeDiffViewProvider]
```

And removing those lines (keep error logging with `console.error`).

## Expected Timeline

1. ⏱️ Run test (2 minutes)
2. ⏱️ Analyze logs (5 minutes)
3. ⏱️ Apply fix (10-30 minutes depending on issue)
4. ⏱️ Verify fix (2 minutes)
5. ⏱️ Remove debug logs (2 minutes)

**Total**: ~20-40 minutes to full resolution

## Support Information

If logs show unexpected behavior not covered in this guide, provide:
1. Full console output from test
2. Screenshot of chat vs editor state
3. Steps to reproduce
4. MarieCoder version and VS Code version

