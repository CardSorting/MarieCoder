import { formatResponse } from "@core/prompts/response_formatters"
import { ensureRulesDirectoryExists, ensureWorkflowsDirectoryExists, GlobalFileNames } from "@core/storage/disk"
import { ClineRulesToggles } from "@shared/cline-rules"
import { fileExistsAtPath, isDirectory, readDirectory } from "@utils/fs"
import fs from "fs/promises"
import * as path from "path"
import { Controller } from "@/core/controller"

/**
 * Core rule loading logic - handles any rule type
 */
async function loadRulesFromPath(
	rulePath: string,
	toggles: ClineRulesToggles,
	allowedExtensions: string[] = [],
	excludePaths: string[][] = [],
): Promise<string[]> {
	const pathExists = await fileExistsAtPath(rulePath)
	if (!pathExists) {
		return []
	}

	const isDir = await isDirectory(rulePath)

	// Single file case
	if (!isDir) {
		if (toggles[rulePath] === false) {
			return []
		}
		const content = (await fs.readFile(rulePath, "utf8")).trim()
		return content ? [content] : []
	}

	// Directory case - read all files
	const files = await readDirectory(rulePath, excludePaths)
	const contents: string[] = []

	for (const file of files) {
		const filePath = path.resolve(rulePath, file)

		// Check extension filter
		if (allowedExtensions.length > 0) {
			const ext = path.extname(filePath)
			if (!allowedExtensions.includes(ext)) {
				continue
			}
		}

		// Check toggle
		if (toggles[filePath] === false) {
			continue
		}

		const content = (await fs.readFile(filePath, "utf8")).trim()
		if (content) {
			const relativePath = path.relative(rulePath, filePath)
			contents.push(`${relativePath}\n${content}`)
		}
	}

	return contents
}

/**
 * Synchronize toggles with filesystem
 */
async function syncToggles(
	rulePath: string,
	currentToggles: ClineRulesToggles,
	allowedExtensions: string[] = [],
	excludePaths: string[][] = [],
): Promise<ClineRulesToggles> {
	const updated: ClineRulesToggles = {}
	const pathExists = await fileExistsAtPath(rulePath)

	if (!pathExists) {
		return updated
	}

	const isDir = await isDirectory(rulePath)

	if (!isDir) {
		// Single file - keep only this toggle
		updated[rulePath] = currentToggles[rulePath] ?? true
		return updated
	}

	// Directory - sync all files
	const files = await readDirectory(rulePath, excludePaths)
	for (const file of files) {
		const filePath = path.resolve(rulePath, file)

		// Check extension filter
		if (allowedExtensions.length > 0) {
			const ext = path.extname(filePath)
			if (!allowedExtensions.includes(ext)) {
				continue
			}
		}

		updated[filePath] = currentToggles[filePath] ?? true
	}

	return updated
}

/**
 * Get global Cline rules
 */
export async function getGlobalClineRules(toggles: ClineRulesToggles): Promise<string | undefined> {
	try {
		const rulesPath = await ensureRulesDirectoryExists()
		const contents = await loadRulesFromPath(rulesPath, toggles)

		if (contents.length === 0) {
			return undefined
		}

		const combined = contents.join("\n\n")
		return formatResponse.clineRulesGlobalDirectoryInstructions(rulesPath, combined)
	} catch (error) {
		console.error("Failed to load global Cline rules", error)
		return undefined
	}
}

/**
 * Get local Cline rules
 */
export async function getLocalClineRules(cwd: string, toggles: ClineRulesToggles): Promise<string | undefined> {
	try {
		const rulesPath = path.resolve(cwd, GlobalFileNames.clineRules)
		const contents = await loadRulesFromPath(rulesPath, toggles, [], [[".clinerules", "workflows"]])

		if (contents.length === 0) {
			return undefined
		}

		const combined = contents.join("\n\n")
		const isDir = await isDirectory(rulesPath)

		return isDir
			? formatResponse.clineRulesLocalDirectoryInstructions(cwd, combined)
			: formatResponse.clineRulesLocalFileInstructions(cwd, combined)
	} catch (error) {
		console.error("Failed to load local Cline rules", error)
		return undefined
	}
}

/**
 * Get local Cursor rules (supports both .cursorrules file and .cursor/rules directory)
 */
