import { setTimeout as setTimeoutPromise } from "node:timers/promises"
import { Anthropic } from "@anthropic-ai/sdk"
import { getContextWindowInfo } from "@core/context/context-management/context_window_utils"
import { FileContextTracker } from "@core/context/context-tracking"
import { refreshAllToggles } from "@core/context/instructions/user-instructions/rule_loader"
import type { ClineIgnoreController } from "@core/ignore/ClineIgnoreController"
import { parseMentionsInTags } from "@core/mentions"
import { formatResponse } from "@core/prompts/response_formatters"
import { parseSlashCommands } from "@core/slash-commands"
import { isMultiRootEnabled } from "@core/workspace/multi-root-utils"
import type { WorkspaceRootManager } from "@core/workspace/WorkspaceRootManager"
import { listFiles } from "@services/glob/list-files"
import { findLast } from "@shared/array"
import { combineApiRequests } from "@shared/combineApiRequests"
import { combineCommandSequences } from "@shared/combineCommandSequences"
import type { ClineMessage } from "@shared/ExtensionMessage"
import { arePathsEqual, getDesktopDir } from "@utils/path"
import { filterExistingFiles } from "@utils/tabFiltering"
import pWaitFor from "p-wait-for"
import * as path from "path"
import type { ApiHandler } from "@/core/api"
import type { Controller } from "@/core/controller"
import type { StateManager } from "@/core/storage/StateManager"
import { HostProvider } from "@/hosts/host-provider"
import type { TerminalManager } from "@/integrations/terminal/TerminalManager"
import type { UrlContentFetcher } from "@/services/browser/UrlContentFetcher"
import type { FocusChainManager } from "../focus-chain"
import type { MessageStateHandler } from "../message-state"
import type { TaskState } from "../TaskState"
import { detectAvailableCliTools } from "../utils"

type UserContent = Array<Anthropic.ContentBlockParam>

/**
 * Builds context for system prompts and API requests
 *
 * This service is responsible for gathering all environmental context needed
 * for AI agent interactions. It collects workspace info, file details, terminal
 * state, time information, and formats everything into structured context.
 *
 * Responsibilities:
 * - Load and parse user content (mentions, slash commands)
 * - Gather environment details (OS, workspace, files)
 * - Format workspace roots for multi-root workspaces
 * - Collect terminal state and output
 * - Track recently modified files
 * - Build complete environment context for API requests
 *
 * @example
 * ```typescript
 * const builder = new TaskContextBuilder(cwd, stateManager, controller, ...)
 * const [userContent, envDetails, error] = await builder.loadContext(content, true)
 * ```
 */
export class TaskContextBuilder {
	constructor(
		private readonly cwd: string,
		private readonly stateManager: StateManager,
		private readonly controller: Controller,
		private readonly api: ApiHandler,
		private readonly terminalManager: TerminalManager,
		private readonly urlContentFetcher: UrlContentFetcher,
		private readonly fileContextTracker: FileContextTracker,
		private readonly clineIgnoreController: ClineIgnoreController,
		private readonly messageStateHandler: MessageStateHandler,
		private readonly workspaceManager: WorkspaceRootManager | undefined,
		private readonly focusChainManager: FocusChainManager | undefined,
		private readonly taskState: TaskState,
		private readonly ulid: string,
	) {}

	/**
	 * Filter file paths to only include existing files
	 * @private
	 */
	private async filterExistingFiles(paths: string[]): Promise<string[]> {
		return filterExistingFiles(paths)
	}

