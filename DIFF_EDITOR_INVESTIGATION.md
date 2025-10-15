# Diff Editor Investigation: Why Code Appears Only in Chat

## Problem
In MarieCoder, when the AI wants to edit files, the code changes appear only in the chat view instead of opening in the VS Code diff editor like cline-main does.

## Investigation Summary

### How Diff Editing Should Work

Both MarieCoder and cline-main follow the same architecture for file edits:

```
1. AI generates tool use block (write_to_file or replace_in_file)
2. ToolExecutor detects if block is partial (streaming) or complete
3. For PARTIAL blocks → handlePartialBlock() 
   ├─ Opens diff editor (diffViewProvider.open())
   ├─ Streams content in real-time (diffViewProvider.update())
   └─ Shows in editor tab with live updates
4. For COMPLETE blocks → handleCompleteBlock()
   ├─ Opens diff editor if not already open
   ├─ Updates with final content
   └─ Waits for user approval/auto-approves
```

### Key Files Involved

#### 1. WriteToFileToolHandler.ts
**MarieCoder**: `/src/core/task/tools/handlers/WriteToFileToolHandler.ts`
**cline-main**: `/src/core/task/tools/handlers/WriteToFileToolHandler.ts`

Both versions have:
- `handlePartialBlock()` - Handles streaming updates (lines 32-113 in MarieCoder, 26-85 in cline-main)
- `execute()` - Handles complete blocks (lines 115+ in MarieCoder, 87+ in cline-main)

Critical code in `handlePartialBlock()`:
```typescript
// CRITICAL: Open editor and stream content in real-time
if (!config.services.diffViewProvider.isEditing) {
    await config.services.diffViewProvider.open(absolutePath, { 
        displayPath: relPath, 
        autoFocus: true  // MarieCoder has this, cline-main doesn't
    })
}
await config.services.diffViewProvider.update(newContent, false)
```

#### 2. ToolExecutor.ts  
**MarieCoder**: `/src/core/task/ToolExecutor.ts`
**cline-main**: `/src/core/task/ToolExecutor.ts`

Both versions:
```typescript
// Handle partial blocks (lines 314-316 in MarieCoder, 316-318 in cline-main)
if (block.partial) {
    await this.handlePartialBlock(block, config)
    return true
}
```

#### 3. VscodeDiffViewProvider.ts
**MarieCoder**: `/src/hosts/vscode/VscodeDiffViewProvider.ts`
**cline-main**: `/src/hosts/vscode/VscodeDiffViewProvider.ts`

Both implement the same `openDiffEditor()` logic using `vscode.commands.executeCommand("vscode.diff", ...)` to open the diff view.

## Potential Causes

### 1. **Partial Block Detection Issue** ⚠️ MOST LIKELY
The `block.partial` flag might not be set correctly when streaming file edits, causing:
- `handlePartialBlock()` never called
- Editor never opens
- Content only shown in chat via `say("tool", ...)` or `ask("tool", ...)`

**How to verify**:
```typescript
// Add logging in ToolExecutor.ts around line 314:
console.log(`[ToolExecutor] Processing block: ${block.name}, partial: ${block.partial}`)
if (block.partial) {
    console.log(`[ToolExecutor] Calling handlePartialBlock for ${block.name}`)
    await this.handlePartialBlock(block, config)
    return true
}
```

### 2. **Assistant Message Parsing** ⚠️ POSSIBLE
The streaming message parser might not be setting `partial: true` on tool use blocks.

**Files to check**:
- `/src/core/assistant-message/parse-assistant-message.ts`
- Look for where `ToolUse.partial` is set during streaming

### 3. **Auto-Approval Settings** ⚠️ UNLIKELY
If auto-approval is configured incorrectly, the tool might be shown in chat for approval instead of opening the editor first.

**However**: Even manual-approval flow should open the diff editor before asking for approval (see line 168 in Write ToFileToolHandler.ts).

### 4. **VS Code Diff Command Failure** ⚠️ UNLIKELY
The `vscode.diff` command might be failing silently.

**How to verify**:
```typescript
// Add logging in VscodeDiffViewProvider.ts openDiffEditor():
console.log('[VscodeDiffViewProvider] Opening diff editor for:', this.absolutePath)
vscode.commands.executeCommand("vscode.diff", ...)
```

## Architecture Comparison

### Cline-Main (Working)
```
Stream arrives → block.partial=true → handlePartialBlock() → diffViewProvider.open() → Editor opens → diffViewProvider.update() → Content streams
```

