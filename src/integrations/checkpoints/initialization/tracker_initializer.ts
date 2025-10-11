import pTimeout from "p-timeout"
import { Logger } from "@/services/logging/Logger"
import CheckpointTracker from "../CheckpointTracker"
import type { CheckpointStateManager } from "../utils/checkpoint_state_manager"
import type { WorkspaceResolver } from "./workspace_resolver"

/**
 * Configuration for tracker initialization
 */
export interface TrackerInitializerConfig {
	readonly taskId: string
	readonly enableCheckpoints: boolean
	readonly warningTimeoutMs?: number
	readonly initTimeoutMs?: number
}

/**
 * Callback for error message updates
 */
type ErrorMessageCallback = (errorMessage: string | undefined) => Promise<void>

/**
 * Handles initialization of CheckpointTracker with timeout and warning support
 */
export class TrackerInitializer {
	private readonly WARNING_TIMEOUT_MS: number
	private readonly INIT_TIMEOUT_MS: number

	constructor(
		private readonly config: TrackerInitializerConfig,
		private readonly stateManager: CheckpointStateManager,
		private readonly workspaceResolver: WorkspaceResolver,
		private readonly onErrorMessage: ErrorMessageCallback,
	) {
		this.WARNING_TIMEOUT_MS = config.warningTimeoutMs || 7_000
		this.INIT_TIMEOUT_MS = config.initTimeoutMs || 15_000
	}

	/**
	 * Check and initialize checkpoint tracker if needed
	 * Prevents concurrent initialization attempts
	 */
	async checkAndInit(): Promise<CheckpointTracker | undefined> {
		// If tracker already exists, return it
		if (this.stateManager.getCheckpointTracker()) {
			return this.stateManager.getCheckpointTracker()
		}

		// If initialization is already in progress, wait for it
		const existingPromise = this.stateManager.getInitPromise()
		if (existingPromise) {
			return await existingPromise
		}

		// Start new initialization
		const initPromise = this.initialize()
		this.stateManager.setInitPromise(initPromise)

		try {
			const tracker = await initPromise
			return tracker
		} finally {
			// Clear the promise once complete
			this.stateManager.setInitPromise(undefined)
		}
	}

	/**
	 * Initialize checkpoint tracker with timeout and warning support
	 */
	private async initialize(): Promise<CheckpointTracker | undefined> {
		let warningTimer: NodeJS.Timeout | null = null
		let warningShown = false

		try {
			// Set up warning timer for slow initialization
			warningTimer = setTimeout(async () => {
				if (!warningShown) {
					warningShown = true
					await this.onErrorMessage(
						"Checkpoints are taking longer than expected to initialize. Working in a large repository? Consider re-opening Cline in a project that uses git, or disabling checkpoints.",
					)
				}
			}, this.WARNING_TIMEOUT_MS)

			// Get workspace path
			const workspacePath = await this.workspaceResolver.getWorkspacePath()

			// Create tracker with timeout
			const tracker = await pTimeout(
				CheckpointTracker.create(this.config.taskId, this.config.enableCheckpoints, workspacePath),
				{
					milliseconds: this.INIT_TIMEOUT_MS,
					message:
						"Checkpoints taking too long to initialize. Consider re-opening Cline in a project that uses git, or disabling checkpoints.",
				},
			)

			// Update state with created tracker
			this.stateManager.setCheckpointTracker(tracker)
			return tracker
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			Logger.error("Failed to initialize checkpoint tracker", error instanceof Error ? error : new Error(errorMessage))

			// Handle timeout error specifically
			if (errorMessage.includes("Checkpoints taking too long to initialize")) {
				await this.onErrorMessage(
					"Checkpoints initialization timed out. Consider re-opening Cline in a project that uses git, or disabling checkpoints.",
				)
			} else {
				await this.onErrorMessage(errorMessage)
			}

			return undefined
		} finally {
			// Always clean up the warning timer
			if (warningTimer) {
				clearTimeout(warningTimer)
				warningTimer = null
			}
		}
	}
}
