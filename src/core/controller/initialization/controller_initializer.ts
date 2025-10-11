import { StateManager } from "@core/storage/StateManager"
import * as vscode from "vscode"
import type { Controller } from "../index"
import type { ControllerInitOptions } from "../types/controller_types"
import { ExtensionSetup } from "./extension_setup"

/**
 * Orchestrates Controller initialization
 * Extracted from Controller constructor
 */
export class ControllerInitializer {
	/**
	 * Initialize controller with extension setup and state manager configuration
	 */
	static async initialize(
		controller: Controller,
		_context: vscode.ExtensionContext,
		_options: ControllerInitOptions = {},
	): Promise<void> {
		// Extension-level setup
		await ExtensionSetup.initialize(_context)

		// Setup StateManager callbacks
		await ControllerInitializer.setupStateManager(controller)
	}

	/**
	 * Setup StateManager callbacks for persistence errors and external changes
	 */
	private static async setupStateManager(controller: Controller): Promise<void> {
		StateManager.get().registerCallbacks({
			onPersistenceError: async ({ error }) => {
				await controller.handlePersistenceError(error)
			},
			onSyncExternalChange: async () => {
				await controller.postStateToWebview()
			},
		})
	}
}
