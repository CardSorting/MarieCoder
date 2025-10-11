# Undo Command Documentation

> Restore to the last checkpoint and revert changes

**Command:** `/undo`  
**Aliases:** `/revert`  
**Status:** ✅ Available

---

## 📋 Overview

The `/undo` command allows you to revert changes and restore your task to the last checkpoint. This is useful when:
- The AI made unwanted changes
- You want to try a different approach
- You need to rollback after an error
- You want to experiment safely

The command integrates with MarieCoder's Git-based checkpoint system to provide precise state restoration.

---

## 🎯 Usage

### Basic Usage

```bash
/undo              # Undo everything (task + workspace)
/undo all          # Same as above
/undo task         # Only restore task messages
/undo workspace    # Only restore workspace files
```

### Restore Modes

**1. Full Undo (Default)**
```bash
/undo
/undo all
/undo both
```
Restores both task messages and workspace files to the last checkpoint.

**2. Task Only**
```bash
/undo task
/undo messages
```
Only restores task messages and conversation history. Workspace files remain unchanged.

**3. Workspace Only**
```bash
/undo workspace
/undo files
```
Only restores workspace files. Task messages and conversation remain unchanged.

---

## 💡 How It Works

### Checkpoint System

1. **Automatic Creation**: Checkpoints are created automatically when you make your first API request in a task
2. **Shadow Git**: Changes are tracked in an isolated Git repository that doesn't interfere with your main repo
3. **Message Tracking**: Each checkpoint is associated with a specific message in the conversation
4. **Restoration**: The `/undo` command finds the last checkpoint and restores to that state

### Restoration Process

```
Current State
     ↓
Find Last Checkpoint (timestamp from messages)
     ↓
Determine Restore Type (task, workspace, or both)
     ↓
Call Checkpoint Manager
     ↓
Restore State
     ↓
Update Task
     ↓
Continue from Checkpoint
```

---

## 📖 Examples

### Example 1: Undo All Changes

**Scenario**: The AI made multiple file changes you don't like

```bash
$ mariecoder "Refactor the authentication module"
# ... AI makes various changes ...
# You realize you don't like the approach

$ /undo
⏮️  Undoing changes...
────────────────────────────────────────────────────────────────────────────────
Restoring to checkpoint: 10/11/2025, 2:30:45 PM
Restore type: taskAndWorkspace
────────────────────────────────────────────────────────────────────────────────

✅ Successfully restored to last checkpoint!
   ✓ Task messages restored
   ✓ Workspace files restored
   ✓ All changes reverted

💡 Tip: You can now continue the task from this point.
```

### Example 2: Undo Only Task Messages

**Scenario**: You want to keep file changes but reset the conversation

```bash
$ /undo task
⏮️  Undoing changes...
────────────────────────────────────────────────────────────────────────────────
Restoring to checkpoint: 10/11/2025, 2:30:45 PM
Restore type: task
────────────────────────────────────────────────────────────────────────────────

✅ Successfully restored to last checkpoint!
   ✓ Task messages restored
   ✓ Conversation history rolled back

💡 Tip: You can now continue the task from this point.
```

### Example 3: Undo Only Workspace Files

**Scenario**: You want to keep the conversation but revert file changes

```bash
$ /undo workspace
⏮️  Undoing changes...
────────────────────────────────────────────────────────────────────────────────
Restoring to checkpoint: 10/11/2025, 2:30:45 PM
Restore type: workspace
────────────────────────────────────────────────────────────────────────────────

✅ Successfully restored to last checkpoint!
   ✓ Workspace files restored
   ✓ File changes reverted

💡 Tip: You can now continue the task from this point.
```

### Example 4: No Checkpoint Available

**Scenario**: Trying to undo before any checkpoint exists

```bash
$ /undo
❌ No checkpoint found to restore from.
   Checkpoints are created automatically on the first API request.
   Make sure you have executed at least one task.
```

---

## ⚙️ Configuration

### Enable Checkpoints

Checkpoints must be enabled in your settings:

```json
{
  "enableCheckpointsSetting": true
}
```

