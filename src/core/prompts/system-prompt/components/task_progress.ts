import { SystemPromptSection } from "../templates/section_definitions"
import { CommonConditions, createComponent } from "./base_component"

/**
 * Task Progress Tracking - Todo lists and progress updates
 *
 * Refactored to use unified base component system.
 * Conditional inclusion based on focus chain settings.
 */

const TASK_PROGRESS_TEMPLATE_TEXT = `TASK PROGRESS TRACKING

## Progress Updates

Every tool use supports an optional task_progress parameter that allows you to provide an updated checklist to keep the user informed of your overall progress on the task.

### When to Update:
- Use regularly throughout the task to keep the user informed
- Update after completing each meaningful step
- Before using attempt_completion, ensure the final checklist item is checked off
- Don't use while in PLAN mode until the user has approved your plan and switched you to ACT mode

### Format Guidelines:
- Use standard Markdown checklist format: "- [ ]" for incomplete items and "- [x]" for completed items
- Provide the whole checklist of steps you intend to complete in the task
- Keep checkboxes updated as you make progress
- Rewrite the checklist as needed if it becomes invalid due to scope changes or new information
- Focus on meaningful progress milestones rather than minor technical details
- For simple tasks, short checklists with even a single item are acceptable
- For complex tasks, avoid making the checklist too long or verbose
- If a checklist is being used, be sure to update it any time a step has been completed

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

The system automatically manages todo lists to help track task progress:

- Every 10th API request, you will be prompted to review and update the current todo list if one exists
- When switching from PLAN MODE to ACT MODE, you should create a comprehensive todo list for the task
- Todo list updates should be done silently using the task_progress parameter - do not announce these updates to the user
- The system will automatically include todo list context in your prompts when appropriate
- Focus on creating actionable, meaningful steps rather than granular technical details`

export const getTaskProgressSection = createComponent({
	section: SystemPromptSection.TASK_PROGRESS,
	defaultTemplate: TASK_PROGRESS_TEMPLATE_TEXT,
	shouldInclude: CommonConditions.requiresFocusChain,
})
