import * as vscode from "vscode"

/**
 * Manages status bar display for streaming file operations
 *
 * Shows real-time indicators when Marie is editing files:
 * - "$(sync~spin) Marie is editing Button.tsx..."
 * - "$(check) Marie completed editing Button.tsx"
 *
 * Provides clear visual feedback in VSCode status bar about active operations.
 */
export class EditorStreamingStatus {
	private static instance: EditorStreamingStatus
	private statusBarItem: vscode.StatusBarItem
	private activeEdits: Map<string, { startTime: number; isComplete: boolean }>
	private updateInterval: NodeJS.Timeout | null = null

	private constructor() {
		// Create status bar item (left side, high priority)
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			100, // High priority to be visible
		)
		this.activeEdits = new Map()
	}

	static getInstance(): EditorStreamingStatus {
		if (!EditorStreamingStatus.instance) {
			EditorStreamingStatus.instance = new EditorStreamingStatus()
		}
		return EditorStreamingStatus.instance
	}

	/**
	 * Start tracking an edit operation
	 */
	startEdit(filePath: string): void {
		const fileName = this.getFileName(filePath)

		this.activeEdits.set(filePath, {
			startTime: Date.now(),
			isComplete: false,
		})

		this.updateStatusBar()
		this.startAutoUpdate()
	}

	/**
	 * Update progress for an ongoing edit
	 */
	updateEdit(filePath: string, progress?: number): void {
		const edit = this.activeEdits.get(filePath)
		if (edit && !edit.isComplete) {
			// Update tracked but keep status
			this.updateStatusBar()
		}
	}

	/**
	 * Mark edit as complete
	 */
	completeEdit(filePath: string): void {
		const edit = this.activeEdits.get(filePath)
		if (edit) {
			edit.isComplete = true
			this.updateStatusBar()

			// Remove from active edits after showing completion briefly
			setTimeout(() => {
				this.activeEdits.delete(filePath)
				this.updateStatusBar()
			}, 3000) // Show completion for 3 seconds
		}
	}

	/**
	 * Cancel/abort an edit
	 */
	cancelEdit(filePath: string): void {
		this.activeEdits.delete(filePath)
		this.updateStatusBar()
	}

	/**
	 * Clear all active edits
	 */
	clearAll(): void {
		this.activeEdits.clear()
		this.statusBarItem.hide()
		this.stopAutoUpdate()
	}

	/**
	 * Update status bar display based on current state
	 */
	private updateStatusBar(): void {
		const activeCount = Array.from(this.activeEdits.values()).filter((e) => !e.isComplete).length
		const completedCount = Array.from(this.activeEdits.values()).filter((e) => e.isComplete).length

		if (activeCount === 0 && completedCount === 0) {
			this.statusBarItem.hide()
			this.stopAutoUpdate()
			return
		}

		// Build status text
		let text = ""
		let tooltip = ""

		if (activeCount > 0) {
			// Active edits
			const activeFiles = Array.from(this.activeEdits.entries()).filter(([_, edit]) => !edit.isComplete)

			if (activeCount === 1) {
				const [filePath, edit] = activeFiles[0]
				const fileName = this.getFileName(filePath)
				const elapsed = this.formatElapsedTime(edit.startTime)
				text = `$(sync~spin) Marie is editing ${fileName}...`
				tooltip = `Editing for ${elapsed}`
			} else {
				text = `$(sync~spin) Marie is editing ${activeCount} files...`
				tooltip = activeFiles
					.map(([path, edit]) => {
						const fileName = this.getFileName(path)
						const elapsed = this.formatElapsedTime(edit.startTime)
						return `• ${fileName} (${elapsed})`
					})
					.join("\n")
			}
		} else if (completedCount > 0) {
			// Only completed edits (showing briefly)
			const completedFiles = Array.from(this.activeEdits.entries()).filter(([_, edit]) => edit.isComplete)

			if (completedCount === 1) {
				const fileName = this.getFileName(completedFiles[0][0])
				text = `$(check) Marie completed ${fileName}`
				tooltip = "Edit completed successfully"
			} else {
				text = `$(check) Marie completed ${completedCount} files`
				tooltip = completedFiles.map(([path]) => `• ${this.getFileName(path)}`).join("\n")
			}
		}

		this.statusBarItem.text = text
		this.statusBarItem.tooltip = tooltip
		this.statusBarItem.show()
	}

	/**
	 * Start auto-updating status bar (for elapsed time)
	 */
	private startAutoUpdate(): void {
		if (this.updateInterval) return

		// Update every second to show elapsed time
		this.updateInterval = setInterval(() => {
			this.updateStatusBar()
		}, 1000)
	}

	/**
	 * Stop auto-updating
	 */
	private stopAutoUpdate(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval)
			this.updateInterval = null
		}
	}

	/**
	 * Extract filename from path
	 */
	private getFileName(filePath: string): string {
		const parts = filePath.split(/[/\\]/)
		return parts[parts.length - 1] || filePath
	}

	/**
	 * Format elapsed time nicely
	 */
	private formatElapsedTime(startTime: number): string {
		const elapsed = Date.now() - startTime
		const seconds = Math.floor(elapsed / 1000)

		if (seconds < 60) {
			return `${seconds}s`
		}
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}m ${remainingSeconds}s`
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.stopAutoUpdate()
		this.statusBarItem.dispose()
	}
}

// Export singleton instance getter
export const getEditorStreamingStatus = () => EditorStreamingStatus.getInstance()
