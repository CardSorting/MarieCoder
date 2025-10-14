import { Anthropic } from "@anthropic-ai/sdk"
import type { ContextManager } from "@core/context/context-management/context_manager"
import type { FileContextTracker } from "@core/context/context-tracking"
import type { ClineIgnoreController } from "@core/ignore/ClineIgnoreController"
import { formatResponse } from "@core/prompts/response_formatters"
import { ensureTaskDirectoryExists, getSavedApiConversationHistory, getSavedClineMessages } from "@core/storage/disk"
import type { ICheckpointManager } from "@integrations/checkpoints/types"
import { processFilesIntoText } from "@integrations/misc/extract-text"
import { Logger } from "@services/logging/Logger"
import { findLastIndex } from "@shared/array"
import type { ClineApiReqInfo, ClineAsk } from "@shared/ExtensionMessage"
import type { StateManager } from "@/core/storage/StateManager"
import type { DiffViewProvider } from "@/integrations/editor/DiffViewProvider"
import type { TerminalManager } from "@/integrations/terminal/TerminalManager"
import type { BrowserSession } from "@/services/browser/BrowserSession"
import type { UrlContentFetcher } from "@/services/browser/UrlContentFetcher"
import type { McpHub } from "@/services/mcp/McpHub"
import type { FocusChainManager } from "../focus-chain"
import type { MessageStateHandler } from "../message-state"
import type { TaskState } from "../TaskState"

type UserContent = Array<Anthropic.ContentBlockParam>

type TaskLifecycleDependencies = {
	clineIgnoreController: ClineIgnoreController
	messageStateHandler: MessageStateHandler
	postStateToWebview: () => Promise<void>
	say: (type: any, text?: string, images?: string[], files?: string[]) => Promise<number | undefined>
	ask: (type: ClineAsk) => Promise<{
		response: any
		text?: string
		images?: string[]
		files?: string[]
		askTs?: number
	}>
	checkpointManager?: ICheckpointManager
	cwd: string
	taskState: TaskState
	taskId: string
	fileContextTracker: FileContextTracker
	contextManager: ContextManager
	stateManager: StateManager
	terminalManager: TerminalManager
	urlContentFetcher: UrlContentFetcher
	browserSession: BrowserSession
	diffViewProvider: DiffViewProvider
	mcpHub: McpHub
	focusChainManager?: FocusChainManager
	recursivelyMakeClineRequests: (userContent: UserContent, includeFileDetails: boolean) => Promise<boolean>
}

/**
 * Handles task lifecycle operations
 *
 * This service manages the complete lifecycle of a task, including:
 * - Starting new tasks
 * - Resuming tasks from history
 * - Running the main task loop
 * - Aborting tasks and cleanup
 *
 * Responsibilities:
 * - Initialize task state for new tasks
 * - Restore task state from history
 * - Manage the task execution loop
 * - Clean up resources on task abort
 * - Handle task resumption with user feedback
 *
 * @example
 * ```typescript
 * const lifecycleService = new TaskLifecycleService(deps)
 * await lifecycleService.startTask("Create a new feature", images, files)
 * ```
 */
export class TaskLifecycleService {
	constructor(private readonly deps: TaskLifecycleDependencies) {}

