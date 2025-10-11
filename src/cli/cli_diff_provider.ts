/**
 * CLI Diff View Provider
 * Shows diffs in terminal output
 */

import { HostProvider } from "@/hosts/host-provider"
import { DiffViewProvider } from "@/integrations/editor/DiffViewProvider"

export class CliDiffViewProvider extends DiffViewProvider {
	private activeDiffEditorId: string | undefined

	override async openDiffEditor(): Promise<void> {
		if (!this.absolutePath) {
			return
		}

		const response = await HostProvider.diff.openDiff({
			path: this.absolutePath,
			content: this.originalContent ?? "",
		})

		this.activeDiffEditorId = response.diffId
	}

	override async replaceText(
		content: string,
		rangeToReplace: { startLine: number; endLine: number },
		_currentLine: number | undefined,
	): Promise<void> {
		if (!this.activeDiffEditorId) {
			return
		}

		await HostProvider.diff.replaceText({
			diffId: this.activeDiffEditorId,
			content: content,
			startLine: rangeToReplace.startLine,
			endLine: rangeToReplace.endLine,
		})
	}

	protected override async truncateDocument(lineNumber: number): Promise<void> {
		if (!this.activeDiffEditorId) {
			return
		}

		await HostProvider.diff.truncateDocument({
			diffId: this.activeDiffEditorId,
			endLine: lineNumber,
		})
	}

	protected async saveDocument(): Promise<Boolean> {
		if (!this.activeDiffEditorId) {
			return false
		}

		try {
			await HostProvider.diff.saveDocument({ diffId: this.activeDiffEditorId })
			return true
		} catch (err: any) {
			console.error("Failed to save document:", err)
			return false
		}
	}

	protected override async scrollEditorToLine(_line: number): Promise<void> {
		// No-op for CLI
	}

	override async scrollAnimation(_startLine: number, _endLine: number): Promise<void> {
		// No-op for CLI
	}

	protected override async getDocumentText(): Promise<string | undefined> {
		if (!this.activeDiffEditorId) {
			return undefined
		}

		try {
			const response = await HostProvider.diff.getDocumentText({ diffId: this.activeDiffEditorId })
			return response.content
		} catch (err) {
			console.error("Error getting document text:", err)
			return undefined
		}
	}

	protected override async closeAllDiffViews(): Promise<void> {
		await HostProvider.diff.closeAllDiffs({})
		this.activeDiffEditorId = undefined
	}

	protected override async resetDiffView(): Promise<void> {
		this.activeDiffEditorId = undefined
	}
}
