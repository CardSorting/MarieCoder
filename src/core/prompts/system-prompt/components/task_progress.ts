import { SystemPromptSection } from "../templates/section_definitions"
import { CommonConditions, createComponent } from "./base_component"

/**
 * Task Progress Tracking - Clear progress updates and todo lists
 * Conditional inclusion based on focus chain settings.
 */

const TASK_PROGRESS_TEMPLATE_TEXT = `TASK PROGRESS TRACKING

## Progress Updates (Optional Parameter)

Every tool use supports an optional \`task_progress\` parameter for an updated checklist that keeps users informed.

### When to Update (Required):
- **Regularly**: Update throughout task to keep user informed
- **After meaningful steps**: Update when completing significant milestones
- **Before completion**: Ensure final checklist item checked before \`attempt_completion\`
- **NOT in PLAN mode**: Wait until user approves plan and switches to ACT mode

### Format (Required):
- **Markdown checklist**: \`- [ ]\` for incomplete, \`- [x]\` for completed
- **Complete checklist**: Provide ALL steps you intend to complete
- **Keep updated**: Update checkboxes as you make progress
- **Rewrite as needed**: Update if scope changes or new information emerges
- **Focus on milestones**: Meaningful progress, not minor technical details
- **Simple tasks**: Short checklists (even single item) acceptable
- **Complex tasks**: Avoid making checklist too long or verbose
- **MUST update**: If using checklist, update every time a step completes

### Example:
\`\`\`xml
<execute_command>
<command>npm install react</command>
<requires_approval>false</requires_approval>
<task_progress>
- [x] Set up project structure
- [x] Install dependencies
- [ ] Create components
- [ ] Test application
</task_progress>
</execute_command>
\`\`\`

## Automatic Todo List Management

**System Behavior**:
- **Every 10th request**: Prompted to review/update existing todo list
- **PLAN → ACT switch**: Create comprehensive todo list for task
- **Silent updates**: Use \`task_progress\` parameter - DON'T announce updates to user
- **Auto-inclusion**: System includes todo list context in prompts when appropriate
- **Focus**: Create actionable, meaningful steps (not granular technical details)`

export const getTaskProgressSection = createComponent({
	section: SystemPromptSection.TASK_PROGRESS,
	defaultTemplate: TASK_PROGRESS_TEMPLATE_TEXT,
	shouldInclude: CommonConditions.requiresFocusChain,
})
