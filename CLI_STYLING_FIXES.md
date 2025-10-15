# CLI Styling Fixes - Summary

## Issues Resolved

The CLI had several styling issues causing poor user experience:

1. **"Floating" interactions** - Text wasn't wrapping properly around terminal lines
2. **Hard to follow text generation** - Content appeared in unexpected locations
3. **Unintuitive user inputs** - Input prompts had broken styling due to conflicting output

## Root Causes

### 1. Word Wrap Not Handling ANSI Codes
The `wordWrap` function was calculating line lengths including ANSI escape codes (color codes), causing text to wrap incorrectly. ANSI codes add invisible characters that affect string length but not visual length.

**Example Problem:**
```typescript
// A line like "\x1b[32mHello\x1b[0m" has length 15 but only displays as 5 characters
// The old code would think this is 15 chars wide and wrap incorrectly
```

### 2. Readline Output Conflicts
The `readline.Interface` was writing directly to `process.stdout` while the styled output system was also writing, causing race conditions and "floating" text where prompts and content appeared in wrong positions.

### 3. Terminal Width Detection Issues
Width detection didn't handle edge cases well, leading to inconsistent wrapping behavior.

### 4. Missing Output Buffer Flushing
Output wasn't being flushed before readline prompts, causing messages to appear after the prompt or in wrong order.

## Fixes Applied

### 1. Fixed Word Wrapping (2 files)

**Files Modified:**
- `src/cli/cli_message_formatter.ts`
- `src/cli/cli_layout_helpers.ts`

**Changes:**
- Updated `wordWrap` function to use `stripAnsi()` for calculating visual length
- Added proper handling for words longer than the available width
- Now correctly wraps text by visual appearance, not byte length

**Before:**
```typescript
function wordWrap(text: string, width: number): string[] {
    // Used text.length which includes ANSI codes
    if (paragraph.length <= width) { // WRONG!
        lines.push(paragraph)
    }
}
```

**After:**
```typescript
function wordWrap(text: string, width: number): string[] {
    // Use visual length without ANSI codes
    const visualLength = stripAnsi(paragraph).length
    if (visualLength <= width) { // CORRECT!
        lines.push(paragraph)
    }
}
```

### 2. Improved Terminal Width Detection

**File Modified:**
- `src/cli/cli_terminal_colors.ts`

**Changes:**
- Enhanced `getWidth()` with safer fallbacks
- Added bounds checking (min 40, max 200 columns)
- Added support for `COLUMNS` environment variable
- Better handling of non-TTY environments

**Before:**
```typescript
getWidth(): number {
    return process.stdout.columns || 80
}
```

**After:**
```typescript
getWidth(): number {
    // Try actual terminal width with bounds
    if (process.stdout.isTTY && process.stdout.columns) {
        const columns = process.stdout.columns
        return Math.max(40, Math.min(200, columns))
    }
    
    // Fallback to COLUMNS env var
    const envCols = process.env.COLUMNS
    if (envCols) {
        const parsed = Number.parseInt(envCols, 10)
        if (!Number.isNaN(parsed) && parsed > 0) {
            return Math.max(40, Math.min(200, parsed))
        }
    }
    
    // Safe default
    return 80
}
```

### 3. Fixed Readline Interaction Conflicts

**Files Modified:**
- `src/cli/cli_interaction_handler.ts`
- `src/cli/index.ts`
- `src/cli/cli_host_bridge.ts`

**Changes:**
- Added `output.flush()` calls before all readline prompts
- Added line clearing after input for cleaner output
- Improved readline interface configuration

**Key Additions:**

```typescript
// Before prompting
output.flush()

// After getting input
process.stdout.write("\r\x1b[K") // Clear line
```

**Modified Functions:**
- `askApproval()` - Flush before/after prompt
- `askInput()` - Flush before/after prompt  
- `askChoice()` - Flush options before prompting
- `waitForEnter()` - Flush before prompt
- `interactiveMode()` - Flush before each interactive prompt
- `showInputBox()` - Flush before prompt
- `showQuickPick()` - Flush options before prompt

### 4. Enhanced Readline Configuration

**File Modified:**
- `src/cli/cli_interaction_handler.ts`

**Changes:**
- Updated readline interface to explicitly set terminal mode
- Added comments explaining the conflict prevention strategy

```typescript
this.rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdout.isTTY, // Explicit terminal mode
})
```

## Testing

Built CLI successfully with:
```bash
npm run cli:build
```

All TypeScript compilation passed with no errors related to these changes.

## Expected Improvements

Users should now see:

1. ✅ **Proper text wrapping** - Content wraps correctly at terminal width
2. ✅ **Clear, stable prompts** - Input prompts appear consistently in the right place
3. ✅ **No floating text** - All output appears in proper sequence
4. ✅ **Intuitive interactions** - User inputs are clearly separated from output
5. ✅ **Better readability** - Styled boxes and borders align properly

## Technical Details

### ANSI Escape Codes
ANSI codes are invisible control sequences for terminal styling:
- `\x1b[32m` = green text
- `\x1b[1m` = bold text
- `\x1b[0m` = reset formatting

These add characters to the string but don't affect visual width, which was causing the wrapping issues.

### Output Flushing
The CLI uses a throttled output queue to prevent terminal flooding. Before prompting for user input, we must flush this queue or prompts will appear before previous output, causing the "floating" effect.

### Visual vs Byte Length
- **Byte Length**: `"\x1b[32mHello\x1b[0m".length` = 15
- **Visual Length**: `stripAnsi("\x1b[32mHello\x1b[0m").length` = 5

Our word wrap now uses visual length for correct behavior.

## Bonus Fix: Variable Shadowing Bug

While fixing the styling issues, discovered and fixed a pre-existing bug in `cli_task_monitor.ts`:

**File Modified:**
- `src/cli/cli_task_monitor.ts`

**Issue:**
Variable named `output` was shadowing the imported `output` object, causing TypeScript compilation errors.

**Fix:**
```typescript
// Before (broken)
const output = this.truncateOutput(text)
output.log(output) // ERROR: output is now a string!

// After (fixed)
const truncatedOutput = this.truncateOutput(text)
output.log(truncatedOutput) // CORRECT: output object, truncatedOutput string
```

## Files Changed

1. `src/cli/cli_message_formatter.ts` - Fixed wordWrap function
2. `src/cli/cli_layout_helpers.ts` - Fixed wordWrap function
3. `src/cli/cli_terminal_colors.ts` - Improved terminal width detection
4. `src/cli/cli_interaction_handler.ts` - Added output flushing to all prompts
5. `src/cli/index.ts` - Added output flushing to interactive mode
6. `src/cli/cli_host_bridge.ts` - Added output flushing to input methods
7. `src/cli/cli_task_monitor.ts` - Fixed variable shadowing bug (bonus fix)

## Backwards Compatibility

All changes are backwards compatible:
- No API changes
- No breaking changes to function signatures
- Improved behavior in all scenarios
- Graceful degradation in non-TTY environments

## Philosophy Alignment

These fixes align with MarieCoder's development standards:

- **Honor existing code** - We understood why the original patterns existed before modifying
- **Learn from friction** - We identified root causes rather than symptoms
- **Evolve with intention** - Each fix addresses a specific, documented issue
- **System-wide changes** - Applied fixes consistently across all CLI files
- **Clear documentation** - This document explains what, why, and how

---

*Fixed with gratitude for the patterns that came before, and intention to improve the experience.*