	/**
	 * Start a new task
	 *
	 * Initializes a fresh task with the provided user input. This method:
	 * - Initializes the ClineIgnoreController
	 * - Resets conversation history
	 * - Creates initial user content with task, images, and files
	 * - Kicks off the task execution loop
	 *
	 * @param task - The task description from the user
	 * @param images - Optional array of image paths
	 * @param files - Optional array of file paths
	 */
	async startTask(task?: string, images?: string[], files?: string[]): Promise<void> {
		try {
			await this.deps.clineIgnoreController.initialize()
		} catch (error) {
			Logger.error("Failed to initialize ClineIgnoreController", error instanceof Error ? error : new Error(String(error)))
			// Optionally, inform the user or handle the error appropriately
		}
		// conversationHistory (for API) and clineMessages (for webview) need to be in sync
		// if the extension process were killed, then on restart the clineMessages might not be empty, so we need to set it to [] when we create a new Cline client (otherwise webview would show stale messages from previous session)
		this.deps.messageStateHandler.setClineMessages([])
		this.deps.messageStateHandler.setApiConversationHistory([])

		await this.deps.postStateToWebview()

		await this.deps.say("text", task, images, files)

		this.deps.taskState.isInitialized = true

		const imageBlocks: Anthropic.ImageBlockParam[] = formatResponse.imageBlocks(images)

		const userContent: UserContent = [
			{
				type: "text",
				text: `<task>\n${task}\n</task>`,
			},
			...imageBlocks,
		]

		if (files && files.length > 0) {
			const fileContentString = await processFilesIntoText(files)
			if (fileContentString) {
				userContent.push({
					type: "text",
					text: fileContentString,
				})
			}
		}

		await this.initiateTaskLoop(userContent)
	}

