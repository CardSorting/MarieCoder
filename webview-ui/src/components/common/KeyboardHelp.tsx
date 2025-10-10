import { useEffect, useState } from "react"
import { X } from "@/components/icons"

/**
 * Keyboard help overlay showing all available keyboard shortcuts
 * Toggled with `?` key
 *
 * @example
 * ```tsx
 * <KeyboardHelp />
 * ```
 */

interface ShortcutGroup {
	title: string
	shortcuts: Array<{
		keys: string[]
		description: string
	}>
}

const KEYBOARD_SHORTCUTS: ShortcutGroup[] = [
	{
		title: "Navigation",
		shortcuts: [
			{ keys: ["Tab"], description: "Navigate to next interactive element" },
			{ keys: ["Shift", "Tab"], description: "Navigate to previous element" },
			{ keys: ["Esc"], description: "Close modal or clear input" },
			{ keys: ["Cmd/Ctrl", "Shift", "H"], description: "Open history view" },
			{ keys: ["Cmd/Ctrl", ","], description: "Open settings" },
		],
	},
	{
		title: "Chat & Input",
		shortcuts: [
			{ keys: ["Cmd/Ctrl", "Enter"], description: "Send message" },
			{ keys: ["Enter"], description: "New line in message (when composing)" },
			{ keys: ["Esc"], description: "Clear input or cancel" },
		],
	},
	{
		title: "Modals & Dialogs",
		shortcuts: [
			{ keys: ["Esc"], description: "Close current modal" },
			{ keys: ["Enter"], description: "Confirm action (in modal)" },
			{ keys: ["Tab"], description: "Navigate within modal" },
		],
	},
	{
		title: "Help",
		shortcuts: [{ keys: ["?"], description: "Show/hide this help dialog" }],
	},
]

export function KeyboardHelp() {
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Toggle help with '?' key (Shift + /)
			if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
				// Don't trigger if user is typing in an input
				const target = e.target as HTMLElement
				if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
					return
				}

				e.preventDefault()
				setIsVisible((prev) => !prev)
			}

			// Close help with Escape
			if (e.key === "Escape" && isVisible) {
				e.preventDefault()
				setIsVisible(false)
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [isVisible])

	if (!isVisible) {
		return null
	}

	return (
		<>
			{/* Backdrop */}
			<div
				aria-hidden="true"
				className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
				onClick={() => setIsVisible(false)}
			/>

			{/* Modal */}
			<div
				aria-labelledby="keyboard-help-title"
				aria-modal="true"
				className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
				role="dialog">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-[var(--vscode-panel-border)]">
					<h2 className="text-lg font-semibold text-[var(--vscode-foreground)]" id="keyboard-help-title">
						Keyboard Shortcuts
					</h2>
					<button
						aria-label="Close keyboard help"
						className="p-1 rounded hover:bg-[var(--vscode-list-hoverBackground)] text-[var(--vscode-foreground)]"
						onClick={() => setIsVisible(false)}
						type="button">
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
					<div className="space-y-6">
						{KEYBOARD_SHORTCUTS.map((group) => (
							<div key={group.title}>
								<h3 className="text-sm font-semibold text-[var(--vscode-foreground)] mb-3 uppercase tracking-wide">
									{group.title}
								</h3>
								<div className="space-y-2">
									{group.shortcuts.map((shortcut, index) => (
										<div
											className="flex items-center justify-between py-2 px-3 rounded hover:bg-[var(--vscode-list-hoverBackground)]"
											key={index}>
											<span className="text-sm text-[var(--vscode-descriptionForeground)]">
												{shortcut.description}
											</span>
											<div className="flex items-center gap-1">
												{shortcut.keys.map((key, keyIndex) => (
													<div className="flex items-center gap-1" key={keyIndex}>
														<kbd className="px-2 py-1 text-xs font-semibold text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded shadow-sm">
															{key}
														</kbd>
														{keyIndex < shortcut.keys.length - 1 && (
															<span className="text-xs text-[var(--vscode-descriptionForeground)]">
																+
															</span>
														)}
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						))}
					</div>

					{/* Footer hint */}
					<div className="mt-6 pt-4 border-t border-[var(--vscode-panel-border)] text-center">
						<p className="text-xs text-[var(--vscode-descriptionForeground)]">
							Press{" "}
							<kbd className="px-1.5 py-0.5 text-xs font-semibold bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded">
								?
							</kbd>{" "}
							or{" "}
							<kbd className="px-1.5 py-0.5 text-xs font-semibold bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded">
								Esc
							</kbd>{" "}
							to close
						</p>
					</div>
				</div>
			</div>
		</>
	)
}
