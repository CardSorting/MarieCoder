import { ensureCacheDirectoryExists, GlobalFileNames } from "@core/storage/disk"
import { fileExistsAtPath } from "@utils/fs"
import fs from "fs/promises"
import path from "path"

/**
 * Unified model caching service
 * Only used for OpenRouter (Anthropic models are static)
 * Follows NORMIE DEV methodology: ruthlessly simple
 */
export class ModelCache {
	/**
	 * Reads cached models from disk for a specific provider
	 */
	async read<T>(fileName: string): Promise<T | undefined> {
		try {
			const filePath = path.join(await ensureCacheDirectoryExists(), fileName)
			const fileExists = await fileExistsAtPath(filePath)

			if (!fileExists) {
				return undefined
			}

			const fileContents = await fs.readFile(filePath, "utf-8")
			return JSON.parse(fileContents) as T
		} catch {
			return undefined
		}
	}

	/**
	 * Writes models to cache for a specific provider
	 */
	async write<T>(fileName: string, models: T): Promise<void> {
		try {
			const filePath = path.join(await ensureCacheDirectoryExists(), fileName)
			await fs.writeFile(filePath, JSON.stringify(models, null, 2))
		} catch {
			// Silently fail - caching is optional
		}
	}

	/**
	 * Gets the full file path for a cache file
	 */
	async getFilePath(fileName: string): Promise<string> {
		return path.join(await ensureCacheDirectoryExists(), fileName)
	}
}

/**
 * Singleton instance for model caching
 */
export const modelCache = new ModelCache()

/**
 * Cache file names for supported providers
 * Only Anthropic (no caching needed) and OpenRouter
 */
export const CacheFileNames = {
	openRouter: GlobalFileNames.openRouterModels,
} as const
