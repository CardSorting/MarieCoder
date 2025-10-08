import { SystemPromptSection } from "../templates/section_definitions"
import type { SystemPromptContext } from "../types"
import { CommonVariables, createComponent } from "./base_component"

/**
 * Tools and Capabilities - Tool usage instructions and capability descriptions
 *
 * Refactored to use unified base component system.
 * Uses CommonVariables for browser support and CWD patterns.
 */

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

export const getToolUseSection = createComponent({
	section: SystemPromptSection.TOOL_USE,
	defaultTemplate: TOOL_USE_TEMPLATE_TEXT,
	buildVariables: (context) => ({
		BROWSER_TOOLS: CommonVariables.browserSupport(context, "\n- `browser_action` - Interact with web pages"),
		CWD: CommonVariables.cwd(context),
	}),
})

const getCapabilitiesTemplateText = (context: SystemPromptContext) => `CAPABILITIES

- You have access to tools that let you execute CLI commands on the user's computer, list files, view source code definitions, regex search{{BROWSER_SUPPORT}}, read and edit files${context.yoloModeToggled !== true ? ", and ask follow-up questions" : ""}. These tools help you effectively accomplish a wide range of tasks, such as writing code, making edits or improvements to existing files, understanding the current state of a project, performing system operations, and much more.
- When the user initially gives you a task, a recursive list of all filepaths in the current working directory ('{{CWD}}') will be included in environment_details. This provides an overview of the project's file structure, offering key insights into the project from directory/file names (how developers conceptualize and organize their code) and file extensions (the language used). This can also guide decision-making on which files to explore further. If you need to further explore directories such as outside the current working directory, you can use the list_files tool. If you pass 'true' for the recursive parameter, it will list files recursively. Otherwise, it will list files at the top level, which is better suited for generic directories where you don't necessarily need the nested structure, like the Desktop.
- You can use search_files to perform regex searches across files in a specified directory, outputting context-rich results that include surrounding lines. This is particularly useful for understanding code patterns, finding specific implementations, or identifying areas that need refactoring.
- You can use the list_code_definition_names tool to get an overview of source code definitions for all files at the top level of a specified directory. This can be particularly useful when you need to understand the broader context and relationships between certain parts of the code. You may need to call this tool multiple times to understand various parts of the codebase related to the task.
    - For example, when asked to make edits or improvements you might analyze the file structure in the initial environment_details to get an overview of the project, then use list_code_definition_names to get further insight using source code definitions for files located in relevant directories, then read_file to examine the contents of relevant files, analyze the code and suggest improvements or make necessary edits, then use the replace_in_file tool to implement changes. If you refactored code that could affect other parts of the codebase, you could use search_files to ensure you update other files as needed.
- You can use the execute_command tool to run commands on the user's computer whenever you feel it can help accomplish the user's task. When you need to execute a CLI command, you must provide a clear explanation of what the command does. Prefer to execute complex CLI commands over creating executable scripts, since they are more flexible and easier to run. Interactive and long-running commands are allowed, since the commands are run in the user's VSCode terminal. The user may keep commands running in the background and you will be kept updated on their status along the way. Each command you execute is run in a new terminal instance.{{BROWSER_CAPABILITIES}}
- You have access to MCP servers that may provide additional tools and resources. Each server may provide different capabilities that you can use to accomplish tasks more effectively.`

export const getCapabilitiesSection = createComponent({
	section: SystemPromptSection.CAPABILITIES,
	defaultTemplate: getCapabilitiesTemplateText,
	buildVariables: (context) => ({
		BROWSER_SUPPORT: CommonVariables.browserSupport(context, ", use the browser"),
		BROWSER_CAPABILITIES: CommonVariables.browserSupport(
			context,
			`\n- You can use the browser_action tool to interact with websites (including html files and locally running development servers) through a Puppeteer-controlled browser when you feel it is necessary in accomplishing the user's task. This tool is particularly useful for web development tasks as it allows you to launch a browser, navigate to pages, interact with elements through clicks and keyboard input, and capture the results through screenshots and console logs. This tool may be useful at key stages of web development tasks-such as after implementing new features, making substantial changes, when troubleshooting issues, or to verify the result of your work. You can analyze the provided screenshots to ensure correct rendering or identify errors, and review console logs for runtime issues.\n\t- For example, if asked to add a component to a react website, you might create the necessary files, use execute_command to run the site locally, then use browser_action to launch the browser, navigate to the local server, and verify the component renders & functions correctly before closing the browser.`,
		),
		CWD: CommonVariables.cwd(context),
	}),
})
