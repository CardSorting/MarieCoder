import { ensureCacheDirectoryExists, ensureMcpServersDirectoryExists, ensureSettingsDirectoryExists } from "@core/storage/disk"
import { cleanupLegacyCheckpoints } from "@integrations/checkpoints/CheckpointMigration"
import { Logger } from "@services/logging/Logger"
import * as vscode from "vscode"

/**
 * Handles extension-level setup and configuration
 * Extracted from Controller constructor
 */
export class ExtensionSetup {
	/**
	 * Initialize extension environment
	 * Creates required directories and performs cleanup
	 */
	static async initialize(_context: vscode.ExtensionContext): Promise<void> {
		await ExtensionSetup.createDirectories()
		await ExtensionSetup.cleanupLegacyData()
	}

	/**
	 * Create required directories for cache, MCP servers, and settings
	 */
	private static async createDirectories(): Promise<void> {
		try {
			await ensureCacheDirectoryExists()
			await ensureMcpServersDirectoryExists()
			await ensureSettingsDirectoryExists()
		} catch (error) {
			Logger.error(
				"[ExtensionSetup] Failed to create directories",
				error instanceof Error ? error : new Error(String(error)),
			)
			throw error
		}
	}

	/**
	 * Cleanup legacy checkpoint data
	 * Non-critical operation - continues on error
	 */
	private static async cleanupLegacyData(): Promise<void> {
		try {
			await cleanupLegacyCheckpoints()
		} catch (error) {
			Logger.error(
				"[ExtensionSetup] Failed to cleanup legacy data",
				error instanceof Error ? error : new Error(String(error)),
			)
			// Non-critical, continue
		}
	}
}