	/**
	 * Load and process context for API request
	 *
	 * Main entry point for context building. Processes user content by parsing
	 * mentions and slash commands, gathers environment details, and optionally
	 * includes focus chain instructions.
	 *
	 * @param userContent - Raw user content blocks to process
	 * @param includeFileDetails - Whether to include detailed file listings
	 * @param useCompactPrompt - Whether to use compact prompt mode
	 * @returns Tuple of [processed content, environment details, error flag]
	 */
	async loadContext(
		userContent: UserContent,
		includeFileDetails: boolean = false,
		useCompactPrompt = false,
	): Promise<[UserContent, string, boolean]> {
		const allToggles = await refreshAllToggles(this.controller, this.cwd)
		const { localWorkflows: localWorkflowToggles, globalWorkflows: globalWorkflowToggles } = allToggles

		const processUserContent = async () => {
			// Parse mentions and slash commands in user-generated content
			// Only processes text within specific tags: <feedback>, <answer>, <task>, <user_message>
			return await Promise.all(
				userContent.map(async (block) => {
					if (block.type === "text") {
						// Check if this block contains user-generated content markers
						if (
							block.text.includes("<feedback>") ||
							block.text.includes("<answer>") ||
							block.text.includes("<task>") ||
							block.text.includes("<user_message>")
						) {
							// Parse @mentions (files, folders, URLs, problems, etc.)
							const parsedText = await parseMentionsInTags(
								block.text,
								this.cwd,
								this.urlContentFetcher,
								this.fileContextTracker,
							)

							// Parse /slash commands (workflows, focus chain commands)
							const { processedText } = await parseSlashCommands(
								parsedText,
								localWorkflowToggles,
								globalWorkflowToggles,
								this.ulid,
								this.stateManager.getGlobalSettingsKey("focusChainSettings"),
							)

							return {
								...block,
								text: processedText,
							}
						}
					}
					return block
				}),
			)
		}

		// Run content processing and environment gathering in parallel
		const [processedUserContent, environmentDetails] = await Promise.all([
			processUserContent(),
			this.getEnvironmentDetails(includeFileDetails),
		])

		// Note: Directory creation is now handled automatically by rule_loader
		const clinerulesError = false

		// Add focus chain instructions if enabled and needed
		if (!useCompactPrompt && this.focusChainManager?.shouldIncludeFocusChainInstructions()) {
			const focusChainInstructions = this.focusChainManager.generateFocusChainInstructions()
			processedUserContent.push({
				type: "text",
				text: focusChainInstructions,
			})
		}

		return [processedUserContent, environmentDetails, clinerulesError]
	}

