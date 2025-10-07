/**
 * Tool Configuration Service
 *
 * Centralized service for managing tool configurations with consistent patterns
 * and reduced duplication. Follows NOORMME methodology for clean, unified architecture.
 */

import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../../spec"
import {
    createActionParameter,
    createAttemptCompletionParameter,
    createCodeDefinitionNamesParameter,
    createCommandParameter,
    createContentParameter,
    createCoordinateParameter,
    createDiffParameter,
    createFilePatternParameter,
    createFocusChainParameter,
    createMcpDocumentationParameter,
    createNewTaskParameter,
    createPathParameter, createPlanModeResponseParameter,
    createQuestionParameter,
    createRecursiveParameter,
    createRegexParameter,
    createRequiresApprovalParameter,
    createServerNameParameter, createTaskProgressParameter,
    createTextParameter,
    createTimeoutParameter,
    createToolArgumentsParameter,
    createToolNameParameter,
    createUriParameter,
    createUrlParameter,
    createWebFetchParameter
} from "./parameter-templates"
import { ToolFactory, type ToolVariantConfig } from "./tool-factory"

/**
 * Tool configuration registry
 */
class ToolConfigService {
	private static configs = new Map<ClineDefaultTool, ToolVariantConfig>()

	/**
	 * Register a tool configuration
	 */
	static register(config: ToolVariantConfig): void {
		ToolConfigService.configs.set(config.id, config)
	}

	/**
	 * Get tool configuration by ID
	 */
	static getConfig(toolId: ClineDefaultTool): ToolVariantConfig | undefined {
		return ToolConfigService.configs.get(toolId)
	}

	/**
	 * Get all registered configurations
	 */
	static getAllConfigs(): Map<ClineDefaultTool, ToolVariantConfig> {
		return new Map(ToolConfigService.configs)
	}

	/**
	 * Clear all configurations (for testing)
	 */
	static clear(): void {
		ToolConfigService.configs.clear()
	}

