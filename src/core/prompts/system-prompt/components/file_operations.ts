import { SystemPromptSection } from "../templates/section_definitions"
import { createComponent } from "./base_component"

/**
 * File Operations - Clear guidelines for editing files
 * Unified base component system.
 */

const EDITING_FILES_TEMPLATE_TEXT = `EDITING FILES

**Two Tools**: \`write_to_file\` and \`replace_in_file\`. Select the right one for efficient, accurate modifications.

## write_to_file

**Purpose**: Create new file or overwrite entire contents of existing file.

**When to Use**:
- **New files**: Initial file creation when scaffolding projects
- **Large rewrites**: Overwriting large boilerplate files entirely
- **Complex changes**: When replace_in_file would be unwieldy or error-prone
- **Restructuring**: Complete reorganization of file's content/organization
- **Boilerplate**: Generating template files

**Requirements**:
- **MUST provide**: Complete final content of file
- **NOT default choice**: Consider replace_in_file for small changes first
- **Use when appropriate**: Don't hesitate when situation truly calls for it

## replace_in_file

**Purpose**: Make targeted edits to specific parts without overwriting entire file.

**When to Use**:
- **Small changes**: Update few lines, function implementations, variable names, sections
- **Targeted improvements**: Only specific portions need alteration
- **Long files**: Most of file remains unchanged

**Advantages**:
- **Efficient**: Don't need to supply entire file content
- **Safer**: Reduces errors from overwriting large files

## Tool Selection (Required)

**Default**: Use \`replace_in_file\` for most changes (safer, more precise).

**Use \`write_to_file\` when**:
- Creating new files
- Changes so extensive that replace_in_file would be more complex/risky
- Need to completely reorganize or restructure file
- File is small and changes affect most content
- Generating boilerplate or template files

## Auto-formatting (Critical)

**Editor behavior**: User's editor may auto-format file after write_to_file or replace_in_file.

**Common changes**:
- **Line breaks**: Single lines → multiple lines
- **Indentation**: Match project style (2/4 spaces, tabs)
- **Quotes**: Single ↔ double based on preferences
- **Imports**: Sorting, grouping by type
- **Commas**: Adding/removing trailing commas
- **Braces**: Same-line vs new-line style
- **Semicolons**: Adding/removing based on style

**CRITICAL**: Tool responses include final state AFTER auto-formatting.
- **Use final state**: Reference point for subsequent edits
- **ESPECIALLY for SEARCH blocks**: Must match file content EXACTLY

## Workflow (Required)

1. **Assess scope**: Decide which tool to use before editing
2. **Targeted edits**: Use replace_in_file with SEARCH/REPLACE blocks
   - **Multiple changes**: Stack multiple blocks in single call
3. **IMPORTANT - Single Call**: For multiple changes to same file, use ONE replace_in_file call with multiple SEARCH/REPLACE blocks
   - **DO**: Single call with blocks for import + component usage
   - **DON'T**: Separate calls for import, then component
4. **Major overhauls**: Use write_to_file for major rewrites or new files
5. **Use final state**: System provides final state after edits - use this for subsequent SEARCH/REPLACE (reflects auto-formatting)`

export const getEditingFilesSection = createComponent({
	section: SystemPromptSection.EDITING_FILES,
	defaultTemplate: EDITING_FILES_TEMPLATE_TEXT,
})