### Checkpoint Storage

Checkpoints are stored in:
```
~/.mariecoder/cli/checkpoints/
```

Each workspace has its own shadow Git repository.

---

## 🔍 Related Commands

### Checkpoint Commands

```bash
/checkpoint status    # Check checkpoint system status
/checkpoint create    # Create a checkpoint manually
/checkpoint changes   # Check for changes since last completion
```

### Workflow

1. Start a task: `mariecoder "Your task here"`
2. Checkpoint is created automatically
3. AI makes changes
4. If needed, undo: `/undo`
5. Continue from checkpoint

---

## 🎓 Best Practices

### When to Use Undo

✅ **Good Use Cases:**
- AI made unwanted changes
- Want to try a different approach
- Need to rollback after an error
- Experimenting with different solutions

❌ **Not Ideal For:**
- Undoing a single file (use Git instead)
- Going back multiple checkpoints (use checkpoint restore)
- Recovering deleted files outside of task (use Git)

### Undo Strategy

1. **Quick Experiment**: Use `/undo` to quickly try different approaches
2. **Selective Restore**: Use restore modes to keep what you want
3. **Manual Checkpoints**: Create checkpoints before risky operations with `/checkpoint create`
4. **Verify Changes**: Check what changed with `/checkpoint changes` before undoing

---

## 🚨 Common Issues

### Issue: No Checkpoint Found

**Problem**: `/undo` says no checkpoint available

**Solution**: 
- Ensure checkpoints are enabled in settings
- Make sure you've made at least one API request in the task
- Checkpoints are created automatically on the first request

### Issue: Checkpoint Manager Not Available

**Problem**: Error about checkpoint manager not available

**Solution**:
- Enable checkpoints: `"enableCheckpointsSetting": true`
- Restart the CLI after enabling
- Check that you have an active task

### Issue: Restore Failed

**Problem**: Restore operation fails

**Solution**:
- Check that Git is installed
- Ensure shadow Git repository is intact
- Check file permissions in `~/.mariecoder/cli/`
- Try creating a new checkpoint first

---

## 🔧 Advanced Usage

### Combining with Manual Checkpoints

```bash
# Create a checkpoint before risky operation
/checkpoint create

# Try something experimental
mariecoder "Experimental refactor"

# If it doesn't work, undo
/undo

# If it worked, create another checkpoint
/checkpoint create
```

### Selective Restoration

```bash
# Keep file changes, reset conversation
/undo task

# Or keep conversation, reset files
/undo workspace
```

### Checking Before Undoing

```bash
# Check if there are changes to undo
/checkpoint changes

# View checkpoint status
/checkpoint status

# Then undo if needed
/undo
```

---

## 📊 Technical Details

### Restoration Types

| Type | Task Messages | Workspace Files | Use Case |
|------|--------------|-----------------|----------|
| `taskAndWorkspace` | ✅ Restored | ✅ Restored | Complete undo |
| `task` | ✅ Restored | ❌ Kept | Reset conversation only |
| `workspace` | ❌ Kept | ✅ Restored | Revert files only |

### Implementation

- Uses `ICheckpointManager.restoreCheckpoint()`
- Finds last `checkpoint_created` message
- Restores from shadow Git repository
- Updates task state and conversation history
- Compatible with extension's checkpoint system

---

## 🎯 Tips & Tricks

1. **Safety Net**: Create manual checkpoints before risky operations
2. **Experiment Freely**: Use undo to try different approaches without fear
3. **Selective Undo**: Use restore modes to keep parts you want
4. **Check First**: Use `/checkpoint changes` to see what will be reverted
5. **Combine Tools**: Use with Git for complete version control

---

## 📚 See Also

- [Checkpoint System Documentation](./checkpoints-integration.md)
- [CLI Quick Reference](../quick-reference.md)
- [Phase 3 Implementation Summary](../PHASE3_IMPLEMENTATION_SUMMARY.md)

---

**Last Updated:** October 11, 2025  
**Status:** Production Ready  
**Version:** 1.3.0

