# Todo List Feature Missing in MarieCoder

## Problem
The initial planning "to do lists" feature doesn't work in MarieCoder compared to cline-main.

## Root Cause: Missing AUTO_TODO Component

### What's Missing
MarieCoder is **completely missing** the `auto_todo.ts` component that provides automatic todo list management functionality.

### Evidence

#### cline-main (Working)
File: `/src/core/prompts/system-prompt/components/index.ts`
```typescript
export function getSystemPromptComponents() {
    return [
        { id: SystemPromptSection.AGENT_ROLE, fn: getAgentRoleSection },
        { id: SystemPromptSection.SYSTEM_INFO, fn: getSystemInfo },
        { id: SystemPromptSection.MCP, fn: getMcp },
        { id: SystemPromptSection.TODO, fn: getTodoListSection },  // ← THIS IS MISSING IN MARIECODER!
        { id: SystemPromptSection.USER_INSTRUCTIONS, fn: getUserInstructions },
        { id: SystemPromptSection.TOOL_USE, fn: getToolUseSection },
        // ... more sections
    ]
}
```

#### MarieCoder (Broken)
File: `/src/core/prompts/system-prompt/components/index.ts`
```typescript
export function getSystemPromptComponents() {
    return [
        { id: SystemPromptSection.AGENT_ROLE, fn: getAgentRoleSection },
        { id: SystemPromptSection.EDITING_FILES, fn: getEditingFilesSection },
        { id: SystemPromptSection.MCP, fn: getMcp },
        { id: SystemPromptSection.OBJECTIVE, fn: getObjectiveSection },
        { id: SystemPromptSection.ACT_VS_PLAN, fn: getActVsPlanModeSection },
        { id: SystemPromptSection.RULES, fn: getRulesSection },
        { id: SystemPromptSection.SYSTEM_INFO, fn: getSystemInfo },
        { id: SystemPromptSection.TASK_PROGRESS, fn: getTaskProgressSection },
        { id: SystemPromptSection.TOOL_USE, fn: getToolUseSection },
        { id: SystemPromptSection.USER_INSTRUCTIONS, fn: getUserInstructions },
        // NO TODO SECTION! ❌
    ]
}
```

### What the TODO Component Does

From cline-main's `auto_todo.ts`:

```typescript
const TODO_LIST_TEMPLATE_TEXT = `AUTOMATIC TODO LIST MANAGEMENT

The system automatically manages todo lists to help track task progress:

- Every 10th API request, you will be prompted to review and update the current todo list if one exists
- When switching from PLAN MODE to ACT MODE, you should create a comprehensive todo list for the task
- Todo list updates should be done silently using the task_progress parameter - do not announce these updates to the user
- Use standard Markdown checklist format: "- [ ]" for incomplete items and "- [x]" for completed items
- The system will automatically include todo list context in your prompts when appropriate
- Focus on creating actionable, meaningful steps rather than granular technical details`
```

## Impact

Without this component, the AI:
- ❌ Doesn't know to create todo lists when switching PLAN → ACT mode
- ❌ Doesn't get prompted every 10 requests to update todo lists
- ❌ Doesn't understand automatic todo list management
- ❌ May not create initial planning checklists properly

## Solution

### Step 1: Create the Missing auto_todo.ts Component

Create file: `/Users/bozoegg/Desktop/MarieCoder/src/core/prompts/system-prompt/components/auto_todo.ts`

```typescript
import { SystemPromptSection } from "../templates/section_definitions"
import { CommonConditions, createComponent } from "./base_component"

/**
 * Automatic Todo List Management
 * Provides instructions for creating and managing todo lists during task execution
 */

const TODO_LIST_TEMPLATE_TEXT = `AUTOMATIC TODO LIST MANAGEMENT

The system automatically manages todo lists to help track task progress:

- Every 10th API request, you will be prompted to review and update the current todo list if one exists
- When switching from PLAN MODE to ACT MODE, you should create a comprehensive todo list for the task
- Todo list updates should be done silently using the task_progress parameter - do not announce these updates to the user
- Use standard Markdown checklist format: "- [ ]" for incomplete items and "- [x]" for completed items
- The system will automatically include todo list context in your prompts when appropriate
- Focus on creating actionable, meaningful steps rather than granular technical details`

export const getTodoListSection = createComponent({
	section: SystemPromptSection.TODO,
	defaultTemplate: TODO_LIST_TEMPLATE_TEXT,
	shouldInclude: CommonConditions.requiresFocusChain,
})
```

### Step 2: Update components/index.ts

Add the import and registration:

```typescript
// Add to imports at top:
import { getTodoListSection } from "./auto_todo"

// Update getSystemPromptComponents():
export function getSystemPromptComponents() {
	return [
		{ id: SystemPromptSection.AGENT_ROLE, fn: getAgentRoleSection },
		{ id: SystemPromptSection.EDITING_FILES, fn: getEditingFilesSection },
		{ id: SystemPromptSection.MCP, fn: getMcp },
		{ id: SystemPromptSection.TODO, fn: getTodoListSection }, // ← ADD THIS LINE
		{ id: SystemPromptSection.OBJECTIVE, fn: getObjectiveSection },
		{ id: SystemPromptSection.ACT_VS_PLAN, fn: getActVsPlanModeSection },
		{ id: SystemPromptSection.RULES, fn: getRulesSection },
		{ id: SystemPromptSection.SYSTEM_INFO, fn: getSystemInfo },
		{ id: SystemPromptSection.TASK_PROGRESS, fn: getTaskProgressSection },
		{ id: SystemPromptSection.TOOL_USE, fn: getToolUseSection },
		{ id: SystemPromptSection.USER_INSTRUCTIONS, fn: getUserInstructions },
	]
}
```

### Step 3: Verify SystemPromptSection.TODO Exists

Check `/src/core/prompts/system-prompt/templates/section_definitions.ts` (or placeholders.ts) to ensure `TODO` is defined:

```typescript
export enum SystemPromptSection {
    // ... other sections
    TODO = "TODO",
    // ... other sections
}
```

If it's missing, add it to the enum.

## Testing

After implementing the fix:

1. **Start a new task** in MarieCoder
2. **Ask for planning mode**: "Switch to PLAN mode"
3. **Ask for a complex task**: "Create a new feature with multiple steps"
4. **Observe**: AI should create a detailed todo list
5. **Switch to ACT mode**: "Switch to ACT mode to implement the plan"
6. **Verify**: AI should reference and update the todo list as it progresses

## Files to Create/Modify

### Create:
1. ✅ `/src/core/prompts/system-prompt/components/auto_todo.ts`

### Modify:
2. ✅ `/src/core/prompts/system-prompt/components/index.ts`
3. ⚠️ `/src/core/prompts/system-prompt/templates/section_definitions.ts` (if TODO enum is missing)

## Why This Happened

During MarieCoder's refactoring ("KonMari-Tidied Structure"), the `auto_todo.ts` component was likely:
- Accidentally deleted during consolidation
- Merged into another component and lost
- Not ported from cline-main during updates

The comment in `index.ts` mentions:
```
Tidied from 13 → 10 files (23% reduction) with 100% clarity improvement
```

The TODO component was one of the 3 files that was removed during "tidying", but it should NOT have been removed - it's a critical feature!

## Alignment with MarieCoder Philosophy

This fix follows the KonMari approach:
- **Observe**: The TODO feature served an important purpose
- **Learn**: We discovered it was essential, not redundant
- **Evolve**: Restore it with clean, self-explanatory naming
- **Share**: Document why it's important

### Suggested File Name
Following MarieCoder's snake_case convention:
- `auto_todo.ts` → `automatic_todo_management.ts` (more self-explanatory)

## Expected Behavior After Fix

✅ AI creates detailed todo lists when starting complex tasks
✅ AI updates todo lists silently using `task_progress` parameter  
✅ AI gets prompted every 10 requests to update todo lists
✅ AI creates comprehensive checklist when switching PLAN → ACT mode
✅ Todo lists appear in task header showing progress
✅ Initial planning with structured checklists works correctly