export async function getLocalCursorRules(cwd: string, toggles: ClineRulesToggles): Promise<string[]> {
	const results: string[] = []

	// Check .cursorrules file
	try {
		const filePath = path.resolve(cwd, GlobalFileNames.cursorRulesFile)
		const contents = await loadRulesFromPath(filePath, toggles)
		if (contents.length > 0) {
			results.push(formatResponse.cursorRulesLocalFileInstructions(cwd, contents[0]))
		}
	} catch (error) {
		console.error("Failed to load .cursorrules file", error)
	}

	// Check .cursor/rules directory
	try {
		const dirPath = path.resolve(cwd, GlobalFileNames.cursorRulesDir)
		const contents = await loadRulesFromPath(dirPath, toggles, [".mdc"])
		if (contents.length > 0) {
			results.push(formatResponse.cursorRulesLocalDirectoryInstructions(cwd, contents.join("\n\n")))
		}
	} catch (error) {
		console.error("Failed to load .cursor/rules directory", error)
	}

	return results
}

/**
 * Get local Windsurf rules
 */
export async function getLocalWindsurfRules(cwd: string, toggles: ClineRulesToggles): Promise<string | undefined> {
	try {
		const rulesPath = path.resolve(cwd, GlobalFileNames.windsurfRules)
		const contents = await loadRulesFromPath(rulesPath, toggles)

		if (contents.length === 0) {
			return undefined
		}

		return formatResponse.windsurfRulesLocalFileInstructions(cwd, contents[0])
	} catch (error) {
		console.error("Failed to load Windsurf rules", error)
		return undefined
	}
}

/**
 * Get global workflows
 */
export async function getGlobalWorkflows(toggles: ClineRulesToggles): Promise<string | undefined> {
	try {
		const workflowsPath = await ensureWorkflowsDirectoryExists()
		const contents = await loadRulesFromPath(workflowsPath, toggles)

		if (contents.length === 0) {
			return undefined
		}

		return contents.join("\n\n")
	} catch (error) {
		console.error("Failed to load global workflows", error)
		return undefined
	}
}

/**
 * Get local workflows
 */
export async function getLocalWorkflows(cwd: string, toggles: ClineRulesToggles): Promise<string | undefined> {
	try {
		const workflowsPath = path.resolve(cwd, GlobalFileNames.workflows)
		const contents = await loadRulesFromPath(workflowsPath, toggles)

		if (contents.length === 0) {
			return undefined
		}

		return contents.join("\n\n")
	} catch (error) {
		console.error("Failed to load local workflows", error)
		return undefined
	}
}

/**
 * Refresh all toggles for a workspace
 */
export async function refreshAllToggles(
	controller: Controller,
	workingDirectory: string,
): Promise<{
	globalClineRules: ClineRulesToggles
	localClineRules: ClineRulesToggles
	globalWorkflows: ClineRulesToggles
	localWorkflows: ClineRulesToggles
	cursorRules: ClineRulesToggles
	windsurfRules: ClineRulesToggles
}> {
	// Global Cline rules
	const globalClineRulesPath = await ensureRulesDirectoryExists()
	const globalClineRulesOld = controller.stateManager.getGlobalSettingsKey("globalClineRulesToggles")
	const globalClineRules = await syncToggles(globalClineRulesPath, globalClineRulesOld)
	controller.stateManager.setGlobalState("globalClineRulesToggles", globalClineRules)

	// Local Cline rules
	const localClineRulesPath = path.resolve(workingDirectory, GlobalFileNames.clineRules)
	const localClineRulesOld = controller.stateManager.getWorkspaceStateKey("localClineRulesToggles")
	const localClineRules = await syncToggles(localClineRulesPath, localClineRulesOld, [], [[".clinerules", "workflows"]])
	controller.stateManager.setWorkspaceState("localClineRulesToggles", localClineRules)

	// Global workflows
	const globalWorkflowsPath = await ensureWorkflowsDirectoryExists()
	const globalWorkflowsOld = controller.stateManager.getGlobalSettingsKey("globalWorkflowToggles")
	const globalWorkflows = await syncToggles(globalWorkflowsPath, globalWorkflowsOld)
	controller.stateManager.setGlobalState("globalWorkflowToggles", globalWorkflows)

	// Local workflows
	const localWorkflowsPath = path.resolve(workingDirectory, GlobalFileNames.workflows)
	const localWorkflowsOld = controller.stateManager.getWorkspaceStateKey("workflowToggles")
	const localWorkflows = await syncToggles(localWorkflowsPath, localWorkflowsOld)
	controller.stateManager.setWorkspaceState("workflowToggles", localWorkflows)

	// Cursor rules (two locations)
	const cursorRulesOld = controller.stateManager.getWorkspaceStateKey("localCursorRulesToggles")
	const cursorFile = await syncToggles(path.resolve(workingDirectory, GlobalFileNames.cursorRulesFile), cursorRulesOld)
	const cursorDir = await syncToggles(path.resolve(workingDirectory, GlobalFileNames.cursorRulesDir), cursorRulesOld, [".mdc"])
	const cursorRules = { ...cursorFile, ...cursorDir }
	controller.stateManager.setWorkspaceState("localCursorRulesToggles", cursorRules)

	// Windsurf rules
	const windsurfRulesPath = path.resolve(workingDirectory, GlobalFileNames.windsurfRules)
	const windsurfRulesOld = controller.stateManager.getWorkspaceStateKey("localWindsurfRulesToggles")
	const windsurfRules = await syncToggles(windsurfRulesPath, windsurfRulesOld)
	controller.stateManager.setWorkspaceState("localWindsurfRulesToggles", windsurfRules)

	return {
		globalClineRules,
		localClineRules,
		globalWorkflows,
		localWorkflows,
		cursorRules,
		windsurfRules,
	}
}

