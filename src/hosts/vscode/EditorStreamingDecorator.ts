import * as vscode from "vscode"

/**
 * Creates decoration type for streaming indicator with gentler visuals
 */
const streamingDecorationType = vscode.window.createTextEditorDecorationType({
	// Subtle border - lighter for less distraction
	border: "1px solid",
	borderColor: new vscode.ThemeColor("editorInfo.border"),

	// Very subtle background tint
	backgroundColor: new vscode.ThemeColor("editor.wordHighlightBackground"),
	opacity: "0.5", // Reduced for gentler effect

	// Applies to entire range
	isWholeLine: false,

	// Gutter decoration with slower, smoother animation
	gutterIconPath: vscode.Uri.parse(
		"data:image/svg+xml," +
			encodeURIComponent(`
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
					<circle cx="8" cy="8" r="4" fill="#4EC9B0" opacity="0.8">
						<animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite"/>
					</circle>
				</svg>
`),
	),
	gutterIconSize: "contain",
})

/**
 * Adds visual indicators to editor tabs during AI streaming
 *
 * Provides subtle animations and styling to tabs being edited by Marie:
 * - Subtle glow effect
 * - Animated border
 * - "AI Editing" badge (via decorations)
 *
 * Helps users identify which tabs are actively being modified.
 *
 * VSCode-specific implementation using VSCode decoration APIs.
 */
export class EditorStreamingDecorator {
	private static instance: EditorStreamingDecorator
	private activeDecorations: Map<string, vscode.TextEditor>
	private lastUpdateTime: Map<string, number>
	private readonly throttleMs = 16 // ~60fps for smooth, non-jarring updates

	private constructor() {
		this.activeDecorations = new Map()
		this.lastUpdateTime = new Map()
	}

	static getInstance(): EditorStreamingDecorator {
		if (!EditorStreamingDecorator.instance) {
			EditorStreamingDecorator.instance = new EditorStreamingDecorator()
		}
		return EditorStreamingDecorator.instance
	}

	/**
	 * Start decorating an editor tab
	 */
	startDecorating(editor: vscode.TextEditor): void {
		const filePath = editor.document.uri.fsPath

		// Store editor reference
		this.activeDecorations.set(filePath, editor)

		// Apply decorations to first few lines (visual indicator)
		const range = new vscode.Range(0, 0, Math.min(5, editor.document.lineCount), 0)
		editor.setDecorations(streamingDecorationType, [range])
	}

	/**
	 * Stop decorating an editor tab
	 */
	stopDecorating(filePath: string): void {
		const editor = this.activeDecorations.get(filePath)
		if (editor) {
			// Clear decorations
			editor.setDecorations(streamingDecorationType, [])
			this.activeDecorations.delete(filePath)
			this.lastUpdateTime.delete(filePath)
		}
	}

	/**
	 * Update decorations (called during streaming) - throttled to frame rate for smoothness
	 */
	updateDecorations(editor: vscode.TextEditor, currentLine: number): void {
		const filePath = editor.document.uri.fsPath
		const now = Date.now()
		const lastUpdate = this.lastUpdateTime.get(filePath) ?? 0

		// Throttle updates to ~60fps to prevent jarring, rapid decoration changes
		if (now - lastUpdate < this.throttleMs) {
			return
		}

		this.lastUpdateTime.set(filePath, now)

		// Decorate currently active line with glow
		if (currentLine >= 0 && currentLine < editor.document.lineCount) {
			const range = new vscode.Range(currentLine, 0, currentLine, Number.MAX_SAFE_INTEGER)
			editor.setDecorations(streamingDecorationType, [range])
		}
	}

	/**
	 * Clear all decorations
	 */
	clearAll(): void {
		for (const editor of this.activeDecorations.values()) {
			editor.setDecorations(streamingDecorationType, [])
		}
		this.activeDecorations.clear()
		this.lastUpdateTime.clear()
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.clearAll()
		streamingDecorationType.dispose()
	}
}

export const getEditorStreamingDecorator = () => EditorStreamingDecorator.getInstance()
