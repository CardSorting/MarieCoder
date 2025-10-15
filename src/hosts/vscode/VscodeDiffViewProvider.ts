import { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import * as path from "path"
import * as vscode from "vscode"
import { DecorationController } from "@/hosts/vscode/DecorationController"
import { getEditorStreamingDecorator } from "@/hosts/vscode/EditorStreamingDecorator"
import { arePathsEqual } from "@/utils/path"

export const DIFF_VIEW_URI_SCHEME = "cline-diff"

export class VscodeDiffViewProvider extends DiffViewProvider {
	private activeDiffEditor?: vscode.TextEditor

	private fadedOverlayController?: DecorationController
	private activeLineController?: DecorationController
	private isOpeningEditor = false // Track editor opening state to prevent race conditions

	override async openDiffEditor(): Promise<void> {
		if (!this.absolutePath) {
			throw new Error("No file path set")
		}

		// Prevent concurrent editor opening attempts
		if (this.isOpeningEditor) {
			console.warn("[VscodeDiffViewProvider] Editor opening already in progress, waiting...")
			await this.waitForEditorToOpen()
			return
		}

		this.isOpeningEditor = true
		try {
			await this.openDiffEditorWithRetry()
		} finally {
			this.isOpeningEditor = false
		}
	}

	/**
	 * Waits for the current editor opening operation to complete
	 */
	private async waitForEditorToOpen(maxWait: number = 5000): Promise<void> {
		const startTime = Date.now()
		while (this.isOpeningEditor && Date.now() - startTime < maxWait) {
			await new Promise((resolve) => setTimeout(resolve, 100))
		}
	}

	/**
	 * Opens diff editor with retry logic for improved fault tolerance
	 */
	private async openDiffEditorWithRetry(maxRetries: number = 2): Promise<void> {
		let lastError: Error | undefined

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				await this.performDiffEditorOpen()
				return // Success!
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error))
				console.warn(`[VscodeDiffViewProvider] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}`)

				// Don't retry on the last attempt
				if (attempt < maxRetries - 1) {
					// Exponential backoff: wait 500ms, then 1000ms
					const backoffMs = 500 * (attempt + 1)
					console.log(`[VscodeDiffViewProvider] Retrying in ${backoffMs}ms...`)
					await new Promise((resolve) => setTimeout(resolve, backoffMs))
				}
			}
		}

		// All retries failed
		throw new Error(`Failed to open diff editor after ${maxRetries} attempts. Last error: ${lastError?.message}`)
	}

	/**
	 * Performs the actual diff editor opening logic
	 */
	private async performDiffEditorOpen(): Promise<void> {
		if (!this.absolutePath) {
			throw new Error("No file path set")
		}

		// if the file was already open, close it (must happen after showing the diff view since if it's the only tab the column will close)
		this.documentWasOpen = false
		// close the tab if it's open (it's already been saved)
		const tabs = vscode.window.tabGroups.all
			.flatMap((tg) => tg.tabs)
			.filter((tab) => tab.input instanceof vscode.TabInputText && arePathsEqual(tab.input.uri.fsPath, this.absolutePath))
		for (const tab of tabs) {
			if (!tab.isDirty) {
				try {
					await vscode.window.tabGroups.close(tab)
				} catch (error) {
					console.warn("Tab close retry failed:", error.message)
				}
			}
			this.documentWasOpen = true
		}

		const uri = vscode.Uri.file(this.absolutePath)
		// If this diff editor is already open (ie if a previous write file was interrupted) then we should activate that instead of opening a new diff
		const diffTab = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.find(
				(tab) =>
					tab.input instanceof vscode.TabInputTextDiff &&
					tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME &&
					arePathsEqual(tab.input.modified.fsPath, uri.fsPath),
			)

		if (diffTab && diffTab.input instanceof vscode.TabInputTextDiff) {
			// Use already open diff editor.
			this.activeDiffEditor = await vscode.window.showTextDocument(diffTab.input.modified, {
				preserveFocus: !this.autoFocusEditor, // Focus if autoFocus is enabled
			})
		} else {
			// Open new diff editor.
			this.activeDiffEditor = await new Promise<vscode.TextEditor>((resolve, reject) => {
				const fileName = path.basename(uri.fsPath)
				const fileExists = this.editType === "modify"
				const disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
					if (editor && arePathsEqual(editor.document.uri.fsPath, uri.fsPath)) {
						disposable.dispose()
						resolve(editor)
					}
				})
				vscode.commands.executeCommand(
					"vscode.diff",
					vscode.Uri.from({
						scheme: DIFF_VIEW_URI_SCHEME,
						path: fileName,
						query: Buffer.from(this.originalContent ?? "").toString("base64"),
					}),
					uri,
					`${fileName}: ${fileExists ? "Original ↔ Cline's Changes" : "New File"} (Editable)`,
					{
						preserveFocus: !this.autoFocusEditor, // Focus if autoFocus is enabled
					},
				)
				// This may happen on very slow machines ie project idx
				// Increased timeout to 15 seconds to accommodate slower file systems
				setTimeout(() => {
					disposable.dispose()
					reject(
						new Error(
							"Failed to open diff editor within 15 seconds. The file may not be ready or VSCode is experiencing issues. Please try again.",
						),
					)
				}, 15_000)
			})
		}

		this.fadedOverlayController = new DecorationController("fadedOverlay", this.activeDiffEditor)
		this.activeLineController = new DecorationController("activeLine", this.activeDiffEditor)
		// Apply faded overlay to all lines initially
		this.fadedOverlayController.addLines(0, this.activeDiffEditor.document.lineCount)

		// Start tab decoration for streaming indicator
		if (this.autoFocusEditor) {
			getEditorStreamingDecorator().startDecorating(this.activeDiffEditor)
		}
	}

	override async replaceText(
		content: string,
		rangeToReplace: { startLine: number; endLine: number },
		currentLine: number | undefined,
	): Promise<void> {
		if (!this.activeDiffEditor || !this.activeDiffEditor.document) {
			throw new Error("User closed text editor, unable to edit file...")
		}
		// Place cursor at the beginning of the diff editor to keep it out of the way of the stream animation
		const beginningOfDocument = new vscode.Position(0, 0)
		this.activeDiffEditor.selection = new vscode.Selection(beginningOfDocument, beginningOfDocument)

		// Replace the text in the diff editor document.
		const document = this.activeDiffEditor?.document
		const edit = new vscode.WorkspaceEdit()
		const range = new vscode.Range(rangeToReplace.startLine, 0, rangeToReplace.endLine, 0)
		edit.replace(document.uri, range, content)
		await vscode.workspace.applyEdit(edit)

		if (currentLine !== undefined) {
			// Update decorations for the entire changed section
			this.activeLineController?.setActiveLine(currentLine)
			this.fadedOverlayController?.updateOverlayAfterLine(currentLine, document.lineCount)

			// Update tab decorator to show current streaming line
			if (this.autoFocusEditor && this.activeDiffEditor) {
				getEditorStreamingDecorator().updateDecorations(this.activeDiffEditor, currentLine)
			}
		}
	}

	override async scrollEditorToLine(line: number): Promise<void> {
		if (!this.activeDiffEditor) {
			return
		}
		const scrollLine = line + 4
		// Conditional reveal - only scroll if line isn't visible
		// Prevents unnecessary, jarring scroll movements
		this.activeDiffEditor.revealRange(
			new vscode.Range(scrollLine, 0, scrollLine, 0),
			vscode.TextEditorRevealType.InCenterIfOutsideViewport,
		)
	}

	override async scrollAnimation(startLine: number, endLine: number): Promise<void> {
		if (!this.activeDiffEditor) {
			return
		}

		const totalLines = endLine - startLine
		// Optimized duration for natural, comfortable perception
		// Slower for longer distances, faster for short jumps
		const duration = Math.min(700, Math.max(250, totalLines * 5)) // Further optimized for smoothness
		const startTime = performance.now()

		// Natural ease-in-out-sine for buttery smooth, organic motion
		// Mimics natural human eye tracking patterns
		const easeInOutSine = (t: number): number => {
			return -(Math.cos(Math.PI * t) - 1) / 2
		}

		// Track last revealed line to avoid redundant, jarring reveal calls
		let lastRevealedLine = -1

		// Silky smooth animation using requestAnimationFrame
		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime
			const progress = Math.min(elapsed / duration, 1)

			// Apply natural, human-perceived easing curve
			const eased = easeInOutSine(progress)

			const currentLine = Math.floor(startLine + totalLines * eased)

			// Only reveal when line actually changes - prevents micro-jank
			if (currentLine !== lastRevealedLine) {
				lastRevealedLine = currentLine
				this.activeDiffEditor?.revealRange(
					new vscode.Range(currentLine, 0, currentLine, 0),
					vscode.TextEditorRevealType.InCenterIfOutsideViewport,
				)
			}

			if (progress < 1) {
				requestAnimationFrame(animate)
			}
		}

		// Start silky smooth animation
		requestAnimationFrame(animate)

		// Wait for animation to complete naturally
		await new Promise((resolve) => setTimeout(resolve, duration))
	}

	override async truncateDocument(lineNumber: number): Promise<void> {
		if (!this.activeDiffEditor) {
			return
		}
		const document = this.activeDiffEditor.document
		if (lineNumber < document.lineCount) {
			const edit = new vscode.WorkspaceEdit()
			edit.delete(document.uri, new vscode.Range(lineNumber, 0, document.lineCount, 0))
			await vscode.workspace.applyEdit(edit)
		}
		// Clear all decorations at the end (before applying final edit)
		this.fadedOverlayController?.clear()
		this.activeLineController?.clear()
	}

	protected override async getDocumentText(): Promise<string | undefined> {
		if (!this.activeDiffEditor || !this.activeDiffEditor.document) {
			return undefined
		}
		return this.activeDiffEditor.document.getText()
	}

	protected override async saveDocument(): Promise<Boolean> {
		if (!this.activeDiffEditor) {
			return false
		}
		if (!this.activeDiffEditor.document.isDirty) {
			return false
		}
		await this.activeDiffEditor.document.save()
		return true
	}

	protected async closeAllDiffViews(): Promise<void> {
		// Close all the cline diff views.
		const tabs = vscode.window.tabGroups.all
			.flatMap((tg) => tg.tabs)
			.filter((tab) => tab.input instanceof vscode.TabInputTextDiff && tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME)
		for (const tab of tabs) {
			// trying to close dirty views results in save popup
			if (!tab.isDirty) {
				try {
					await vscode.window.tabGroups.close(tab)
				} catch (error) {
					console.warn("Tab close retry failed:", error.message)
				}
			}
		}
	}

	protected override async resetDiffView(): Promise<void> {
		// Clear tab decorations
		if (this.absolutePath) {
			getEditorStreamingDecorator().stopDecorating(this.absolutePath)
		}

		this.activeDiffEditor = undefined
		this.fadedOverlayController = undefined
		this.activeLineController = undefined
	}
}
