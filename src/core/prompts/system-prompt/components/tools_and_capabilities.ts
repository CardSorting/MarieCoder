import { SystemPromptSection } from "../templates/section_definitions"
import type { SystemPromptContext } from "../types"
import { CommonVariables, createComponent } from "./base_component"

/**
 * Tools and Capabilities - Clear tool usage and capability descriptions
 * Uses CommonVariables for browser support and CWD patterns.
 */

const TOOL_USE_TEMPLATE_TEXT = `TOOL USE

**Access**: Tools executed upon user approval. One tool per message. Results returned in user's response. Use step-by-step, each informed by previous results.

## Tool Formatting (Required)

\`\`\`xml
<tool_name>
<parameter_name>parameter_value</parameter_name>
</tool_name>
\`\`\`

## Available Tools

- \`execute_command\` - Run CLI commands
- \`write_to_file\` - Create or overwrite files
- \`replace_in_file\` - Make targeted edits to files
- \`read_file\` - Read file contents
- \`list_files\` - List directory contents
- \`search_files\` - Search for patterns in files
- \`new_task\` - Create new tasks
- \`use_mcp_tool\` - Use MCP server tools
{{BROWSER_TOOLS}}

## Examples

### Execute Command
\`\`\`xml
<execute_command>
<command>npm run dev</command>
<requires_approval>false</requires_approval>
</execute_command>
\`\`\`

### Create File
\`\`\`xml
<write_to_file>
<path>src/config.json</path>
<content>
{
  "apiEndpoint": "https://api.example.com",
  "theme": "dark"
}
</content>
</write_to_file>
\`\`\`

### Edit File
\`\`\`xml
<replace_in_file>
<path>src/App.tsx</path>
<diff>
------- SEARCH
import React from 'react';
=======
import React, { useState } from 'react';
+++++++ REPLACE
</diff>
</replace_in_file>
\`\`\`

## Guidelines (Required)

- **Step-by-step**: Use tools sequentially to accomplish tasks
- **Wait for approval**: Confirm user approval before proceeding
- **Informed decisions**: Each tool use informed by previous results
- **Precision**: Be precise with file paths and parameters`

export const getToolUseSection = createComponent({
	section: SystemPromptSection.TOOL_USE,
	defaultTemplate: TOOL_USE_TEMPLATE_TEXT,
	buildVariables: (context) => ({
		BROWSER_TOOLS: CommonVariables.browserSupport(context, "\n- `browser_action` - Interact with web pages"),
		CWD: CommonVariables.cwd(context),
	}),
})

const getCapabilitiesTemplateText = (context: SystemPromptContext) => `CAPABILITIES

## Core Tools

**Available**: Execute CLI commands, list files, view source code definitions, regex search{{BROWSER_SUPPORT}}, read and edit files${context.yoloModeToggled !== true ? ", and ask follow-up questions" : ""}. Use these to write code, edit files, understand project state, and perform system operations.

## File Structure

**Initial environment_details**: Recursive list of all filepaths in '{{CWD}}' provides project overview.
- **Insights**: Directory/file names show code organization; file extensions show languages
- **Exploration**: Use \`list_files\` for directories outside CWD
- **Recursive parameter**: \`true\` for nested structure, \`false\` for top-level (better for generic directories like Desktop)

## Search Tools

**\`search_files\`**: Regex searches across files in specified directory.
- **Output**: Context-rich results with surrounding lines
- **Use for**: Understanding patterns, finding implementations, identifying refactoring areas

**\`list_code_definition_names\`**: Overview of source code definitions for top-level files in directory.
- **Use for**: Understanding context and relationships between code parts
- **May need**: Multiple calls for various codebase parts

**Example workflow**:
1. Analyze file structure in environment_details (project overview)
2. Use \`list_code_definition_names\` (insight into relevant directories)
3. Use \`read_file\` (examine relevant files)
4. Analyze and suggest improvements
5. Use \`replace_in_file\` (implement changes)
6. Use \`search_files\` (update other affected files if needed)

## Command Execution

**\`execute_command\`**: Run commands on user's computer.
- **MUST**: Provide clear explanation of what command does
- **Prefer**: Complex CLI commands over executable scripts (more flexible, easier to run)
- **Allowed**: Interactive and long-running commands (run in VSCode terminal)
- **Background**: User may keep commands running; you'll get status updates
- **Note**: Each command runs in new terminal instance{{BROWSER_CAPABILITIES}}

## MCP Servers

**Access**: MCP servers provide additional tools and resources. Each server offers different capabilities for accomplishing tasks more effectively.`

export const getCapabilitiesSection = createComponent({
	section: SystemPromptSection.CAPABILITIES,
	defaultTemplate: getCapabilitiesTemplateText,
	buildVariables: (context) => ({
		BROWSER_SUPPORT: CommonVariables.browserSupport(context, ", use the browser"),
		BROWSER_CAPABILITIES: CommonVariables.browserSupport(
			context,
			`

## Browser Interaction

**\`browser_action\`**: Interact with websites (HTML files, local dev servers) through Puppeteer-controlled browser.
- **Use when**: Necessary for accomplishing user's task
- **Capabilities**: Launch browser, navigate pages, interact with elements (clicks, keyboard), capture results (screenshots, console logs)
- **Use at key stages**: After implementing features, making changes, troubleshooting issues, verifying work
- **Analysis**: Review screenshots for rendering/errors; review console logs for runtime issues

**Example**: Adding component to React website
1. Create necessary files
2. Use \`execute_command\` to run site locally
3. Use \`browser_action\` to launch browser
4. Navigate to local server
5. Verify component renders & functions correctly
6. Close browser`,
		),
		CWD: CommonVariables.cwd(context),
	}),
})