/**
 * Create a rule file
 */
export async function createRuleFile(
	isGlobal: boolean,
	filename: string,
	cwd: string,
	type: string,
): Promise<{ filePath: string | null; fileExists: boolean }> {
	try {
		let filePath: string

		if (isGlobal) {
			const basePath = type === "workflow" ? await ensureWorkflowsDirectoryExists() : await ensureRulesDirectoryExists()
			filePath = path.join(basePath, filename)
		} else {
			const basePath =
				type === "workflow" ? path.resolve(cwd, GlobalFileNames.workflows) : path.resolve(cwd, GlobalFileNames.clineRules)

			await fs.mkdir(basePath, { recursive: true })
			filePath = path.join(basePath, filename)
		}

		const fileExists = await fileExistsAtPath(filePath)
		if (fileExists) {
			return { filePath, fileExists: true }
		}

		await fs.writeFile(filePath, "", "utf8")
		return { filePath, fileExists: false }
	} catch (error) {
		console.error("Failed to create rule file", error)
		return { filePath: null, fileExists: false }
	}
}

/**
 * Delete a rule file
 */
export async function deleteRuleFile(
	controller: Controller,
	rulePath: string,
	isGlobal: boolean,
	type: string,
): Promise<{ success: boolean; message: string }> {
	try {
		const fileExists = await fileExistsAtPath(rulePath)
		if (!fileExists) {
			return { success: false, message: `File does not exist: ${rulePath}` }
		}

		await fs.rm(rulePath, { force: true })

		// Update toggles based on type and scope
		if (isGlobal) {
			if (type === "workflow") {
				const toggles = controller.stateManager.getGlobalSettingsKey("globalWorkflowToggles")
				delete toggles[rulePath]
				controller.stateManager.setGlobalState("globalWorkflowToggles", toggles)
			} else {
				const toggles = controller.stateManager.getGlobalSettingsKey("globalClineRulesToggles")
				delete toggles[rulePath]
				controller.stateManager.setGlobalState("globalClineRulesToggles", toggles)
			}
		} else {
			if (type === "workflow") {
				const toggles = controller.stateManager.getWorkspaceStateKey("workflowToggles")
				delete toggles[rulePath]
				controller.stateManager.setWorkspaceState("workflowToggles", toggles)
			} else if (type === "cursor") {
				const toggles = controller.stateManager.getWorkspaceStateKey("localCursorRulesToggles")
				delete toggles[rulePath]
				controller.stateManager.setWorkspaceState("localCursorRulesToggles", toggles)
			} else if (type === "windsurf") {
				const toggles = controller.stateManager.getWorkspaceStateKey("localWindsurfRulesToggles")
				delete toggles[rulePath]
				controller.stateManager.setWorkspaceState("localWindsurfRulesToggles", toggles)
			} else {
				const toggles = controller.stateManager.getWorkspaceStateKey("localClineRulesToggles")
				delete toggles[rulePath]
				controller.stateManager.setWorkspaceState("localClineRulesToggles", toggles)
			}
		}

		const fileName = path.basename(rulePath)
		return { success: true, message: `File "${fileName}" deleted successfully` }
	} catch (error) {
		console.error("Failed to delete rule file", error)
		return { success: false, message: "Failed to delete file" }
	}
}
