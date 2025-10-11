import type { FileContextTracker } from "@core/context/context-tracking"
import type { MessageStateHandler } from "@core/task/message-state"
import type { TaskState } from "@core/task/TaskState"
import type { WorkspaceRootManager } from "@core/workspace/WorkspaceRootManager"
import type { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import type { ClineSay } from "@shared/ExtensionMessage"
import type { HistoryItem } from "@shared/HistoryItem"
import type { ClineCheckpointRestore } from "@shared/WebviewMessage"
import CheckpointTracker from "./CheckpointTracker"
import { MessageStateCoordinator } from "./coordinators/message_state_coordinator"
import { RestorationCoordinator } from "./coordinators/restoration_coordinator"
import { CheckpointUICoordinator } from "./coordinators/ui_coordinator"
import { TrackerInitializer } from "./initialization/tracker_initializer"
import { WorkspaceResolver } from "./initialization/workspace_resolver"
import { CheckpointDiffPresenter } from "./operations/checkpoint_diff_presenter"
import { CheckpointRestorer } from "./operations/checkpoint_restorer"
import { CheckpointSaver } from "./operations/checkpoint_saver"
import { CheckpointValidator } from "./operations/checkpoint_validator"
import type { ICheckpointManager } from "./types"
import { CheckpointStateManager } from "./utils/checkpoint_state_manager"

// Type definitions for callbacks
type SayFunction = (
	type: ClineSay,
	text?: string,
	images?: string[],
	files?: string[],
	partial?: boolean,
) => Promise<number | undefined>

type UpdateTaskHistoryFunction = (historyItem: HistoryItem) => Promise<HistoryItem[]>

/**
 * Task information
 */
interface CheckpointManagerTask {
	readonly taskId: string
}

/**
 * Configuration
 */
interface CheckpointManagerConfig {
	readonly enableCheckpoints: boolean
}

/**
 * Required services
 */
interface CheckpointManagerServices {
	readonly fileContextTracker: FileContextTracker
	readonly diffViewProvider: DiffViewProvider
	readonly messageStateHandler: MessageStateHandler
	readonly taskState: TaskState
	readonly workspaceManager?: WorkspaceRootManager
}

/**
 * Callbacks
 */
interface CheckpointManagerCallbacks {
	readonly updateTaskHistory: UpdateTaskHistoryFunction
	readonly cancelTask: () => Promise<void>
	readonly say: SayFunction
	readonly postStateToWebview: () => Promise<void>
}

/**
 * Initial state
 */
interface CheckpointManagerInternalState {
	conversationHistoryDeletedRange?: [number, number]
	checkpointTracker?: CheckpointTracker
	checkpointManagerErrorMessage?: string
	checkpointTrackerInitPromise?: Promise<CheckpointTracker | undefined>
}

/**
 * TaskCheckpointManager - Facade
 *
 * Coordinates all checkpoint-related operations within a task.
 * Delegates to specialized modules for clarity and maintainability.
 *
 * Architecture:
 * - Coordinators: UI, MessageState, Restoration
 * - Operations: Validator, Saver, DiffPresenter, Restorer
 * - Initialization: TrackerInitializer, WorkspaceResolver
 * - Utils: CheckpointStateManager
 *
 * Public API (implements ICheckpointManager):
 * - saveCheckpoint: Creates a new checkpoint
 * - restoreCheckpoint: Restores to a previous checkpoint
 * - presentMultifileDiff: Shows diff between checkpoints
 * - doesLatestTaskCompletionHaveNewChanges: Checks for new changes
 * - commit: Creates a commit
 */
export class TaskCheckpointManager implements ICheckpointManager {
	private readonly config: CheckpointManagerConfig
	private readonly callbacks: CheckpointManagerCallbacks

	// State management
	private readonly stateManager: CheckpointStateManager

	// Coordinators
	private readonly uiCoordinator: CheckpointUICoordinator
	private readonly messageCoordinator: MessageStateCoordinator
	private readonly restorationCoordinator: RestorationCoordinator

	// Initialization
	private readonly workspaceResolver: WorkspaceResolver
	private readonly trackerInitializer: TrackerInitializer

	// Operations
	private readonly validator: CheckpointValidator
	private readonly saver: CheckpointSaver
	private readonly diffPresenter: CheckpointDiffPresenter
	private readonly restorer: CheckpointRestorer

	constructor(
		task: CheckpointManagerTask,
		config: CheckpointManagerConfig,
		services: CheckpointManagerServices,
		callbacks: CheckpointManagerCallbacks,
		initialState: CheckpointManagerInternalState,
	) {
		this.config = config
		this.callbacks = Object.freeze(callbacks)

		// Initialize state manager
		this.stateManager = new CheckpointStateManager(initialState)

		// Initialize coordinators
		this.uiCoordinator = new CheckpointUICoordinator()
		this.messageCoordinator = new MessageStateCoordinator(services.messageStateHandler, callbacks.say)
		this.restorationCoordinator = new RestorationCoordinator(
			{ taskId: task.taskId },
			this.messageCoordinator,
			this.uiCoordinator,
			services.fileContextTracker,
			callbacks.say,
			callbacks.cancelTask,
		)

		// Initialize workspace resolver and tracker initializer
		this.workspaceResolver = new WorkspaceResolver(task.taskId, services.workspaceManager)
		this.trackerInitializer = new TrackerInitializer(
			{ taskId: task.taskId, enableCheckpoints: config.enableCheckpoints },
			this.stateManager,
			this.workspaceResolver,
			this.setcheckpointManagerErrorMessage.bind(this),
		)

		// Initialize operations
		this.validator = new CheckpointValidator(
			{ taskId: task.taskId, enableCheckpoints: config.enableCheckpoints },
			this.messageCoordinator,
			() => this.stateManager.getCheckpointTracker(),
		)

		this.saver = new CheckpointSaver(
			{ taskId: task.taskId, enableCheckpoints: config.enableCheckpoints },
			this.messageCoordinator,
			() => this.stateManager.getCheckpointTracker(),
			() => this.stateManager.getErrorMessage(),
		)

		this.diffPresenter = new CheckpointDiffPresenter(
			{ taskId: task.taskId, enableCheckpoints: config.enableCheckpoints },
			this.messageCoordinator,
			this.uiCoordinator,
			() => this.stateManager.getCheckpointTracker(),
		)

		this.restorer = new CheckpointRestorer(
			{ taskId: task.taskId, enableCheckpoints: config.enableCheckpoints },
			this.messageCoordinator,
			this.uiCoordinator,
			this.restorationCoordinator,
			this.workspaceResolver,
			() => this.stateManager.getCheckpointTracker(),
			(tracker) => this.stateManager.setCheckpointTracker(tracker),
			(message) => this.stateManager.setErrorMessage(message),
		)
	}

	// ============================================================================
	// Public API - ICheckpointManager Implementation
	// ============================================================================

	/**
	 * Creates a checkpoint of the current workspace state
	 */
	async saveCheckpoint(isAttemptCompletionMessage: boolean = false, completionMessageTs?: number): Promise<void> {
		// Check and initialize tracker if needed
		if (!this.stateManager.getCheckpointTracker()) {
			if (!isAttemptCompletionMessage && !this.stateManager.getErrorMessage()) {
				await this.checkpointTrackerCheckAndInit()
			} else if (
				isAttemptCompletionMessage &&
				!this.stateManager.getErrorMessage()?.includes("Checkpoints initialization timed out.")
			) {
				await this.checkpointTrackerCheckAndInit()
			}
		}

		// Save the checkpoint
		await this.saver.save(isAttemptCompletionMessage, completionMessageTs)
	}

	/**
	 * Restores a checkpoint by message timestamp
	 */
	async restoreCheckpoint(
		messageTs: number,
		restoreType: ClineCheckpointRestore,
		offset?: number,
	): Promise<{ conversationHistoryDeletedRange?: [number, number]; checkpointManagerErrorMessage?: string }> {
		const result = await this.restorer.restore(messageTs, restoreType, offset)

		// Update state if needed
		if (result.conversationHistoryDeletedRange) {
			this.stateManager.setDeletedRange(result.conversationHistoryDeletedRange)
		}
		if (result.checkpointManagerErrorMessage) {
			this.stateManager.setErrorMessage(result.checkpointManagerErrorMessage)
		}

		return result
	}

	/**
	 * Presents a multi-file diff view between checkpoints
	 */
	async presentMultifileDiff(messageTs: number, seeNewChangesSinceLastTaskCompletion: boolean): Promise<void> {
		// Initialize tracker if needed for diff presentation
		if (!this.stateManager.getCheckpointTracker() && this.config.enableCheckpoints && !this.stateManager.getErrorMessage()) {
			await this.checkpointTrackerCheckAndInit()
		}

		await this.diffPresenter.presentDiff(messageTs, seeNewChangesSinceLastTaskCompletion)
	}

	/**
	 * Checks if the latest task completion has new changes
	 */
	async doesLatestTaskCompletionHaveNewChanges(): Promise<boolean> {
		// Initialize tracker if needed
		if (this.config.enableCheckpoints && !this.stateManager.getCheckpointTracker() && !this.stateManager.getErrorMessage()) {
			await this.checkpointTrackerCheckAndInit()
		}

		return await this.validator.doesLatestTaskCompletionHaveNewChanges()
	}

	/**
	 * Creates a checkpoint commit
	 */
	async commit(): Promise<string | undefined> {
		// Ensure tracker is initialized
		if (!this.stateManager.getCheckpointTracker()) {
			await this.checkpointTrackerCheckAndInit()
		}

		return await this.saver.commit()
	}

	/**
	 * Checks and initializes checkpoint tracker if needed
	 */
	async checkpointTrackerCheckAndInit(): Promise<CheckpointTracker | undefined> {
		return await this.trackerInitializer.checkAndInit()
	}

	/**
	 * Sets checkpoint tracker instance
	 */
	setCheckpointTracker(checkpointTracker: CheckpointTracker | undefined): void {
		this.stateManager.setCheckpointTracker(checkpointTracker)
	}

	/**
	 * Updates checkpoint error message and posts to webview
	 */
	async setcheckpointManagerErrorMessage(errorMessage: string | undefined): Promise<void> {
		this.stateManager.setErrorMessage(errorMessage)
		await this.callbacks.postStateToWebview()
	}

	/**
	 * Provides public read-only access to current state
	 */
	public getCurrentState(): Readonly<CheckpointManagerInternalState> {
		return this.stateManager.getCurrentState()
	}
}

/**
 * Factory function for creating TaskCheckpointManager instances
 * Used by buildCheckpointManager in factory.ts
 */
export function createTaskCheckpointManager(
	task: CheckpointManagerTask,
	config: CheckpointManagerConfig,
	services: CheckpointManagerServices,
	callbacks: CheckpointManagerCallbacks,
	initialState: CheckpointManagerInternalState,
): TaskCheckpointManager {
	return new TaskCheckpointManager(task, config, services, callbacks, initialState)
}
