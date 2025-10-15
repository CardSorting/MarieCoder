import { SystemPromptSection } from "../templates/section_definitions"
import { CommonConditions, createComponent } from "./base_component"

/**
 * Automatic Todo List Management
 * Provides instructions for creating and managing todo lists during task execution
 *
 * Key Features:
 * - Auto-prompts every 10 API requests to update existing todo lists
 * - Creates comprehensive todo list when switching PLAN → ACT mode
 * - Silent updates via task_progress parameter (no user announcements)
 * - Standard Markdown checklist format
 * - Auto-included in prompts when appropriate
 * - Focus on actionable steps, not technical minutiae
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
