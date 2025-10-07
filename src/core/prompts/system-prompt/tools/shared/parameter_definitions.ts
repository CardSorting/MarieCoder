/**
 * Parameter Templates
 *
 * Reusable parameter templates for consistent tool parameter definitions
 * across all tool variants.
 */

/**
 * Standard parameter template for file paths
 */
export const createPathParameter = (type: "file" | "directory", customInstruction?: string) => ({
	name: "path",
	required: true,
	instruction:
		customInstruction || `The path of the ${type} (relative to the current working directory {{CWD}}){{MULTI_ROOT_HINT}}`,
	usage: `${type === "file" ? "File" : "Directory"} path here`,
})

/**
 * Standard parameter template for content
 */
export const createContentParameter = (customInstruction?: string) => ({
	name: "content",
	required: true,
	instruction:
		customInstruction ||
		"The content to write to the file. ALWAYS provide the COMPLETE intended content of the file, without any truncation or omissions. You MUST include ALL parts of the file, even if they haven't been modified.",
	usage: "Your file content here",
})

/**
 * Standard parameter template for commands
 */
export const createCommandParameter = (customInstruction?: string) => ({
	name: "command",
	required: true,
	instruction:
		customInstruction ||
		"The CLI command to execute. This should be valid for the current operating system. Ensure the command is properly formatted and does not contain any harmful instructions.",
	usage: "Your command here",
})

/**
 * Standard parameter template for requires approval
 */
export const createRequiresApprovalParameter = (customInstruction?: string) => ({
	name: "requires_approval",
	required: true,
	instruction:
		customInstruction ||
		"A boolean indicating whether this command requires explicit user approval before execution in case the user has auto-approve mode enabled. Set to 'true' for potentially impactful operations like installing/uninstalling packages, deleting/overwriting files, system configuration changes, network operations, or any commands that could have unintended side effects. Set to 'false' for safe operations like reading files/directories, running development servers, building projects, and other non-destructive operations.",
	usage: "true or false",
})

/**
 * Standard parameter template for timeout
 */
export const createTimeoutParameter = (customInstruction?: string) => ({
	name: "timeout",
	required: false,
	contextRequirements: (context: any) => context.yoloModeToggled === true,
	instruction:
		customInstruction ||
		"Integer representing the timeout in seconds for how long to run the terminal command, before timing out and continuing the task.",
	usage: "30",
})

/**
 * Standard parameter template for regex patterns
 */
export const createRegexParameter = (customInstruction?: string) => ({
	name: "regex",
	required: true,
	instruction: customInstruction || "The regular expression pattern to search for. Uses Rust regex syntax.",
	usage: "Your regex pattern here",
})

/**
 * Standard parameter template for file patterns
 */
export const createFilePatternParameter = (customInstruction?: string) => ({
	name: "file_pattern",
	required: false,
	instruction:
		customInstruction ||
		"Glob pattern to filter files (e.g., '*.ts' for TypeScript files). If not provided, it will search all files (*).",
	usage: "file pattern here (optional)",
})

/**
 * Standard parameter template for recursive operations
 */
export const createRecursiveParameter = (customInstruction?: string) => ({
	name: "recursive",
	required: false,
	instruction:
		customInstruction ||
		"Whether to perform the operation recursively. Use true for recursive operation, false or omit for top-level only.",
	usage: "true or false (optional)",
})

/**
 * Standard parameter template for URLs
 */
export const createUrlParameter = (customInstruction?: string) => ({
	name: "url",
	required: false,
	instruction: customInstruction || "The URL to access or launch.",
	usage: "URL here (optional)",
})

/**
 * Standard parameter template for coordinates
 */
export const createCoordinateParameter = (customInstruction?: string) => ({
	name: "coordinate",
	required: false,
	instruction:
		customInstruction || "The X and Y coordinates for the action. Coordinates should be within the viewport resolution.",
	usage: "x,y coordinates (optional)",
})

/**
 * Standard parameter template for text input
 */
export const createTextParameter = (customInstruction?: string) => ({
	name: "text",
	required: false,
	instruction: customInstruction || "The text to input or display.",
	usage: "Text here (optional)",
})

/**
 * Standard parameter template for actions
 */
export const createActionParameter = (actions: string[], customInstruction?: string) => ({
	name: "action",
	required: true,
	instruction: customInstruction || `The action to perform. Available actions: ${actions.join(", ")}`,
	usage: `Action to perform (e.g., ${actions.slice(0, 2).join(", ")})`,
})

/**
 * Standard parameter template for server names
 */
export const createServerNameParameter = (customInstruction?: string) => ({
	name: "server_name",
	required: true,
	instruction: customInstruction || "The name of the MCP server.",
	usage: "server name here",
})

/**
 * Standard parameter template for URIs
 */
export const createUriParameter = (customInstruction?: string) => ({
	name: "uri",
	required: true,
	instruction: customInstruction || "The URI identifying the specific resource to access.",
	usage: "resource URI here",
})