	/**
	 * Get comprehensive environment details
	 *
	 * Gathers all environmental context including:
	 * - OS/host information
	 * - Workspace roots (for multi-root workspaces)
	 * - Terminal states and outputs
	 * - Recently modified files
	 * - Current time with timezone
	 * - File listings (if requested)
	 * - Detected CLI tools
	 * - Context window usage
	 * - Current mode (Plan vs Act)
	 *
	 * @param includeFileDetails - Whether to include file listings and CLI tools
	 * @returns Formatted environment details string wrapped in XML tags
	 */
	async getEnvironmentDetails(includeFileDetails: boolean = false): Promise<string> {
		const host = await HostProvider.env.getHostVersion({})
		let details = ""

		// Add workspace roots section for multi-root workspaces (comes first)
		details += this.formatWorkspaceRootsSection()

		// Get visible files from host
		details += `\n\n# ${host.platform} Visible Files`
		const rawVisiblePaths = (await HostProvider.window.getVisibleTabs({})).paths
		const filteredVisiblePaths = await this.filterExistingFiles(rawVisiblePaths)
		const visibleFilePaths = filteredVisiblePaths.map((absolutePath) => path.relative(this.cwd, absolutePath))
		const allowedVisibleFiles = this.clineIgnoreController
			.filterPaths(visibleFilePaths)
			.map((p) => p.toPosix())
			.join("\n")
		if (allowedVisibleFiles) {
			details += `\n${allowedVisibleFiles}`
		} else {
			details += "\n(No visible files)"
		}

		// Get open tabs from host
		details += `\n\n# ${host.platform} Open Tabs`
		const rawOpenTabPaths = (await HostProvider.window.getOpenTabs({})).paths
		const filteredOpenTabPaths = await this.filterExistingFiles(rawOpenTabPaths)
		const openTabPaths = filteredOpenTabPaths.map((absolutePath) => path.relative(this.cwd, absolutePath))
		const allowedOpenTabs = this.clineIgnoreController
			.filterPaths(openTabPaths)
			.map((p) => p.toPosix())
			.join("\n")
		if (allowedOpenTabs) {
			details += `\n${allowedOpenTabs}`
		} else {
			details += "\n(No open tabs)"
		}

		// Add terminal information
		let terminalDetails = ""
		const busyTerminals = this.terminalManager.getTerminals(true)
		const inactiveTerminals = this.terminalManager.getTerminals(false)

		// Wait for terminals to settle if we edited files
		if (busyTerminals.length > 0 && this.taskState.didEditFile) {
			await setTimeoutPromise(300)
		}

		// Wait for busy terminals to cool down
		if (busyTerminals.length > 0) {
			await pWaitFor(() => busyTerminals.every((t) => !this.terminalManager.isProcessHot(t.id)), {
				interval: 100,
				timeout: 15_000,
			}).catch(() => {})
		}

		this.taskState.didEditFile = false

		// Add busy terminal outputs
		if (busyTerminals.length > 0) {
			terminalDetails += "\n\n# Actively Running Terminals"
			for (const busyTerminal of busyTerminals) {
				terminalDetails += `\n## Original command: \`${busyTerminal.lastCommand}\``
				const newOutput = this.terminalManager.getUnretrievedOutput(busyTerminal.id)
				if (newOutput) {
					terminalDetails += `\n### New Output\n${newOutput}`
				}
			}
		}

		// Show inactive terminals only if there's new output
		if (inactiveTerminals.length > 0) {
			const inactiveTerminalOutputs = new Map<number, string>()
			for (const inactiveTerminal of inactiveTerminals) {
				const newOutput = this.terminalManager.getUnretrievedOutput(inactiveTerminal.id)
				if (newOutput) {
					inactiveTerminalOutputs.set(inactiveTerminal.id, newOutput)
				}
			}
			if (inactiveTerminalOutputs.size > 0) {
				terminalDetails += "\n\n# Inactive Terminals"
				for (const [terminalId, newOutput] of inactiveTerminalOutputs) {
					const inactiveTerminal = inactiveTerminals.find((t) => t.id === terminalId)
					if (inactiveTerminal) {
						terminalDetails += `\n## ${inactiveTerminal.lastCommand}`
						terminalDetails += `\n### New Output\n${newOutput}`
					}
				}
			}
		}

		if (terminalDetails) {
			details += terminalDetails
		}

		// Add recently modified files section
		const recentlyModifiedFiles = this.fileContextTracker.getAndClearRecentlyModifiedFiles()
		if (recentlyModifiedFiles.length > 0) {
			details +=
				"\n\n# Recently Modified Files\nThese files have been modified since you last accessed them (file was just edited so you may need to re-read it before editing):"
			for (const filePath of recentlyModifiedFiles) {
				details += `\n${filePath}`
			}
		}

		// Add current time information with timezone
		const now = new Date()
		const formatter = new Intl.DateTimeFormat(undefined, {
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			hour12: true,
		})
		const timeZone = formatter.resolvedOptions().timeZone
		const timeZoneOffset = -now.getTimezoneOffset() / 60
		const timeZoneOffsetStr = `${timeZoneOffset >= 0 ? "+" : ""}${timeZoneOffset}:00`
		details += `\n\n# Current Time\n${formatter.format(now)} (${timeZone}, UTC${timeZoneOffsetStr})`

		// Add file details if requested
		if (includeFileDetails) {
			details += this.formatFileDetailsHeader()
			const isDesktop = arePathsEqual(this.cwd, getDesktopDir())
			if (isDesktop) {
				// Don't show desktop files automatically (would trigger permission popup)
				details += "(Desktop files not shown automatically. Use list_files to explore if needed.)"
			} else {
				const [files, didHitLimit] = await listFiles(this.cwd, true, 200)
				const result = formatResponse.formatFilesList(this.cwd, files, didHitLimit, this.clineIgnoreController)
				details += result
			}

			// Add workspace configuration in JSON format
			if (this.workspaceManager) {
				const workspacesJson = await this.workspaceManager.buildWorkspacesJson()
				if (workspacesJson) {
					details += `\n\n# Workspace Configuration\n${workspacesJson}`
				}
			}

			// Add detected CLI tools
			const availableCliTools = await detectAvailableCliTools()
			if (availableCliTools.length > 0) {
				details += `\n\n# Detected CLI Tools\nThese are some of the tools on the user's machine, and may be useful if needed to accomplish the task: ${availableCliTools.join(", ")}. This list is not exhaustive, and other tools may be available.`
			}
		}

		// Add context window usage information
		const { contextWindow } = getContextWindowInfo(this.api)

		// Get token count from most recent API request
		const getTotalTokensFromApiReqMessage = (msg: ClineMessage) => {
			if (!msg.text) {
				return 0
			}
			try {
				const { tokensIn, tokensOut, cacheWrites, cacheReads } = JSON.parse(msg.text)
				return (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)
			} catch (_e) {
				return 0
			}
		}

		const clineMessages = this.messageStateHandler.getClineMessages()
		const modifiedMessages = combineApiRequests(combineCommandSequences(clineMessages.slice(1)))
		const lastApiReqMessage = findLast(modifiedMessages, (msg) => {
			if (msg.say !== "api_req_started") {
				return false
			}
			return getTotalTokensFromApiReqMessage(msg) > 0
		})

		const lastApiReqTotalTokens = lastApiReqMessage ? getTotalTokensFromApiReqMessage(lastApiReqMessage) : 0
		const usagePercentage = Math.round((lastApiReqTotalTokens / contextWindow) * 100)

		details += "\n\n# Context Window Usage"
		details += `\n${lastApiReqTotalTokens.toLocaleString()} / ${(contextWindow / 1000).toLocaleString()}K tokens used (${usagePercentage}%)`

		// Add current mode information
		details += "\n\n# Current Mode"
		const mode = this.stateManager.getGlobalSettingsKey("mode")
		if (mode === "plan") {
			details += "\nPLAN MODE\n" + formatResponse.planModeInstructions()
		} else {
			details += "\nACT MODE"
		}

		return `<environment_details>\n${details.trim()}\n</environment_details>`
	}

