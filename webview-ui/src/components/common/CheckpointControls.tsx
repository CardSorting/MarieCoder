import { CheckpointRestoreRequest } from "@shared/proto/cline/checkpoints"
import { Int64Request } from "@shared/proto/cline/common"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useRef, useState } from "react"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { CheckpointsServiceClient } from "@/services/grpc-client"
import { useFocusManagement } from "@/utils/accessibility/focus_management"
import { debug } from "@/utils/debug_logger"
import { useClickAway } from "@/utils/hooks"

interface CheckpointOverlayProps {
	messageTs?: number
}

export const CheckpointOverlay = ({ messageTs }: CheckpointOverlayProps) => {
	const [compareDisabled, setCompareDisabled] = useState(false)
	const [restoreTaskDisabled, setRestoreTaskDisabled] = useState(false)
	const [restoreWorkspaceDisabled, setRestoreWorkspaceDisabled] = useState(false)
	const [restoreBothDisabled, setRestoreBothDisabled] = useState(false)
	const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
	const [hasMouseEntered, setHasMouseEntered] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const tooltipRef = useRef<HTMLDivElement>(null)
	const { onRelinquishControl } = useExtensionState()

	// Use focus management for restore confirmation
	const { restoreFocus } = useFocusManagement(showRestoreConfirm)

	const handleCloseConfirm = () => {
		setShowRestoreConfirm(false)
		setHasMouseEntered(false)
		restoreFocus()
	}

	useClickAway(containerRef, () => {
		if (showRestoreConfirm) {
			handleCloseConfirm()
		}
	})

	// Handle Escape key to close restore confirmation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && showRestoreConfirm) {
				handleCloseConfirm()
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [showRestoreConfirm])

	// Use the onRelinquishControl hook instead of message event
	useEffect(() => {
		return onRelinquishControl(() => {
			setCompareDisabled(false)
			setRestoreTaskDisabled(false)
			setRestoreWorkspaceDisabled(false)
			setRestoreBothDisabled(false)
			setShowRestoreConfirm(false)
		})
	}, [onRelinquishControl])

	const handleRestoreTask = async () => {
		setRestoreTaskDisabled(true)
		try {
			await CheckpointsServiceClient.checkpointRestore(
				CheckpointRestoreRequest.create({
					number: messageTs,
					restoreType: "task",
				}),
			)
		} catch (err) {
			debug.error("Checkpoint restore task error:", err)
			setRestoreTaskDisabled(false)
		}
	}

	const handleRestoreWorkspace = async () => {
		setRestoreWorkspaceDisabled(true)
		try {
			await CheckpointsServiceClient.checkpointRestore(
				CheckpointRestoreRequest.create({
					number: messageTs,
					restoreType: "workspace",
				}),
			)
		} catch (err) {
			debug.error("Checkpoint restore workspace error:", err)
			setRestoreWorkspaceDisabled(false)
		}
	}

	const handleRestoreBoth = async () => {
		setRestoreBothDisabled(true)
		try {
			await CheckpointsServiceClient.checkpointRestore(
				CheckpointRestoreRequest.create({
					number: messageTs,
					restoreType: "taskAndWorkspace",
				}),
			)
		} catch (err) {
			debug.error("Checkpoint restore both error:", err)
			setRestoreBothDisabled(false)
		}
	}

	const handleMouseEnter = () => {
		setHasMouseEntered(true)
	}

	const handleMouseLeave = () => {
		if (hasMouseEntered) {
			setShowRestoreConfirm(false)
			setHasMouseEntered(false)
		}
	}

	const handleControlsMouseLeave = (e: React.MouseEvent) => {
		const tooltipElement = tooltipRef.current

		if (tooltipElement && showRestoreConfirm) {
			const tooltipRect = tooltipElement.getBoundingClientRect()

			// If mouse is moving towards the tooltip, don't close it
			if (
				e.clientY >= tooltipRect.top &&
				e.clientY <= tooltipRect.bottom &&
				e.clientX >= tooltipRect.left &&
				e.clientX <= tooltipRect.right
			) {
				return
			}
		}

		setShowRestoreConfirm(false)
		setHasMouseEntered(false)
	}

	return (
		<CheckpointControls onMouseLeave={handleControlsMouseLeave}>
			<style>{`
				.checkpoint-controls > vscode-button,
				.checkpoint-controls > div > vscode-button {
					width: 24px;
					height: 24px;
					position: relative;
				}
				.checkpoint-controls > vscode-button i,
				.checkpoint-controls > div > vscode-button i {
					position: absolute;
					left: 50%;
					top: 50%;
					transform: translate(-50%, -50%);
				}
			`}</style>
			<VSCodeButton
				appearance="secondary"
				disabled={compareDisabled}
				onClick={async () => {
					setCompareDisabled(true)
					try {
						await CheckpointsServiceClient.checkpointDiff(
							Int64Request.create({
								value: messageTs,
							}),
						)
					} catch (err) {
						debug.error("CheckpointDiff error:", err)
					} finally {
						setCompareDisabled(false)
					}
				}}
				style={{ cursor: compareDisabled ? "wait" : "pointer" }}
				title="Compare">
				<i className="codicon codicon-diff-multiple" style={{ position: "absolute" }} />
			</VSCodeButton>
			<div ref={containerRef} style={{ position: "relative" }}>
				<VSCodeButton
					appearance="secondary"
					onClick={() => setShowRestoreConfirm(true)}
					style={{ cursor: "pointer" }}
					title="Restore">
					<i className="codicon codicon-discard" style={{ position: "absolute" }} />
				</VSCodeButton>
				{showRestoreConfirm && (
					<div
						className="restore-option-arrow absolute z-[1000] border border-[var(--vscode-editorGroup-border)] p-3 rounded-[3px] mt-2 min-w-0 max-w-full
							before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2
							after:content-[''] after:absolute after:-top-1.5 after:right-1.5 after:w-2.5 after:h-2.5 after:border-l after:border-t after:border-[var(--vscode-editorGroup-border)] after:rotate-45 after:z-[1]"
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
						ref={tooltipRef}
						style={{
							top: "calc(100% - 0.5px)",
							right: 0,
							background: CODE_BLOCK_BG_COLOR,
							width: "calc(100vw - 57px)",
						}}>
						<style>{`
							.restore-option-arrow::after {
								background: ${CODE_BLOCK_BG_COLOR};
							}
						`}</style>
						<div className="[&:not(:last-child)]:mb-2.5 [&:not(:last-child)]:pb-1 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[var(--vscode-editorGroup-border)]">
							<VSCodeButton
								disabled={restoreBothDisabled}
								onClick={handleRestoreBoth}
								style={{
									cursor: restoreBothDisabled ? "wait" : "pointer",
									width: "100%",
									marginBottom: "10px",
								}}>
								Restore Task and Workspace
							</VSCodeButton>
							<p className="m-0 mb-0.5 text-[var(--vscode-descriptionForeground)] text-[11px] leading-[14px]">
								Restores the task and your project's files back to a snapshot taken at this point
							</p>
						</div>
						<div className="[&:not(:last-child)]:mb-2.5 [&:not(:last-child)]:pb-1 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[var(--vscode-editorGroup-border)]">
							<VSCodeButton
								disabled={restoreTaskDisabled}
								onClick={handleRestoreTask}
								style={{
									cursor: restoreTaskDisabled ? "wait" : "pointer",
									width: "100%",
									marginBottom: "10px",
								}}>
								Restore Task Only
							</VSCodeButton>
							<p className="m-0 mb-0.5 text-[var(--vscode-descriptionForeground)] text-[11px] leading-[14px]">
								Deletes messages after this point (does not affect workspace)
							</p>
						</div>
						<div className="[&:not(:last-child)]:mb-2.5 [&:not(:last-child)]:pb-1 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[var(--vscode-editorGroup-border)]">
							<VSCodeButton
								disabled={restoreWorkspaceDisabled}
								onClick={handleRestoreWorkspace}
								style={{
									cursor: restoreWorkspaceDisabled ? "wait" : "pointer",
									width: "100%",
									marginBottom: "10px",
								}}>
								Restore Workspace Only
							</VSCodeButton>
							<p className="m-0 mb-0.5 text-[var(--vscode-descriptionForeground)] text-[11px] leading-[14px]">
								Restores your project's files to a snapshot taken at this point (task may become out of sync)
							</p>
						</div>
					</div>
				)}
			</div>
		</CheckpointControls>
	)
}

export const CheckpointControls: React.FC<{
	onMouseLeave?: (e: React.MouseEvent) => void
	children: React.ReactNode
}> = ({ onMouseLeave, children }) => {
	return (
		<div
			className="checkpoint-controls absolute top-[3px] right-1.5 flex gap-1.5 opacity-0 group-hover:opacity-100 bg-[var(--vscode-sideBar-background)] p-[3px_0_3px_3px]"
			onMouseLeave={onMouseLeave}>
			{children}
		</div>
	)
}
