import { SystemPromptSection } from "../templates/section_definitions"
import { TemplateEngine } from "../templates/template_engine"
import type { PromptVariant, SystemPromptContext } from "../types"

const TOOL_USE_TEMPLATE_TEXT = `TOOL USE

You have access to a set of tools that are executed upon the user's approval. You can use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

## Tool Formatting

When using tools, follow this format:

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

## Guidelines

- Use tools step-by-step to accomplish tasks
- Wait for user approval before proceeding
- Each tool use should be informed by previous results
- Be precise with file paths and parameters`

export async function getToolUseSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.TOOL_USE]?.template || TOOL_USE_TEMPLATE_TEXT

	const browserTools = context.supportsBrowserUse ? "\n- `browser_action` - Interact with web pages" : ""

	return new TemplateEngine().resolve(template, context, {
		BROWSER_TOOLS: browserTools,
		CWD: context.cwd || process.cwd(),
	})
}
