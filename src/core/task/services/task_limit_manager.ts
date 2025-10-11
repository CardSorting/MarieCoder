import { Anthropic } from "@anthropic-ai/sdk"
import { formatResponse } from "@core/prompts/response_formatters"
import { processFilesIntoText } from "@integrations/misc/extract-text"
import { showSystemNotification } from "@integrations/notifications"
import type { StateManager } from "@/core/storage/StateManager"
import type { TaskState } from "../TaskState"
import type { TaskMessageService } from "./task_message_service"

type UserContent = Array<Anthropic.ContentBlockParam>

/**
 * Result of checking limits before API request
 */
export interface LimitCheckResult {
	shouldProceed: boolean
	updatedUserContent?: UserContent
}

/**
 * Manages task execution limits and user intervention
 *
 * This service tracks and enforces limits on consecutive mistakes and
 * auto-approved requests. When limits are reached, it prompts the user
 * for feedback and allows them to provide guidance or continue the task.
 *
 * Responsibilities:
 * - Track consecutive mistake count
 * - Track consecutive auto-approved request count
 * - Enforce mistake limit (3 consecutive mistakes)
 * - Enforce auto-approval limit (configurable per user)
 * - Show system notifications when limits reached
 * - Collect and format user feedback
 * - Reset counters after user intervention
 *
 * @example
 * ```typescript
 * const limitManager = new TaskLimitManager(...)
 * const result = await limitManager.checkLimitsBeforeRequest(userContent)
 * if (!result.shouldProceed) return
 * ```
 */
export class TaskLimitManager {
	constructor(
		private readonly taskState: TaskState,
		private readonly messageService: TaskMessageService,
		private readonly stateManager: StateManager,
	) {}

	/**
	 * Check limits before making API request
	 *
	 * Checks both mistake limit and auto-approval limit. If either limit
	 * is reached, prompts the user for feedback and resets the counter.
	 *
	 * Returns updated user content if user provides feedback, allowing
	 * the caller to proceed with the modified content.
	 *
	 * @param userContent - The current user content for the request
	 * @returns Promise<LimitCheckResult> - Whether to proceed and updated content
	 */
	async checkLimitsBeforeRequest(userContent: UserContent): Promise<LimitCheckResult> {
		// Check mistake limit first
		const mistakeResult = await this.checkMistakeLimit(userContent)
		if (!mistakeResult.shouldProceed) {
			return mistakeResult
		}

		// If mistake limit provided new content, use it
		if (mistakeResult.updatedUserContent) {
			userContent = mistakeResult.updatedUserContent
		}

		// Check auto-approval limit
		const autoApprovalResult = await this.checkAutoApprovalLimit(userContent)
		if (!autoApprovalResult.shouldProceed) {
			return autoApprovalResult
		}

		// Return final user content (might be updated from either check)
		return {
			shouldProceed: true,
			updatedUserContent: autoApprovalResult.updatedUserContent || mistakeResult.updatedUserContent,
		}
	}

	/**
	 * Check if mistake limit has been reached
	 *
	 * When 3 consecutive mistakes are detected, shows a notification
	 * (if enabled) and prompts the user with guidance suggestions.
	 * User can provide feedback or continue without changes.
	 *
	 * @param userContent - Current user content
	 * @returns Promise<LimitCheckResult>
	 * @private
	 */
	private async checkMistakeLimit(userContent: UserContent): Promise<LimitCheckResult> {
		if (this.taskState.consecutiveMistakeCount < 3) {
			return { shouldProceed: true }
		}

		const autoApprovalSettings = this.stateManager.getGlobalSettingsKey("autoApprovalSettings")
		if (autoApprovalSettings.enabled && autoApprovalSettings.enableNotifications) {
			showSystemNotification({
				subtitle: "Error",
				message: "Cline is having trouble. Would you like to continue the task?",
			})
		}

		const apiConfig = this.stateManager.getApiConfiguration()
		const modelId = apiConfig?.actModeApiModelId || apiConfig?.planModeApiModelId || ""
		const guidanceText = modelId.includes("claude")
			? `This may indicate a failure in his thought process or inability to use a tool properly, which can be mitigated with some user guidance (e.g. "Try breaking down the task into smaller steps").`
			: "Cline uses complex prompts and iterative task execution that may be challenging for less capable models. For best results, it's recommended to use Claude 4 Sonnet for its advanced agentic coding capabilities."

		const { response, text, images, files } = await this.messageService.ask("mistake_limit_reached", guidanceText)

		if (response === "messageResponse") {
			// Display the user's message in the chat UI
			await this.messageService.say("user_feedback", text, images, files)

			// Format feedback for next API call
			const feedbackUserContent = await this.formatUserFeedback(text, images, files, "tooManyMistakes")

			// Reset mistake counter
			this.taskState.consecutiveMistakeCount = 0

			return {
				shouldProceed: true,
				updatedUserContent: feedbackUserContent,
			}
		}

		// User chose to continue without feedback
		this.taskState.consecutiveMistakeCount = 0

		return { shouldProceed: true }
	}

