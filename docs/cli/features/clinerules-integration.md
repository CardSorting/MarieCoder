# CLI Cline Rules Integration

## Overview

The MarieCoder CLI now automatically loads and applies `.clinerules` from workspaces by default, ensuring consistent coding standards across both the VSCode extension and CLI environments.

## Changes Implemented

### 1. Core Integration (`src/cli/index.ts`)

Added `ensureClineRulesEnabled()` method that:
- Runs during CLI initialization (before any tasks)
- Calls `refreshAllToggles()` to discover and sync all rule files
- Enables all discovered rules by default (existing behavior preserved)
- Provides user feedback when rules are loaded

**Key Benefits:**
- Rules are loaded automatically - no configuration required
- Consistent with VSCode extension behavior
- Provides visibility into which rules are active

### 2. User Feedback

The CLI now displays:
```
✓ Loaded 1 local rule file from .clinerules/
```

This confirms to users that their project's coding standards are being applied.

### 3. Documentation Updates

#### CLI Help Message (`src/cli/index.ts`)
Added clarification that Cline Rules are automatically loaded:
```
Cline Rules: The CLI automatically loads and applies .clinerules from your
workspace directory. Rules are enabled by default and help MarieCoder
follow your project's coding standards and conventions.
```

#### CLI README (`CLI_README.md`)
Added comprehensive "Cline Rules Integration" section covering:
- How to create and use `.clinerules`
- What Cline Rules are and why they're useful
- Where rules are stored (local vs global)
- Expected user feedback
- Link to full documentation

## How It Works

### Rule Discovery Process

1. **Initialization**: When CLI starts, it calls `ensureClineRulesEnabled()`
2. **Sync**: Calls `refreshAllToggles()` which:
   - Scans `.clinerules/` directory in workspace
   - Scans `~/Documents/Cline/Rules/` for global rules
   - Creates toggle entries for all discovered files
3. **Default State**: New rules default to `enabled: true`
4. **Load**: Rules are loaded into system prompt context
5. **Apply**: AI applies rules when executing tasks

### Rule Locations

- **Local Rules** (project-specific): `.clinerules/` in workspace root
- **Global Rules** (all projects): `~/Documents/Cline/Rules/`

### Example Workflow

```bash
# Navigate to project
cd ~/my-project

# Project has .clinerules/standards.md
ls .clinerules/
# > standards.md

# Run CLI
mariecoder "Create a new component"

# Output shows rules loaded:
# 🚀 Initializing MarieCoder CLI...
# ✓ Loaded 1 local rule file from .clinerules/
# ✅ MarieCoder CLI initialized
```

## Technical Details

### Code Changes

#### Added Method: `ensureClineRulesEnabled()`

```typescript
private async ensureClineRulesEnabled(): Promise<void> {
  try {
    const controller = this.webviewProvider.controller
    const {
      refreshAllToggles,
      getLocalClineRules,
      getGlobalClineRules,
    } = await import("@/core/context/instructions/user-instructions/rule_loader")

    // Refresh and sync all rule toggles
    const allToggles = await refreshAllToggles(controller, this.options.workspace)

    // Check if rules exist and report to user
    const localRules = await getLocalClineRules(this.options.workspace, allToggles.localClineRules)
    const globalRules = await getGlobalClineRules(allToggles.globalClineRules)

    // Provide user feedback
    if (localRules) {
      const ruleCount = Object.keys(allToggles.localClineRules).length
      console.log(`✓ Loaded ${ruleCount} local rule file${ruleCount !== 1 ? 's' : ''} from .clinerules/`)
    }

    if (globalRules && this.options.verbose) {
      const globalRuleCount = Object.keys(allToggles.globalClineRules).length
      console.log(`✓ Loaded ${globalRuleCount} global rule file${globalRuleCount !== 1 ? 's' : ''}`)
    }

    if (!localRules && !globalRules && this.options.verbose) {
      console.log("ℹ No .clinerules found in workspace or global directory")
    }
  } catch (error) {
    if (this.options.verbose) {
      console.warn("⚠ Could not sync cline rules:", error)
    }
    // Non-fatal error - continue initialization
  }
}
```

#### Integration Point

```typescript
async initialize(): Promise<void> {
  // ... existing initialization code ...

  // Ensure clinerules are loaded and enabled by default for CLI
  await this.ensureClineRulesEnabled()

  console.log("✅ MarieCoder CLI initialized")
}
```

### Existing System Behavior (Preserved)

The underlying rule system was already functional:
- `syncToggles()` defaults new rules to `true` (enabled)
- `refreshAllToggles()` discovers and syncs rules from filesystem
- `getLocalClineRules()` and `getGlobalClineRules()` load rule content
- Rules are included in system prompt via `task_api_service.ts`

**This change ensures the CLI explicitly calls these functions during initialization**, making rule loading transparent and guaranteed.

## Testing

### Build Test
```bash
npm run cli:build
# ✅ CLI built successfully!
```

### Manual Testing
```bash
# Test with workspace that has .clinerules
cd ~/Desktop/MarieCoder
npm run cli -- "test task"

# Expected output:
# 🚀 Initializing MarieCoder CLI...
# ✓ Loaded 1 local rule file from .clinerules/
# ✅ MarieCoder CLI initialized
```

## Benefits

1. **Consistency**: Same rule system as VSCode extension
2. **Automatic**: No configuration required
3. **Transparent**: Users see what rules are loaded
4. **Flexible**: Works with both local and global rules
5. **Safe**: Non-fatal errors don't break CLI initialization

## Future Enhancements

- Add `--disable-rules` flag to skip rule loading
- Add `--list-rules` to show active rules
- Support rule toggling via CLI flags
- Add `--rules-verbose` for detailed rule loading info

## Related Files

- `src/cli/index.ts` - Main CLI implementation
- `src/core/context/instructions/user-instructions/rule_loader.ts` - Rule loading logic
- `src/core/task/services/task_api_service.ts` - System prompt integration
- `CLI_README.md` - User documentation
- `.clinerules/konmari-method.md` - Example rule file in this project

## Verification

To verify rules are working:

1. **Check if rules exist**:
   ```bash
   ls .clinerules/
   ```

2. **Run CLI with verbose flag**:
   ```bash
   mariecoder --verbose "test"
   ```

3. **Look for confirmation**:
   ```
   ✓ Loaded X local rule file(s) from .clinerules/
   ```

4. **Verify AI behavior**: AI should follow conventions specified in rules

## Migration Notes

No migration required. This is a new feature that:
- Preserves existing behavior
- Adds new functionality
- Backward compatible with existing CLI usage

---

*Implemented with MarieCoder's KonMari-inspired philosophy: honoring existing patterns, evolving with intention, and creating clarity for users.*