	/**
	 * Resume a task from history
	 *
	 * Restores a previously saved task and prepares it for continuation. This method:
	 * - Loads saved messages and API conversation history
	 * - Cleans up stale resume messages
	 * - Restores context history
	 * - Asks user if they want to resume or provide feedback
	 * - Builds resume message with context
	 * - Kicks off the task execution loop
	 */
	async resumeTaskFromHistory(): Promise<void> {
		try {
			await this.deps.clineIgnoreController.initialize()
		} catch (error) {
			Logger.error("Failed to initialize ClineIgnoreController", error instanceof Error ? error : new Error(String(error)))
			// Optionally, inform the user or handle the error appropriately
		}

		const savedClineMessages = await getSavedClineMessages(this.deps.taskId)

		// Remove any resume messages that may have been added before
		const lastRelevantMessageIndex = findLastIndex(
			savedClineMessages,
			(m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"),
		)
		if (lastRelevantMessageIndex !== -1) {
			savedClineMessages.splice(lastRelevantMessageIndex + 1)
		}

		// since we don't use api_req_finished anymore, we need to check if the last api_req_started has a cost value, if it doesn't and no cancellation reason to present, then we remove it since it indicates an api request without any partial content streamed
		const lastApiReqStartedIndex = findLastIndex(savedClineMessages, (m) => m.type === "say" && m.say === "api_req_started")
		if (lastApiReqStartedIndex !== -1) {
			const lastApiReqStarted = savedClineMessages[lastApiReqStartedIndex]
			const { cost, cancelReason }: ClineApiReqInfo = JSON.parse(lastApiReqStarted.text || "{}")
			if (cost === undefined && cancelReason === undefined) {
				savedClineMessages.splice(lastApiReqStartedIndex, 1)
			}
		}

		await this.deps.messageStateHandler.overwriteClineMessages(savedClineMessages)
		this.deps.messageStateHandler.setClineMessages(await getSavedClineMessages(this.deps.taskId))

		// Now present the cline messages to the user and ask if they want to resume (NOTE: we ran into a bug before where the apiconversationhistory wouldn't be initialized when opening a old task, and it was because we were waiting for resume)
		// This is important in case the user deletes messages without resuming the task first
		const savedApiConversationHistory = await getSavedApiConversationHistory(this.deps.taskId)
		this.deps.messageStateHandler.setApiConversationHistory(savedApiConversationHistory)

		// load the context history state
		await ensureTaskDirectoryExists(this.deps.taskId)
		await this.deps.contextManager.initializeContextHistory(await ensureTaskDirectoryExists(this.deps.taskId))

		const lastClineMessage = this.deps.messageStateHandler
			.getClineMessages()
			.slice()
			.reverse()
			.find((m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task")) // could be multiple resume tasks

		let askType: ClineAsk
		if (lastClineMessage?.ask === "completion_result") {
			askType = "resume_completed_task"
		} else {
			askType = "resume_task"
		}

		this.deps.taskState.isInitialized = true

		const { response, text, images, files } = await this.deps.ask(askType) // calls poststatetowebview
		let responseText: string | undefined
		let responseImages: string[] | undefined
		let responseFiles: string[] | undefined
		if (response === "messageResponse") {
			await this.deps.say("user_feedback", text, images, files)
			await this.deps.checkpointManager?.saveCheckpoint()
			responseText = text
			responseImages = images
			responseFiles = files
		}

		// need to make sure that the api conversation history can be resumed by the api, even if it goes out of sync with cline messages

		const existingApiConversationHistory: Anthropic.Messages.MessageParam[] = await getSavedApiConversationHistory(
			this.deps.taskId,
		)

		// Remove the last user message so we can update it with the resume message
		let modifiedOldUserContent: UserContent // either the last message if its user message, or the user message before the last (assistant) message
		let modifiedApiConversationHistory: Anthropic.Messages.MessageParam[] // need to remove the last user message to replace with new modified user message
		if (existingApiConversationHistory.length > 0) {
			const lastMessage = existingApiConversationHistory[existingApiConversationHistory.length - 1]
			if (lastMessage.role === "assistant") {
				modifiedApiConversationHistory = [...existingApiConversationHistory]
				modifiedOldUserContent = []
			} else if (lastMessage.role === "user") {
				const existingUserContent: UserContent = Array.isArray(lastMessage.content)
					? lastMessage.content
					: [{ type: "text", text: lastMessage.content }]
				modifiedApiConversationHistory = existingApiConversationHistory.slice(0, -1)
				modifiedOldUserContent = [...existingUserContent]
			} else {
				throw new Error("Unexpected: Last message is not a user or assistant message")
			}
		} else {
			throw new Error("Unexpected: No existing API conversation history")
		}

		const newUserContent: UserContent = [...modifiedOldUserContent]

		const agoText = (() => {
			const timestamp = lastClineMessage?.ts ?? Date.now()
			const now = Date.now()
			const diff = now - timestamp
			const minutes = Math.floor(diff / 60000)
			const hours = Math.floor(minutes / 60)
			const days = Math.floor(hours / 24)

			if (days > 0) {
				return `${days} day${days > 1 ? "s" : ""} ago`
			}
			if (hours > 0) {
				return `${hours} hour${hours > 1 ? "s" : ""} ago`
			}
			if (minutes > 0) {
				return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
			}
			return "just now"
		})()

		const wasRecent = lastClineMessage?.ts && Date.now() - lastClineMessage.ts < 30_000

		// Check if there are pending file context warnings before calling taskResumption
		const pendingContextWarning = await this.deps.fileContextTracker.retrieveAndClearPendingFileContextWarning()
		const hasPendingFileContextWarnings = pendingContextWarning && pendingContextWarning.length > 0

		const mode = this.deps.stateManager.getGlobalSettingsKey("mode")
		const [taskResumptionMessage, userResponseMessage] = formatResponse.taskResumption(
			mode === "plan" ? "plan" : "act",
			agoText,
			this.deps.cwd,
			wasRecent,
			responseText,
			hasPendingFileContextWarnings,
		)

		if (taskResumptionMessage !== "") {
			newUserContent.push({
				type: "text",
				text: taskResumptionMessage,
			})
		}

		if (userResponseMessage !== "") {
			newUserContent.push({
				type: "text",
				text: userResponseMessage,
			})
		}

		if (responseImages && responseImages.length > 0) {
			newUserContent.push(...formatResponse.imageBlocks(responseImages))
		}

		if (responseFiles && responseFiles.length > 0) {
			const fileContentString = await processFilesIntoText(responseFiles)
			if (fileContentString) {
				newUserContent.push({
					type: "text",
					text: fileContentString,
				})
			}
		}

		// Inject file context warning if there were pending warnings from message editing
		if (pendingContextWarning && pendingContextWarning.length > 0) {
			const fileContextWarning = formatResponse.fileContextWarning(pendingContextWarning)
			newUserContent.push({
				type: "text",
				text: fileContextWarning,
			})
		}

		await this.deps.messageStateHandler.overwriteApiConversationHistory(modifiedApiConversationHistory)
		await this.initiateTaskLoop(newUserContent)
	}

	/**
	 * Initiate the main task execution loop
	 *
	 * Runs the agentic task loop where the AI agent:
	 * - Makes API requests with user content
	 * - Executes tools based on AI responses
	 * - Continues until completion or max requests reached
	 * - Handles cases where AI doesn't use tools
	 *
	 * @param userContent - Initial user content to start the loop
	 * @private
	 */
	private async initiateTaskLoop(userContent: UserContent): Promise<void> {
		let nextUserContent = userContent
		let includeFileDetails = true
		while (!this.deps.taskState.abort) {
			const didEndLoop = await this.deps.recursivelyMakeClineRequests(nextUserContent, includeFileDetails)
			includeFileDetails = false // we only need file details the first time

			//  The way this agentic loop works is that cline will be given a task that he then calls tools to complete. unless there's an attempt_completion call, we keep responding back to him with his tool's responses until he either attempt_completion or does not use anymore tools. If he does not use anymore tools, we ask him to consider if he's completed the task and then call attempt_completion, otherwise proceed with completing the task.
			// There is a MAX_REQUESTS_PER_TASK limit to prevent infinite requests, but Cline is prompted to finish the task as efficiently as he can.

			//const totalCost = this.calculateApiCost(totalInputTokens, totalOutputTokens)
			if (didEndLoop) {
				// Task loop has completed - set abort flag to signal completion
				// This allows CLI and other environments to detect when the task has finished
				this.deps.taskState.abort = true
				// For now a task never 'completes'. This will only happen if the user hits max requests and denies resetting the count.
				//this.say("task_completed", `Task completed. Total API usage cost: ${totalCost}`)
				break
			} else {
				// this.say(
				// 	"tool",
				// 	"Cline responded with only text blocks but has not called attempt_completion yet. Forcing him to continue with task..."
				// )
				nextUserContent = [
					{
						type: "text",
						text: formatResponse.noToolsUsed(),
					},
				]
				this.deps.taskState.consecutiveMistakeCount++
			}
		}
	}

	/**
	 * Abort the current task and clean up all resources
	 *
	 * Performs complete cleanup when a task is aborted:
	 * - Checks for incomplete focus chain progress
	 * - Sets abort flag to stop running promises
	 * - Disposes all terminals
	 * - Closes browser and URL fetcher
	 * - Disposes file context tracker
	 * - Reverts any uncommitted changes
	 * - Clears MCP notification callback
	 * - Disposes focus chain manager
	 */
	async abortTask(): Promise<void> {
		// Check for incomplete progress before aborting
		if (this.deps.focusChainManager) {
			this.deps.focusChainManager.checkIncompleteProgressOnCompletion()
		}

		this.deps.taskState.abort = true // will stop any autonomously running promises
		this.deps.terminalManager.disposeAll()
		this.deps.urlContentFetcher.closeBrowser()
		await this.deps.browserSession.dispose()
		this.deps.clineIgnoreController.dispose()
		this.deps.fileContextTracker.dispose()
		// need to await for when we want to make sure directories/files are reverted before
		// re-starting the task from a checkpoint
		await this.deps.diffViewProvider.revertChanges()
		// Clear the notification callback when task is aborted
		this.deps.mcpHub.clearNotificationCallback()
		if (this.deps.focusChainManager) {
			this.deps.focusChainManager.dispose()
		}
	}
}
