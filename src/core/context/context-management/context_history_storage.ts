import { GlobalFileNames } from "@core/storage/disk"
import { fileExistsAtPath } from "@utils/fs"
import fs from "fs/promises"
import * as path from "path"
import { ContextHistoryMap, SerializedContextHistory } from "./context_types"

/**
 * Handles persistence of context history to and from disk
 *
 * This module is responsible for:
 * - Loading context history from disk on initialization
 * - Saving context history to disk when changes are made
 * - Serializing/deserializing the complex Map structure to JSON
 */
export class ContextHistoryStorage {
	/**
	 * Loads stored context history updates from disk
	 * @param taskDirectory - Directory where context history file is stored
	 * @returns Reconstructed context history map, or empty map if none exists
	 */
	async loadFromDisk(taskDirectory: string): Promise<ContextHistoryMap> {
		try {
			const filePath = path.join(taskDirectory, GlobalFileNames.contextHistory)
			if (await fileExistsAtPath(filePath)) {
				const fileData = await fs.readFile(filePath, "utf8")
				const serializedUpdates = JSON.parse(fileData) as SerializedContextHistory

				return new Map(
					serializedUpdates.map(([messageIndex, [editType, innerMapArray]]) => [
						messageIndex,
						[editType, new Map(innerMapArray)],
					]),
				)
			}
		} catch (error) {
			console.error("Failed to load context history:", error)
		}
		return new Map()
	}

	/**
	 * Persists context history updates to disk
	 * @param taskDirectory - Directory where context history should be saved
	 * @param contextHistory - The context history map to save
	 */
	async saveToDisk(taskDirectory: string, contextHistory: ContextHistoryMap): Promise<void> {
		try {
			const serializedUpdates: SerializedContextHistory = Array.from(contextHistory.entries()).map(
				([messageIndex, [editType, innerMap]]) => [messageIndex, [editType, Array.from(innerMap.entries())]],
			)

			await fs.writeFile(
				path.join(taskDirectory, GlobalFileNames.contextHistory),
				JSON.stringify(serializedUpdates),
				"utf8",
			)
		} catch (error) {
			console.error("Failed to save context history:", error)
		}
	}
}
