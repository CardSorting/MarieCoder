import * as vscode from "vscode"

// Use theme-aware colors for gentler, less jarring decorations
const fadedOverlayDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: new vscode.ThemeColor("editor.findMatchBackground"),
	opacity: "0.25", // Reduced from 0.4 for subtler effect
	isWholeLine: true,
})

const activeLineDecorationType = vscode.window.createTextEditorDecorationType({
	backgroundColor: new vscode.ThemeColor("editor.wordHighlightBackground"),
	opacity: "0.7", // Reduced from 1.0 for gentler highlight
	isWholeLine: true,
	border: "1px solid",
	borderColor: new vscode.ThemeColor("editorInfo.border"),
	// Note: VSCode doesn't support CSS transitions in decorations,
	// but opacity changes will be smoother with the lower values
})

type DecorationType = "fadedOverlay" | "activeLine"

export class DecorationController {
	private decorationType: DecorationType
	private editor: vscode.TextEditor
	private ranges: vscode.Range[] = []

	constructor(decorationType: DecorationType, editor: vscode.TextEditor) {
		this.decorationType = decorationType
		this.editor = editor
	}

	getDecoration() {
		switch (this.decorationType) {
			case "fadedOverlay":
				return fadedOverlayDecorationType
			case "activeLine":
				return activeLineDecorationType
		}
	}

	addLines(startIndex: number, numLines: number) {
		// Guard against invalid inputs
		if (startIndex < 0 || numLines <= 0) {
			return
		}

		const lastRange = this.ranges[this.ranges.length - 1]
		if (lastRange && lastRange.end.line === startIndex - 1) {
			this.ranges[this.ranges.length - 1] = lastRange.with(undefined, lastRange.end.translate(numLines))
		} else {
			const endLine = startIndex + numLines - 1
			this.ranges.push(new vscode.Range(startIndex, 0, endLine, Number.MAX_SAFE_INTEGER))
		}

		this.editor.setDecorations(this.getDecoration(), this.ranges)
	}

	clear() {
		this.ranges = []
		this.editor.setDecorations(this.getDecoration(), this.ranges)
	}

	updateOverlayAfterLine(line: number, totalLines: number) {
		// Remove any existing ranges that start at or after the current line
		this.ranges = this.ranges.filter((range) => range.end.line < line)

		// Add a new range for all lines after the current line
		if (line < totalLines - 1) {
			this.ranges.push(
				new vscode.Range(new vscode.Position(line + 1, 0), new vscode.Position(totalLines - 1, Number.MAX_SAFE_INTEGER)),
			)
		}

		// Apply the updated decorations
		this.editor.setDecorations(this.getDecoration(), this.ranges)
	}

	setActiveLine(line: number) {
		this.ranges = [new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER)]
		this.editor.setDecorations(this.getDecoration(), this.ranges)
	}
}
