# Diff Editor Testing Instructions

## ✅ Debug Logging Complete

All critical code paths now have comprehensive debug logging to identify why the diff editor isn't opening.

## Testing Steps

### 1. Rebuild and Restart
```bash
cd /Users/bozoegg/Desktop/MarieCoder
npm run compile
```

Then restart VS Code completely (not just reload window).

### 2. Open Developer Tools
1. Start MarieCoder
2. `Cmd+Shift+P` → "Toggle Developer Tools"
3. Go to Console tab
4. Clear console (trash icon)

### 3. Test File Edit Operation

Send one of these messages to MarieCoder:

**Test A: Create New File**
```
Create a new file called test_debug.js with a simple hello world function
```

**Test B: Edit Existing File**
```
Edit the package.json file and add a new script called "debug-test"
```

**Test C: Replace in File** (if you have a specific file)
```
In src/example.ts, change the function name from oldName to newName
```

### 4. Analyze Console Output

Look for these log messages in order:

#### Step 1: Block Presentation
```
[TaskApiService] presentAssistantMessage - Block type: tool_use, partial: true
[TaskApiService] 🔥 Calling toolExecutor.executeTool for write_to_file
```
✅ **If you see this**: Block is being processed
❌ **If missing**: Blocks aren't reaching presentation

#### Step 2: Tool Execution
```
[ToolExecutor] Executing tool: write_to_file, partial: true, path: test_debug.js
```
✅ **If partial: true**: Parser is working correctly
❌ **If partial: false**: Parser bug - partial flag not set

#### Step 3: Partial Block Routing
```
[ToolExecutor] ✅ Calling handlePartialBlock for write_to_file
```
✅ **If you see this**: Routing is correct
❌ **If you see "Calling handleCompleteBlock"**: Block wrongly marked as complete

#### Step 4: Handler Entry
```
[WriteToFileToolHandler] handlePartialBlock called for write_to_file, path: test_debug.js
```
✅ **If you see this**: Handler is being called
❌ **If missing**: Handler not reached

#### Step 5: Parameter Check
```
[WriteToFileToolHandler] Not enough data yet - path: true, content: false, diff: false
```
✅ **If all true**: Parameters present
❌ **If content/diff false**: Early return will trigger - **THIS IS THE LIKELY ISSUE**

#### Step 6: Validation
```
[WriteToFileToolHandler] validateAndPrepareFileOperation called - path: test_debug.js, hasDiff: false, hasContent: true
```
✅ **If you see this**: Validation is running
❌ **If missing**: Early return happened before validation

#### Step 7: Editor Opening
```
[WriteToFileToolHandler] 🔥 Opening diff editor for /absolute/path/to/test_debug.js
[VscodeDiffViewProvider] 🔥 openDiffEditor called for /absolute/path/to/test_debug.js
[VscodeDiffViewProvider] Starting openDiffEditorWithRetry...
[VscodeDiffViewProvider] ✅ Diff editor opened successfully
```
✅ **If you see all these**: Editor opening works!
❌ **If stops midway**: Editor opening failure

## Diagnostic Decision Tree

```
Did you see "presentAssistantMessage"?
├─ NO → Stream processing broken, check ApiStreamManager
└─ YES → Continue...
    │
    Did you see "partial: true"?
    ├─ NO → Parser not setting partial flag
    │        Fix: parse-assistant-message.ts
    └─ YES → Continue...
        │
        Did you see "Calling handlePartialBlock"?
        ├─ NO → Block routing broken
        │        Fix: ToolExecutor.execute() conditional
        └─ YES → Continue...
            │
            Did you see "Not enough data yet"?
            ├─ YES → FOUND IT! Early return triggering
            │         Fix: Remove/modify early return condition
            └─ NO → Continue...
                │
                Did you see "Validation failed"?
                ├─ YES → Validation returning null
                │         Fix: Add logging to validateAndPrepareFileOperation
                └─ NO → Continue...
                    │
                    Did you see "Opening diff editor"?
                    ├─ NO → Code not reaching editor open
                    │        Fix: Check logic between validation and open
                    └─ YES → Continue...
                        │
                        Did you see "Diff editor opened successfully"?
                        ├─ NO → VSCode command failing
                        │        Fix: Check timeout, permissions, VS Code version
                        └─ YES → IT WORKS! 🎉
```

## Most Likely Issue (80% Confidence)

Based on the code analysis, **the early return condition** is the most likely culprit:

```typescript
// Line ~40 in handlePartialBlock:
if (!rawRelPath || (!rawContent && !rawDiff)) {
    return  // ← THIS IS PROBABLY BLOCKING THE EDITOR FROM OPENING!
}
```

### Why This Breaks Streaming

During streaming, the AI generates XML like this:
```xml
<write_to_file>
<path>test.js</path>
<content>
function hello() {
    // Content still streaming...
```

At the first partial update:
- ✅ `path` is extracted: "test.js"
- ❌ `content` is incomplete/empty: ""
- ❌ Early return triggers!
- ❌ Editor never opens!

### The Fix

Replace the early return with:
```typescript
// Only return if path is missing
if (!rawRelPath) {
    console.log(`[WriteToFileToolHandler] Missing path, skipping`)
    return
}

// Continue processing even if content/diff not yet complete
// Editor will open and content will stream in as it arrives
```

## After Getting Console Output

1. **Copy the full console output**
2. **Identify which step failed** using the decision tree above
3. **Report finding**: "Failed at Step X: [description]"
4. **Apply the corresponding fix**
5. **Rebuild and retest**

## Quick Test (30 seconds)

```
1. Open VS Code
2. Open Developer Tools Console
3. Send: "Create test.js with hello world"
4. Watch console
5. Report what you see
```

That's it! The logs will tell us exactly what's wrong.

