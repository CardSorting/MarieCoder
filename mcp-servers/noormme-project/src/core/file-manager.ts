/**
 * File Manager for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean, efficient file operations
 */

import fs from "fs-extra"
import path from "path"
import { TemplateFile } from "../types.js"

export class FileManager {
	/**
	 * Ensure directory exists
	 */
	async ensureDirectory(dirPath: string): Promise<void> {
		await fs.ensureDir(dirPath)
	}

	/**
	 * Write multiple files
	 */
	async writeFiles(files: TemplateFile[]): Promise<void> {
		for (const file of files) {
			await this.writeFile(file)
		}
	}

	/**
	 * Write a single file
	 */
	async writeFile(file: TemplateFile): Promise<void> {
		const fullPath = file.path
		await fs.ensureDir(path.dirname(fullPath))

		if (file.isExecutable) {
			await fs.writeFile(fullPath, file.content, { mode: 0o755 })
		} else {
			await fs.writeFile(fullPath, file.content)
		}
	}

	/**
	 * Check if file exists
	 */
	async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Read file content
	 */
	async readFile(filePath: string): Promise<string> {
		return await fs.readFile(filePath, "utf-8")
	}

	/**
	 * Copy file
	 */
	async copyFile(src: string, dest: string): Promise<void> {
		await fs.ensureDir(path.dirname(dest))
		await fs.copy(src, dest)
	}

	/**
	 * Copy directory
	 */
	async copyDirectory(src: string, dest: string): Promise<void> {
		await fs.ensureDir(dest)
		await fs.copy(src, dest)
	}

	/**
	 * Remove file or directory
	 */
	async remove(target: string): Promise<void> {
		await fs.remove(target)
	}

	/**
	 * Get directory contents
	 */
	async readDirectory(dirPath: string): Promise<string[]> {
		return await fs.readdir(dirPath)
	}

	/**
	 * Get file stats
	 */
	async getStats(filePath: string): Promise<fs.Stats> {
		return await fs.stat(filePath)
	}

	/**
	 * Create symlink
	 */
	async createSymlink(target: string, linkPath: string): Promise<void> {
		await fs.ensureDir(path.dirname(linkPath))
		await fs.ensureSymlink(target, linkPath)
	}
}
