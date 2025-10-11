import { StateManager } from "@core/storage/StateManager"
import { Task } from "@core/task"
import { Logger } from "@services/logging/Logger"
import { McpHub } from "@services/mcp/McpHub"
import type { HistoryItem } from "@shared/HistoryItem"
import pWaitFor from "p-wait-for"
import { getCwd, getDesktopDir } from "@/utils/path"
import { ControllerEventType } from "../events/controller_events"
import { ControllerEventEmitter } from "../events/event_emitter"
import type { Controller } from "../index"
import type { TaskCreationParams } from "../types/controller_types"

/**
 * Coordinates task lifecycle and orchestration
 * Manages task creation, cancellation, and reinitialization
 */
export class TaskCoordinator {
	private readonly NEW_USER_TASK_COUNT_THRESHOLD = 10

	constructor(
		private controller: Controller,
		private stateManager: StateManager,
		private mcpHub: McpHub,
		private eventEmitter: ControllerEventEmitter,
	) {}

	/**
	 * Create and initialize a new task
	 */
	async createTask(params: TaskCreationParams): Promise<string> {
		await this.clearCurrentTask()

		// Update new user status if threshold reached
		await this.updateNewUserStatus(params.historyItem)

		// Update auto-approval settings version
		await this.incrementAutoApprovalVersion()

		// Get task configuration
		const shellIntegrationTimeout = this.stateManager.getGlobalSettingsKey("shellIntegrationTimeout")
		const terminalReuseEnabled = this.stateManager.getGlobalStateKey("terminalReuseEnabled")
		const terminalOutputLineLimit = this.stateManager.getGlobalSettingsKey("terminalOutputLineLimit")
		const defaultTerminalProfile = this.stateManager.getGlobalSettingsKey("defaultTerminalProfile")

		// Initialize workspace manager
		const workspaceManager = this.controller.workspaceCoordinator.getWorkspaceManager()
		const cwd = this.controller.workspaceCoordinator.getCwd() || (await getCwd(getDesktopDir()))

		// Setup task ID and settings
		const taskId = params.historyItem?.id || Date.now().toString()
		await this.stateManager.loadTaskSettings(taskId)
		if (params.taskSettings) {
			this.stateManager.setTaskSettingsBatch(taskId, params.taskSettings)
		}

		// Create task instance
		this.controller.task = new Task({
			controller: this.controller,
			mcpHub: this.mcpHub,
			updateTaskHistory: (historyItem) => this.updateTaskHistory(historyItem),
			postStateToWebview: () => this.controller.postStateToWebview(),
			reinitExistingTaskFromId: (taskId) => this.reinitTask(taskId),
			cancelTask: () => this.cancelTask(),
			shellIntegrationTimeout,
			terminalReuseEnabled: terminalReuseEnabled ?? true,
			terminalOutputLineLimit: terminalOutputLineLimit ?? 500,
			defaultTerminalProfile: defaultTerminalProfile ?? "default",
			cwd,
			stateManager: this.stateManager,
			workspaceManager,
			task: params.task,
			images: params.images,
			files: params.files,
			historyItem: params.historyItem,
			taskId,
		})

		// Emit task created event
		await this.eventEmitter.emit(ControllerEventType.TASK_CREATED, {
			taskId,
			isReinitialization: !!params.historyItem,
		})

		return taskId
	}

	/**
	 * Cancel current task with graceful abort
	 */
	async cancelTask(): Promise<void> {
		if (!this.controller.task) {
			return
		}

		const taskId = this.controller.task.taskId
		const { historyItem } = await this.controller.getTaskWithId(taskId)

		try {
			await this.controller.task.abortTask()
		} catch (error) {
			Logger.error("Failed to abort task", error instanceof Error ? error : new Error(String(error)))
		}

		// Wait for graceful abort
		await pWaitFor(
			() =>
				this.controller.task === undefined ||
				this.controller.task.taskState.isStreaming === false ||
				this.controller.task.taskState.didFinishAbortingStream ||
				this.controller.task.taskState.isWaitingForFirstChunk,
			{
				timeout: 3_000,
			},
		).catch(() => {
			Logger.error("Failed to abort task gracefully")
		})

		if (this.controller.task) {
			// Mark as abandoned to prevent interference with future tasks
			this.controller.task.taskState.abandoned = true
		}

		// Emit task cancelled event
		await this.eventEmitter.emit(ControllerEventType.TASK_CANCELLED, {
			taskId,
		})

		// Reinitialize task from history
		await this.createTask({ historyItem })
	}

	/**
	 * Reinitialize task from history by ID
	 */
	async reinitTask(taskId: string): Promise<void> {
		Logger.info(`[TaskCoordinator] Reinitializing task: ${taskId}`)

		// Emit reinitialize event
		await this.eventEmitter.emit(ControllerEventType.TASK_REINITIALIZE, {
			taskId,
		})

		const history = await this.controller.getTaskWithId(taskId)
		if (history) {
			await this.createTask({ historyItem: history.historyItem })
		}
	}

	/**
	 * Clear current task and cleanup resources
	 */
	async clearCurrentTask(): Promise<void> {
		if (this.controller.task) {
			await this.stateManager.clearTaskSettings()
		}
		await this.controller.task?.abortTask()
		this.controller.task = undefined
	}

	/**
	 * Update new user status based on task count
	 */
	private async updateNewUserStatus(historyItem?: HistoryItem): Promise<void> {
		const isNewUser = this.stateManager.getGlobalStateKey("isNewUser")
		const taskHistory = this.stateManager.getGlobalStateKey("taskHistory")

		if (isNewUser && !historyItem && taskHistory && taskHistory.length >= this.NEW_USER_TASK_COUNT_THRESHOLD) {
			this.stateManager.setGlobalState("isNewUser", false)
			await this.controller.postStateToWebview()

			// Emit new user status change event
			await this.eventEmitter.emit(ControllerEventType.TASK_NEW_USER_STATUS_CHANGED, {
				isNewUser: false,
				taskCount: taskHistory.length,
			})
		}
	}

	/**
	 * Increment auto-approval settings version
	 */
	private async incrementAutoApprovalVersion(): Promise<void> {
		const autoApprovalSettings = this.stateManager.getGlobalSettingsKey("autoApprovalSettings")
		if (autoApprovalSettings) {
			const updatedSettings = {
				...autoApprovalSettings,
				version: (autoApprovalSettings.version ?? 1) + 1,
			}
			this.stateManager.setGlobalState("autoApprovalSettings", updatedSettings)
		}
	}

	/**
	 * Update task history via state coordinator
	 */
	private async updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]> {
		return this.controller.stateCoordinator.updateTaskHistory(item)
	}
}