	/**
	 * Check if auto-approval limit has been reached
	 *
	 * When the configured max auto-approved requests limit is reached,
	 * shows a notification (if enabled) and prompts the user to reset
	 * the counter or provide feedback.
	 *
	 * @param userContent - Current user content
	 * @returns Promise<LimitCheckResult>
	 * @private
	 */
	private async checkAutoApprovalLimit(userContent: UserContent): Promise<LimitCheckResult> {
		const autoApprovalSettings = this.stateManager.getGlobalSettingsKey("autoApprovalSettings")

		if (
			!autoApprovalSettings.enabled ||
			this.taskState.consecutiveAutoApprovedRequestsCount < autoApprovalSettings.maxRequests
		) {
			return { shouldProceed: true }
		}

		if (autoApprovalSettings.enableNotifications) {
			showSystemNotification({
				subtitle: "Max Requests Reached",
				message: `Cline has auto-approved ${autoApprovalSettings.maxRequests.toString()} API requests.`,
			})
		}

		const { response, text, images, files } = await this.messageService.ask(
			"auto_approval_max_req_reached",
			`Cline has auto-approved ${autoApprovalSettings.maxRequests.toString()} API requests. Would you like to reset the count and proceed with the task?`,
		)

		// Reset counter regardless of response
		this.taskState.consecutiveAutoApprovedRequestsCount = 0

		// Process user feedback if provided
		if (response === "messageResponse") {
			// Display the user's message in the chat UI
			await this.messageService.say("user_feedback", text, images, files)

			// Format feedback for next API call
			const feedbackUserContent = await this.formatUserFeedback(text, images, files, "autoApprovalMaxReached")

			return {
				shouldProceed: true,
				updatedUserContent: feedbackUserContent,
			}
		}

		return { shouldProceed: true }
	}

	/**
	 * Format user feedback into content blocks
	 *
	 * Converts user text, images, and files into properly formatted
	 * content blocks for the next API request. Uses response formatters
	 * to add context about why the feedback was requested.
	 *
	 * @param text - User's text feedback
	 * @param images - Optional images from user
	 * @param files - Optional files from user
	 * @param feedbackType - Type of feedback (determines formatting)
	 * @returns Promise<UserContent> - Formatted content blocks
	 * @private
	 */
	private async formatUserFeedback(
		text?: string,
		images?: string[],
		files?: string[],
		feedbackType: "tooManyMistakes" | "autoApprovalMaxReached" = "tooManyMistakes",
	): Promise<UserContent> {
		const feedbackUserContent: UserContent = []

		// Add formatted text based on feedback type
		const formattedText =
			feedbackType === "tooManyMistakes"
				? formatResponse.tooManyMistakes(text)
				: formatResponse.autoApprovalMaxReached(text)

		feedbackUserContent.push({
			type: "text",
			text: formattedText,
		})

		// Add image blocks if provided
		if (images && images.length > 0) {
			feedbackUserContent.push(...formatResponse.imageBlocks(images))
		}

		// Add file content if provided
		if (files && files.length > 0) {
			const fileContentString = await processFilesIntoText(files)
			if (fileContentString) {
				feedbackUserContent.push({
					type: "text",
					text: fileContentString,
				})
			}
		}

		return feedbackUserContent
	}

	/**
	 * Increment mistake counter
	 *
	 * Called when the assistant fails to use tools properly or makes
	 * other mistakes during task execution.
	 */
	incrementMistakeCount(): void {
		this.taskState.consecutiveMistakeCount++
	}

	/**
	 * Reset mistake counter
	 *
	 * Called when the assistant successfully completes an action or
	 * user intervenes with feedback.
	 */
	resetMistakeCount(): void {
		this.taskState.consecutiveMistakeCount = 0
	}

	/**
	 * Get current consecutive mistake count
	 *
	 * @returns Current mistake count
	 */
	getMistakeCount(): number {
		return this.taskState.consecutiveMistakeCount
	}

	/**
	 * Increment auto-approved request counter
	 *
	 * Called when a request is automatically approved without user
	 * intervention.
	 */
	incrementAutoApprovedCount(): void {
		this.taskState.consecutiveAutoApprovedRequestsCount++
	}

	/**
	 * Get current consecutive auto-approved request count
	 *
	 * @returns Current auto-approved request count
	 */
	getAutoApprovedCount(): number {
		return this.taskState.consecutiveAutoApprovedRequestsCount
	}
}