/**
 * Standard parameter template for tool names
 */
export const createToolNameParameter = (customInstruction?: string) => ({
	name: "tool_name",
	required: true,
	instruction: customInstruction || "The name of the MCP tool to use.",
	usage: "tool name here",
})

/**
 * Standard parameter template for tool arguments
 */
export const createToolArgumentsParameter = (customInstruction?: string) => ({
	name: "arguments",
	required: false,
	instruction: customInstruction || "The arguments to pass to the tool as JSON.",
	usage: "JSON arguments here (optional)",
})

/**
 * Standard parameter template for questions
 */
export const createQuestionParameter = (customInstruction?: string) => ({
	name: "question",
	required: true,
	instruction: customInstruction || "The question to ask the user.",
	usage: "Your question here",
})

/**
 * Standard parameter template for task descriptions
 */
export const createTaskDescriptionParameter = (customInstruction?: string) => ({
	name: "description",
	required: true,
	instruction: customInstruction || "A clear description of the task to be accomplished.",
	usage: "Task description here",
})

/**
 * Standard parameter template for plan content
 */
export const createPlanContentParameter = (customInstruction?: string) => ({
	name: "plan",
	required: true,
	instruction: customInstruction || "The plan content to respond with.",
	usage: "Plan content here",
})

/**
 * Standard parameter template for completion attempts
 */
export const createAttemptCompletionParameter = (customInstruction?: string) => ({
	name: "completion",
	required: true,
	instruction: customInstruction || "The completion attempt description.",
	usage: "Completion attempt here",
})

/**
 * Standard parameter template for diff content
 */
export const createDiffParameter = (customInstruction?: string) => ({
	name: "diff",
	required: true,
	instruction:
		customInstruction ||
		`One or more SEARCH/REPLACE blocks following this exact format:
\`\`\`
------- SEARCH
[exact content to find]
========
[new content to replace with]
+++++++ REPLACE
\`\`\`
Critical rules:
1. SEARCH content must match the associated file section to find EXACTLY:
   * Match character-for-character including whitespace, indentation, line endings
   * Include all comments, docstrings, etc.
2. SEARCH/REPLACE blocks will ONLY replace the first match occurrence.
   * Including multiple unique SEARCH/REPLACE blocks if you need to make multiple changes.
   * Include *just* enough lines in each SEARCH section to uniquely match each set of lines that need to change.
   * When using multiple SEARCH/REPLACE blocks, list them in the order they appear in the file.
3. Keep SEARCH/REPLACE blocks concise:
   * Break large SEARCH/REPLACE blocks into a series of smaller blocks that each change a small portion of the file.
   * Include just the changing lines, and a few surrounding lines if needed for uniqueness.
   * Do not include long runs of unchanging lines in SEARCH/REPLACE blocks.
   * Each line must be complete. Never truncate lines mid-way through as this can cause matching failures.
4. Special operations:
   * To move code: Use two SEARCH/REPLACE blocks (one to delete from original + one to insert at new location)
   * To delete code: Use empty REPLACE section`,
	usage: "Search and replace blocks here",
})

/**
 * Standard parameter template for code definition names
 */
export const createCodeDefinitionNamesParameter = (customInstruction?: string) => ({
	name: "names",
	required: true,
	instruction: customInstruction || "The names of code definitions to list.",
	usage: "Code definition names here",
})

/**
 * Standard parameter template for focus chain operations
 */
export const createFocusChainParameter = (customInstruction?: string) => ({
	name: "focus_chain",
	required: true,
	instruction: customInstruction || "The focus chain operation to perform.",
	usage: "Focus chain operation here",
})

/**
 * Standard parameter template for web fetch operations
 */
export const createWebFetchParameter = (customInstruction?: string) => ({
	name: "url",
	required: true,
	instruction: customInstruction || "The URL to fetch.",
	usage: "URL here",
})

/**
 * Standard parameter template for MCP documentation loading
 */
export const createMcpDocumentationParameter = (customInstruction?: string) => ({
	name: "server_name",
	required: true,
	instruction: customInstruction || "The name of the MCP server to load documentation for.",
	usage: "server name here",
})

/**
 * Standard parameter template for new task creation
 */
export const createNewTaskParameter = (customInstruction?: string) => ({
	name: "task",
	required: true,
	instruction: customInstruction || "The new task to create.",
	usage: "New task here",
})

/**
 * Standard parameter template for plan mode responses
 */
export const createPlanModeResponseParameter = (customInstruction?: string) => ({
	name: "response",
	required: true,
	instruction: customInstruction || "The plan mode response.",
	usage: "Plan mode response here",
})

/**
 * Standard parameter template for task progress
 */
export const createTaskProgressParameter = (customInstruction?: string) => ({
	name: "task_progress",
	required: false,
	instruction: customInstruction || "Optional progress update for the current task.",
	usage: "Task progress update (optional)",
})