### MarieCoder (Broken)
```
Stream arrives → block.partial=false? → handleCompleteBlock() → say("tool", ...) → Only shows in chat
```

## Solution Steps

### Step 1: Add Debug Logging
Add comprehensive logging to track the flow:

```typescript
// In ToolExecutor.ts, around line 280:
async handleToolUse(block: ToolUse): Promise<boolean> {
    console.log(`[ToolExecutor] Tool: ${block.name}, Partial: ${block.partial}`)
    // ... existing code
}

// In WriteToFileToolHandler.ts handlePartialBlock(), line 32:
async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
    console.log(`[WriteToFileToolHandler] handlePartialBlock called for ${block.params.path}`)
    // ... existing code
    if (!config.services.diffViewProvider.isEditing) {
        console.log(`[WriteToFileToolHandler] Opening diff editor for ${absolutePath}`)
        await config.services.diffViewProvider.open(absolutePath, ...)
    }
}
```

### Step 2: Verify Partial Flag
Check if `block.partial` is being set correctly during streaming:

```typescript
// In parse-assistant-message.ts or wherever ToolUse blocks are created:
// Ensure partial flag is set for streaming blocks
const toolUse: ToolUse = {
    ...
    partial: isStreaming,  // Make sure this is true during streaming
}
```

### Step 3: Test with Manual Logging
1. Open VS Code Developer Tools (Help → Toggle Developer Tools)
2. Run MarieCoder and try to edit a file
3. Watch console for log messages
4. Check if:
   - `handlePartialBlock` is called
   - `diffViewProvider.open()` is called
   - VS Code diff command executes

### Step 4: Compare Streaming Messages
Capture and compare the raw streaming messages between cline-main and MarieCoder:

```typescript
// In assistant message handler:
console.log('[Stream] Received message:', JSON.stringify(message, null, 2))
```

## Expected Behavior

### Correct Flow (Both Auto-Approve and Manual)
1. AI starts generating file edit
2. First partial block arrives with `partial: true`
3. `handlePartialBlock()` called
4. Diff editor opens in VS Code
5. Content streams into editor in real-time
6. Final block arrives with `partial: false`
7. `execute()` called for approval/auto-approve
8. User approves or it auto-approves
9. File is saved

### Current Broken Behavior
1. AI generates file edit
2. Block processed as complete (partial: false)?
3. `execute()` called instead of `handlePartialBlock()`
4. Tool shown in chat view only
5. No diff editor opens
6. Code appears in chat message

## Files to Review

### High Priority
1. `/src/core/assistant-message/parse-assistant-message.ts` - Check partial flag setting
2. `/src/core/task/ToolExecutor.ts` - Verify partial block routing
3. `/src/core/task/tools/handlers/WriteToFileToolHandler.ts` - Check handlePartialBlock logic

### Medium Priority
4. `/src/hosts/vscode/VscodeDiffViewProvider.ts` - Verify diff editor opening
5. `/src/integrations/editor/DiffViewProvider.ts` - Check base class logic

### Low Priority
6. Auto-approval settings configuration
7. Extension state management

## Testing Checklist

- [ ] Add debug logging to ToolExecutor and WriteToFileToolHandler
- [ ] Verify `block.partial` is true for streaming blocks
- [ ] Confirm `handlePartialBlock()` is being called
- [ ] Check if `diffViewProvider.open()` executes
- [ ] Verify VS Code diff command succeeds
- [ ] Test with both auto-approve enabled and disabled
- [ ] Compare message flow with working cline-main

## Quick Fix to Try

If the issue is simply that partial blocks aren't being detected, try forcing the diff editor to open in the `execute()` method as well:

```typescript
// In WriteToFileToolHandler.ts execute(), around line 165:
if (!config.services.diffViewProvider.isEditing) {
    const partialMessage = JSON.stringify(sharedMessageProps)
    await config.callbacks.ask("tool", partialMessage, true).catch(() => {})
    // ALWAYS open the diff editor, even if not streaming
    await config.services.diffViewProvider.open(absolutePath, { displayPath: relPath, autoFocus: true })
}
```

This ensures the editor opens regardless of whether the block was detected as partial or complete.

## Next Steps

1. Add debug logging (Step 1 above)
2. Run MarieCoder and attempt file edit
3. Analyze console output to identify where the flow diverges
4. Compare with cline-main behavior
5. Implement targeted fix based on findings