	/**
	 * Format workspace roots section for multi-root workspaces
	 *
	 * @returns Formatted workspace roots section, or empty string for single-root
	 * @private
	 */
	private formatWorkspaceRootsSection(): string {
		const multiRootEnabled = isMultiRootEnabled(this.stateManager)
		const hasWorkspaceManager = !!this.workspaceManager
		const roots = hasWorkspaceManager ? this.workspaceManager!.getRoots() : []

		// Only show workspace roots if multi-root is enabled and there are multiple roots
		if (!multiRootEnabled || roots.length <= 1) {
			return ""
		}

		let section = "\n\n# Workspace Roots"

		// Format each root with its name, path, and VCS info
		for (const root of roots) {
			const name = root.name || path.basename(root.path)
			const vcs = root.vcs ? ` (${String(root.vcs)})` : ""
			section += `\n- ${name}: ${root.path}${vcs}`
		}

		// Add primary workspace information
		const primary = this.workspaceManager!.getPrimaryRoot()
		const primaryName = this.getPrimaryWorkspaceName(primary)
		section += `\n\nPrimary workspace: ${primaryName}`

		return section
	}

	/**
	 * Get the display name for the primary workspace
	 *
	 * @param primary - Primary workspace root info
	 * @returns Display name for primary workspace
	 * @private
	 */
	private getPrimaryWorkspaceName(primary?: ReturnType<WorkspaceRootManager["getRoots"]>[0]): string {
		if (primary?.name) {
			return primary.name
		}
		if (primary?.path) {
			return path.basename(primary.path)
		}
		return path.basename(this.cwd)
	}

	/**
	 * Format the file details header based on workspace configuration
	 *
	 * @returns Formatted file details header string
	 * @private
	 */
	private formatFileDetailsHeader(): string {
		const multiRootEnabled = isMultiRootEnabled(this.stateManager)
		const roots = this.workspaceManager?.getRoots() || []

		if (multiRootEnabled && roots.length > 1) {
			const primary = this.workspaceManager?.getPrimaryRoot()
			const primaryName = this.getPrimaryWorkspaceName(primary)
			return `\n\n# Current Working Directory (Primary: ${primaryName}) Files\n`
		} else {
			return `\n\n# Current Working Directory (${this.cwd.toPosix()}) Files\n`
		}
	}
}