	/**
	 * Initialize default tool configurations
	 */
	static initializeDefaults(): void {
		// File operations
		ToolConfigService.register({
			id: ClineDefaultTool.FILE_READ,
			name: "read_file",
			description:
				"Request to read the contents of a file at the specified path. Use this when you need to examine the contents of an existing file you do not know the contents of, for example to analyze code, review text files, or extract information from configuration files. Automatically extracts raw text from PDF and DOCX files. May not be suitable for other types of binary files, as it returns the raw content as a string. Do NOT use this tool to list the contents of a directory. Only use this tool on files.",
			parameters: [createPathParameter("file"), createTaskProgressParameter()],
			variants: [ModelFamily.GENERIC, ModelFamily.NEXT_GEN, ModelFamily.GPT, ModelFamily.GEMINI],
		})

		ToolConfigService.register({
			id: ClineDefaultTool.FILE_NEW,
			name: "write_to_file",
			description:
				"Request to write content to a file at the specified path. If the file exists, it will be overwritten with the provided content. If the file doesn't exist, it will be created. This tool will automatically create any directories needed to write the file.",
			parameters: [createPathParameter("file"), createContentParameter(), createTaskProgressParameter()],
			variants: [ModelFamily.GENERIC],
		})

		ToolConfigService.register({
			id: ClineDefaultTool.FILE_EDIT,
			name: "replace_in_file",
			description:
				"Request to replace content in a file using search and replace operations. This tool allows precise editing of file contents by finding specific text patterns and replacing them with new content.",
			parameters: [createPathParameter("file"), createDiffParameter(), createTaskProgressParameter()],
			variants: [ModelFamily.GENERIC],
		})

		// Directory operations
		ToolConfigService.register({
			id: ClineDefaultTool.LIST_FILES,
			name: "list_files",
			description:
				"Request to list files and directories within the specified directory. If recursive is true, it will list all files and directories recursively. If recursive is false or not provided, it will only list the top-level contents. Do not use this tool to confirm the existence of files you may have created, as the user will let you know if the files were created successfully or not.",
			parameters: [createPathParameter("directory"), createRecursiveParameter(), createTaskProgressParameter()],
			variants: [ModelFamily.GENERIC],
		})

		// Search operations
		ToolConfigService.register({
			id: ClineDefaultTool.SEARCH,
			name: "search_files",
			description:
				"Request to perform a regex search across files in a specified directory, providing context-rich results. This tool searches for patterns or specific content across multiple files, displaying each match with encapsulating context.",
			parameters: [
				createPathParameter("directory"),
				createRegexParameter(),
				createFilePatternParameter(),
				createTaskProgressParameter(),
			],
			variants: [ModelFamily.GENERIC],
		})

		// Command execution
		ToolConfigService.register({
			id: ClineDefaultTool.BASH,
			name: "execute_command",
			description:
				"Request to execute a CLI command on the system. Use this when you need to perform system operations or run specific commands to accomplish any step in the user's task. You must tailor your command to the user's system and provide a clear explanation of what the command does. For command chaining, use the appropriate chaining syntax for the user's shell. Prefer to execute complex CLI commands over creating executable scripts, as they are more flexible and easier to run. Commands will be executed in the current working directory: {{CWD}}{{MULTI_ROOT_HINT}}",
			parameters: [createCommandParameter(), createRequiresApprovalParameter(), createTimeoutParameter()],
			variants: [ModelFamily.GENERIC],
		})

		// Browser operations
		ToolConfigService.register({
			id: ClineDefaultTool.BROWSER,
			name: "browser_action",
			description: `Request to interact with a Puppeteer-controlled browser. Every action, except \`close\`, will be responded to with a screenshot of the browser's current state, along with any new console logs. You may only perform one browser action per message, and wait for the user's response including a screenshot and logs to determine the next action.
- The sequence of actions **must always start with** launching the browser at a URL, and **must always end with** closing the browser. If you need to visit a new URL that is not possible to navigate to from the current webpage, you must first close the browser, then launch again at the new URL.
- While the browser is active, only the \`browser_action\` tool can be used. No other tools should be called during this time. You may proceed to use other tools only after closing the browser. For example if you run into an error and need to fix a file, you must close the browser, then use other tools to make the necessary changes, then re-launch the browser to verify the result.
- The browser window has a resolution of **{{BROWSER_VIEWPORT_WIDTH}}x{{BROWSER_VIEWPORT_HEIGHT}}** pixels. When performing any click actions, ensure the coordinates are within this resolution range.
- Before clicking on any elements such as icons, links, or buttons, you must consult the provided screenshot of the page to determine the coordinates of the element. The click should be targeted at the **center of the element**, not on its edges.`,
			contextRequirements: (context) => context.supportsBrowserUse === true,
			parameters: [
				createActionParameter(
					["launch", "click", "type", "scroll_down", "scroll_up", "close"],
					`The action to perform. The available actions are: 
	* launch: Launch a new Puppeteer-controlled browser instance at the specified URL. This **must always be the first action**. 
		- Use with the \`url\` parameter to provide the URL. 
		- Ensure the URL is valid and includes the appropriate protocol (e.g. http://localhost:3000/page, file:///path/to/file.html, etc.) 
	* click: Click at a specific x,y coordinate. 
		- Use with the \`coordinate\` parameter to specify the location. 
		- Always click in the center of an element (icon, button, link, etc.) based on coordinates derived from a screenshot. 
	* type: Type a string of text on the keyboard. You might use this after clicking on a text field to input text. 
		- Use with the \`text\` parameter to provide the string to type. 
	* scroll_down: Scroll down the page by one page height. 
	* scroll_up: Scroll up the page by one page height. 
	* close: Close the Puppeteer-controlled browser instance. This **must always be the final browser action**. 
	    - Example: \`<action>close</action>\``,
				),
				createUrlParameter(
					"Use this for providing the URL for the `launch` action. Example: <url>https://example.com</url>",
				),
				createCoordinateParameter(
					"The X and Y coordinates for the `click` action. Coordinates should be within the **{{BROWSER_VIEWPORT_WIDTH}}x{{BROWSER_VIEWPORT_HEIGHT}}** resolution. Example: <coordinate>450,300</coordinate>",
				),
				createTextParameter("Use this for providing the text for the `type` action. Example: <text>Hello, world!</text>"),
			],
			variants: [ModelFamily.GENERIC],
		})

		// MCP operations
		ToolConfigService.register({
			id: ClineDefaultTool.MCP_ACCESS,
			name: "access_mcp_resource",
			description:
				"Request to access a resource provided by a connected MCP server. Resources represent data sources that can be used as context, such as files, API responses, or system information.",
			contextRequirements: (context) => context.mcpHub !== undefined && context.mcpHub !== null,
			parameters: [
				createServerNameParameter("The name of the MCP server providing the resource"),
				createUriParameter("The URI identifying the specific resource to access"),
				createTaskProgressParameter(),
			],
			variants: [ModelFamily.GENERIC, ModelFamily.NEXT_GEN, ModelFamily.GPT],
		})

		ToolConfigService.register({
			id: ClineDefaultTool.MCP_USE,
			name: "use_mcp_tool",
			description:
				"Request to use a tool provided by a connected MCP server. Tools represent actions that can be performed, such as API calls, file operations, or system interactions.",
			contextRequirements: (context) => context.mcpHub !== undefined && context.mcpHub !== null,
			parameters: [
				createServerNameParameter("The name of the MCP server providing the tool"),
				createToolNameParameter("The name of the MCP tool to use"),
				createToolArgumentsParameter("The arguments to pass to the tool as JSON"),
				createTaskProgressParameter(),
			],
			variants: [ModelFamily.GENERIC],
		})

		ToolConfigService.register({
			id: ClineDefaultTool.MCP_DOCS,
			name: "load_mcp_documentation",
			description:
				"Request to load documentation for a connected MCP server. This provides information about available tools and resources.",
			contextRequirements: (context) => context.mcpHub !== undefined && context.mcpHub !== null,
			parameters: [createMcpDocumentationParameter()],
			variants: [ModelFamily.GENERIC],
		})

		// User interaction
		ToolConfigService.register({
			id: ClineDefaultTool.ASK,
			name: "ask_followup_question",
			description:
				"Request to ask a follow-up question to the user. Use this when you need clarification, additional information, or user input to proceed with the task.",
			parameters: [createQuestionParameter()],
			variants: [ModelFamily.GENERIC, ModelFamily.NEXT_GEN, ModelFamily.GPT, ModelFamily.GEMINI],
		})

		// Task management
		ToolConfigService.register({
			id: ClineDefaultTool.ATTEMPT,
			name: "attempt_completion",
			description:
				"Request to attempt completion of the current task. Use this when you believe you have completed the user's request and want to confirm or provide a summary.",
			parameters: [createAttemptCompletionParameter()],
			variants: [ModelFamily.GENERIC, ModelFamily.NEXT_GEN, ModelFamily.GPT, ModelFamily.GEMINI],
		})

		ToolConfigService.register({
			id: ClineDefaultTool.TODO,
			name: "focus_chain",
			description: "Request to manage focus chain operations for task organization and prioritization.",
			parameters: [createFocusChainParameter()],
			variants: [ModelFamily.GENERIC],
		})

		ToolConfigService.register({
			id: ClineDefaultTool.NEW_TASK,
			name: "new_task",
			description:
				"Request to create a new task or subtask. Use this when you need to break down complex tasks into manageable components.",
			parameters: [createNewTaskParameter()],
			variants: [ModelFamily.GENERIC],
		})

		// Code analysis
		ToolConfigService.register({
			id: ClineDefaultTool.LIST_CODE_DEF,
			name: "list_code_definition_names",
			description:
				"Request to list code definition names in the current codebase. This helps identify available functions, classes, and other code elements.",
			parameters: [createCodeDefinitionNamesParameter()],
			variants: [ModelFamily.GENERIC],
		})

		// Planning
		ToolConfigService.register({
			id: ClineDefaultTool.PLAN_MODE,
			name: "plan_mode_respond",
			description: "Request to respond in plan mode, providing structured planning information for complex tasks.",
			parameters: [createPlanModeResponseParameter()],
			variants: [ModelFamily.GENERIC],
		})

		// Web operations
		ToolConfigService.register({
			id: ClineDefaultTool.WEB_FETCH,
			name: "web_fetch",
			description: "Request to fetch content from a web URL. Use this to retrieve information from web pages or APIs.",
			parameters: [createWebFetchParameter()],
			variants: [ModelFamily.GENERIC],
		})
	}
}

/**
 * Initialize default configurations
 */
ToolConfigService.initializeDefaults()

/**
 * Export the service and convenience functions
 */
export { ToolConfigService }

/**
 * Get tool variants by ID using the configuration service
 */
export function getToolVariants(toolId: ClineDefaultTool): ClineToolSpec[] {
	const config = ToolConfigService.getConfig(toolId)
	if (!config) {
		throw new Error(`Tool configuration not found for ${toolId}`)
	}
	return ToolFactory.createVariants(config, config.variants)
}

/**
 * Get all tool variants
 */
export function getAllToolVariants(): ClineToolSpec[] {
	const allVariants: ClineToolSpec[] = []
	for (const [toolId] of ToolConfigService.getAllConfigs()) {
		allVariants.push(...getToolVariants(toolId))
	}
	return allVariants
}
