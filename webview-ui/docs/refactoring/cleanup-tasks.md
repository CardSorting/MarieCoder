# Cleanup Tasks

**Priority**: ⚠️ Low  
**Estimated Effort**: 1 session

---

## 🎯 Goal

Remove legacy and unused files, verify no dependencies, and clean up the codebase.

---

## 📋 Files Identified for Cleanup

### 1. **ExtensionStateContext.old.tsx** (707 lines)
**Location**: `/webview-ui/src/context/ExtensionStateContext.old.tsx`

**Status**: Legacy file (indicated by `.old` suffix)

**Assessment Required**:
- Verify no imports reference this file
- Check if it's used for historical reference or fallback
- Determine if it contains any unique logic not in current `ExtensionStateContext.tsx`

---

## 📝 Step-by-Step Cleanup Process

### **Step 1: Search for References** (10 min)

```bash
# Search for imports of the .old file
grep -r "ExtensionStateContext.old" /Users/bozoegg/Desktop/MarieCoder/webview-ui/src/

# Search for any .old file references in general
grep -r "\.old" /Users/bozoegg/Desktop/MarieCoder/webview-ui/src/ --include="*.ts" --include="*.tsx"
```

**Expected Result**: No active imports should reference the `.old` file

---

### **Step 2: Compare with Current Implementation** (20 min)

**Action**: Read both files side-by-side and identify differences

```bash
# Create a diff to see what changed
diff -u \
  /Users/bozoegg/Desktop/MarieCoder/webview-ui/src/context/ExtensionStateContext.old.tsx \
  /Users/bozoegg/Desktop/MarieCoder/webview-ui/src/context/ExtensionStateContext.tsx
```

**Questions to Answer**:
- [ ] Are there any unique functions or hooks in the `.old` file?
- [ ] Is there any unique state management logic?
- [ ] Are there comments or documentation worth preserving?
- [ ] Is this file referenced in any documentation?

---

### **Step 3: Document Lessons Learned** (10 min)

**If unique logic exists**, extract it and document:

**File to create**: `docs/refactoring/lessons_from_extension_state_context.md`

```markdown
# Lessons from ExtensionStateContext Evolution

## What Changed

### Before (ExtensionStateContext.old.tsx)
- [Document key approach]
- [List notable patterns]

### After (ExtensionStateContext.tsx)
- [Document improvements]
- [Explain why changes were made]

## Key Lessons

1. **Lesson 1**: Description
2. **Lesson 2**: Description

## Wisdom to Carry Forward

- [List reusable insights]
```

---

### **Step 4: Remove the File** (5 min)

**Only proceed if**:
- ✅ No active references found
- ✅ No unique logic needs preservation
- ✅ Documentation created (if needed)

```bash
# Remove the legacy file
rm /Users/bozoegg/Desktop/MarieCoder/webview-ui/src/context/ExtensionStateContext.old.tsx
```

**Git Commit**:
```bash
git add /Users/bozoegg/Desktop/MarieCoder/webview-ui/src/context/ExtensionStateContext.old.tsx
git commit -m "chore: remove legacy ExtensionStateContext.old.tsx

The legacy context file is no longer referenced and has been
superseded by the current ExtensionStateContext implementation.

Lessons learned:
- [Key lesson 1]
- [Key lesson 2]

Verified no active imports before removal."
```

---

### **Step 5: Search for Other Legacy Files** (15 min)

**Action**: Look for other potential cleanup candidates

```bash
# Find files with .old, .backup, or .bak extensions
find /Users/bozoegg/Desktop/MarieCoder/webview-ui/src/ \
  -type f \( -name "*.old.*" -o -name "*.backup.*" -o -name "*.bak.*" \)

# Find files with TODO or FIXME comments
grep -r "TODO\|FIXME\|XXX\|HACK" \
  /Users/bozoegg/Desktop/MarieCoder/webview-ui/src/ \
  --include="*.ts" --include="*.tsx" \
  | head -20

# Find unused exports (requires analysis tool)
# Can use ts-unused-exports or similar
```

**Document findings** in this file for future cleanup

---

## 📊 Additional Cleanup Opportunities

### Potential Technical Debt

Based on the analysis, here are other areas worth investigating:

1. **Commented-out code blocks**
   - Search for large commented sections
   - Determine if they're documentation or dead code
   - Remove or convert to proper documentation

2. **Duplicate utility functions**
   - Look for similar functions across files
   - Consolidate into shared utilities

3. **Unused imports**
   - Use TypeScript language server or ESLint
   - Remove unused imports automatically

4. **Console.log statements**
   - Find and remove debug logging
   - Replace with proper debug utility

---

## 🔍 Verification Commands

### After Cleanup, Run:

```bash
# 1. Check for TypeScript errors
cd /Users/bozoegg/Desktop/MarieCoder/webview-ui
npm run typecheck

# 2. Run linter
npm run lint

# 3. Build the project
npm run build

# 4. Run tests (if available)
npm test
```

**All should pass** ✅

---

## ✅ Cleanup Checklist

### ExtensionStateContext.old.tsx
- [ ] Searched for all references
- [ ] Compared with current implementation
- [ ] Documented unique logic (if any)
- [ ] Removed file from codebase
- [ ] Committed with descriptive message
- [ ] Verified build still works

### General Cleanup
- [ ] Searched for other `.old` files
- [ ] Identified TODOs and FIXMEs
- [ ] Ran linter and fixed warnings
- [ ] Removed unused imports
- [ ] Removed console.log statements
- [ ] Build passes
- [ ] Tests pass

---

## 🚨 Important Reminders

### DO NOT REMOVE if:
- ❌ File is actively imported anywhere
- ❌ File contains unique logic not preserved elsewhere
- ❌ Uncertainty about file's purpose
- ❌ No time to properly document lessons learned

### When in doubt:
1. Create an issue/ticket to investigate later
2. Add a comment in the file explaining why it's kept
3. Ask team members if they know the file's history

---

## 📝 Commit Message Template

```
chore: remove legacy file [filename]

[Brief explanation of what the file was and why it's no longer needed]

Verified:
- No active imports found
- [Unique logic preserved/not needed]
- Build passes
- Tests pass

Lessons learned:
- [Lesson 1]
- [Lesson 2]
```

---

## 🎓 Lessons for Future Refactoring

### Creating `.old` files
**Avoid**: Creating `.old` copies of files  
**Instead**: Use git history for reference

### Deprecation Process
When replacing a file:
1. Mark as deprecated with clear comments
2. Add console warnings if it's imported
3. Set removal deadline
4. Document migration path
5. Remove after deadline

### Better Practices
- Use feature flags for gradual rollouts
- Keep git history clean and meaningful
- Document architectural decisions
- Use proper versioning

---

*Start Date: TBD*  
*Target Completion: TBD*  
*Actual Completion: TBD*

