import { CheckpointRestoreRequest } from "@shared/proto/cline/checkpoints"
import { Int64Request } from "@shared/proto/cline/common"
import { ClineCheckpointRestore } from "@shared/WebviewMessage"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { CheckpointsServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { calculatePosition, type Placement } from "@/utils/floating_position"

interface CheckmarkControlProps {
	messageTs?: number
	isCheckpointCheckedOut?: boolean
}

export const CheckmarkControl = ({ messageTs, isCheckpointCheckedOut }: CheckmarkControlProps) => {
	const [compareDisabled, setCompareDisabled] = useState(false)
	const [restoreTaskDisabled, setRestoreTaskDisabled] = useState(false)
	const [restoreWorkspaceDisabled, setRestoreWorkspaceDisabled] = useState(false)
	const [restoreBothDisabled, setRestoreBothDisabled] = useState(false)
	const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
	const [floatingPosition, setFloatingPosition] = useState<{ x: number; y: number; placement: Placement }>({
		x: 0,
		y: 0,
		placement: "bottom-end",
	})
	const referenceRef = useRef<HTMLDivElement>(null)
	const floatingRef = useRef<HTMLDivElement>(null)
	const { onRelinquishControl } = useExtensionState()

	// Debounce
	const closeMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const scheduleCloseRestore = useCallback(() => {
		if (closeMenuTimeoutRef.current) {
			clearTimeout(closeMenuTimeoutRef.current)
		}
		closeMenuTimeoutRef.current = setTimeout(() => {
			setShowRestoreConfirm(false)
		}, 350)
	}, [])

	const cancelCloseRestore = useCallback(() => {
		if (closeMenuTimeoutRef.current) {
			clearTimeout(closeMenuTimeoutRef.current)
			closeMenuTimeoutRef.current = null
		}
	}, [])

	// Debounce cleanup
	useEffect(() => {
		return () => {
			if (closeMenuTimeoutRef.current) {
				clearTimeout(closeMenuTimeoutRef.current)
				closeMenuTimeoutRef.current = null
			}
		}
	}, [showRestoreConfirm])

	// Clear "Restore Files" button when checkpoint is no longer checked out
	useEffect(() => {
		if (!isCheckpointCheckedOut && restoreWorkspaceDisabled) {
			setRestoreWorkspaceDisabled(false)
		}
	}, [isCheckpointCheckedOut, restoreWorkspaceDisabled])

	// Update floating position
	const updatePosition = useCallback(() => {
		if (referenceRef.current && floatingRef.current) {
			const position = calculatePosition(referenceRef.current, floatingRef.current, {
				placement: "bottom-end",
				offset: { mainAxis: 8, crossAxis: 10 },
				flip: true,
				shift: true,
				padding: 8,
			})
			setFloatingPosition(position)
		}
	}, [])

	useEffect(() => {
		if (showRestoreConfirm) {
			updatePosition()
			const handleScroll = () => updatePosition()
			window.addEventListener("scroll", handleScroll, true)
			return () => window.removeEventListener("scroll", handleScroll, true)
		}
	}, [showRestoreConfirm, updatePosition])

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
			const restoreType: ClineCheckpointRestore = "task"
			await CheckpointsServiceClient.checkpointRestore(
				CheckpointRestoreRequest.create({
					number: messageTs,
					restoreType,
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
			const restoreType: ClineCheckpointRestore = "workspace"
			await CheckpointsServiceClient.checkpointRestore(
				CheckpointRestoreRequest.create({
					number: messageTs,
					restoreType,
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
			const restoreType: ClineCheckpointRestore = "taskAndWorkspace"
			await CheckpointsServiceClient.checkpointRestore(
				CheckpointRestoreRequest.create({
					number: messageTs,
					restoreType,
				}),
			)
		} catch (err) {
			debug.error("Checkpoint restore both error:", err)
			setRestoreBothDisabled(false)
		}
	}

	const handleMouseEnter = () => {
		cancelCloseRestore()
	}

	const handleMouseLeave = () => {
		scheduleCloseRestore()
	}

	const handleControlsMouseEnter = () => {
		cancelCloseRestore()
	}

	const handleControlsMouseLeave = () => {
		scheduleCloseRestore()
	}

	// Helper function to create dotted line gradient
	const getDottedLineStyle = (isCheckedOut?: boolean, small?: boolean) => {
		const color = isCheckedOut ? "var(--vscode-textLink-foreground)" : "var(--vscode-descriptionForeground)"
		return {
			flex: small ? "0 0 5px" : "1",
			minWidth: "5px",
			height: "1px",
			backgroundImage: `linear-gradient(to right, ${color} 50%, transparent 50%)`,
			backgroundSize: "4px 1px",
			backgroundRepeat: "repeat-x",
		}
	}

	// Helper function for custom button styling
	const getCustomButtonStyle = (isCheckedOut?: boolean, isActive?: boolean, disabled?: boolean): React.CSSProperties => {
		const color = isCheckedOut ? "var(--vscode-textLink-foreground)" : "var(--vscode-descriptionForeground)"
		const bg = isActive || disabled ? color : "transparent"
		const textColor = isActive || disabled ? "var(--vscode-editor-background)" : color

		return {
			background: bg,
			color: textColor,
			padding: "2px 6px",
			fontSize: "9px",
			position: "relative",
			border: "none",
		}
	}

	// Helper function for custom button border (::before pseudo-element)
	const getCustomButtonBorder = (isCheckedOut?: boolean, isActive?: boolean, disabled?: boolean): React.CSSProperties => {
		if (isActive || disabled) {
			return { display: "none" }
		}

		const color = isCheckedOut ? "var(--vscode-textLink-foreground)" : "var(--vscode-descriptionForeground)"
		return {
			content: '""',
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			borderRadius: "1px",
			backgroundImage: `linear-gradient(to right, ${color} 50%, transparent 50%), linear-gradient(to bottom, ${color} 50%, transparent 50%), linear-gradient(to right, ${color} 50%, transparent 50%), linear-gradient(to bottom, ${color} 50%, transparent 50%)`,
			backgroundSize: "4px 1px, 1px 4px, 4px 1px, 1px 4px",
			backgroundRepeat: "repeat-x, repeat-y, repeat-x, repeat-y",
			backgroundPosition: "0 0, 100% 0, 0 100%, 0 0",
		}
	}

	const containerOpacity = isCheckpointCheckedOut ? 1 : showRestoreConfirm ? 1 : 0.5
	const linkColor = isCheckpointCheckedOut ? "var(--vscode-textLink-foreground)" : "var(--vscode-descriptionForeground)"

	return (
		<div
			className="group flex items-center py-1 gap-1 relative min-w-0 min-h-[17px] -my-[10px] hover:opacity-100"
			onMouseEnter={handleControlsMouseEnter}
			onMouseLeave={handleControlsMouseLeave}
			style={{ opacity: containerOpacity }}>
			<i
				className="codicon codicon-bookmark text-xs shrink-0"
				style={{
					color: linkColor,
				}}
			/>
			<div
				className="flex-1"
				style={{
					display: showRestoreConfirm ? "none" : "flex",
					...getDottedLineStyle(isCheckpointCheckedOut),
				}}
			/>
			<div
				className="items-center gap-1 flex-1 group-hover:flex"
				style={{
					display: showRestoreConfirm ? "flex" : "none",
				}}>
				<span className="text-[9px] shrink-0" style={{ color: linkColor }}>
					{isCheckpointCheckedOut ? "Checkpoint (restored)" : "Checkpoint"}
				</span>
				<div style={getDottedLineStyle(isCheckpointCheckedOut)} />
				<div className="flex items-center gap-1 shrink-0">
					<button
						className="cursor-pointer relative hover:enabled:text-[var(--vscode-editor-background)] disabled:opacity-50 disabled:cursor-not-allowed"
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
						style={{
							...getCustomButtonStyle(isCheckpointCheckedOut, false, compareDisabled),
							cursor: compareDisabled ? "wait" : "pointer",
						}}>
						<span
							className="absolute inset-0 rounded-[1px] group-hover:hidden"
							style={getCustomButtonBorder(isCheckpointCheckedOut, false, compareDisabled)}
						/>
						<span
							className="relative"
							style={{
								...(compareDisabled
									? {}
									: {
											background: "transparent",
										}),
							}}>
							Compare
						</span>
					</button>
					<div style={getDottedLineStyle(isCheckpointCheckedOut, true)} />
					<div className="relative -mt-0.5" ref={referenceRef}>
						<button
							className="cursor-pointer relative hover:enabled:text-[var(--vscode-editor-background)] disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => setShowRestoreConfirm(true)}
							style={getCustomButtonStyle(isCheckpointCheckedOut, showRestoreConfirm, false)}>
							<span
								className="absolute inset-0 rounded-[1px] group-hover:hidden"
								style={getCustomButtonBorder(isCheckpointCheckedOut, showRestoreConfirm, false)}
							/>
							<span className="relative">Restore</span>
						</button>
						{showRestoreConfirm &&
							createPortal(
								<>
									<style>{`
										.restore-tooltip::after {
											background: ${CODE_BLOCK_BG_COLOR};
										}
									`}</style>
									<div
										className="restore-tooltip fixed p-3 rounded-sm z-[1000] border border-[var(--vscode-editorGroup-border)]
											before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2
											after:content-[''] after:absolute after:-top-1.5 after:right-6 after:w-2.5 after:h-2.5 
											after:border-l after:border-t after:border-[var(--vscode-editorGroup-border)] after:rotate-45 after:z-[1]
											[&[data-placement^='top']]:before:top-auto [&[data-placement^='top']]:before:-bottom-2
											[&[data-placement^='top']]:after:top-auto [&[data-placement^='top']]:after:-bottom-1.5
											[&[data-placement^='top']]:after:rotate-[225deg]"
										data-placement={floatingPosition.placement}
										onMouseEnter={handleMouseEnter}
										onMouseLeave={handleMouseLeave}
										ref={floatingRef}
										style={{
											position: "fixed",
											left: `${floatingPosition.x}px`,
											top: `${floatingPosition.y}px`,
											zIndex: 9999,
											background: CODE_BLOCK_BG_COLOR,
											width: "min(calc(100vw - 54px), 600px)",
										}}>
										<div className="mb-[10px] pb-1 border-b border-[var(--vscode-editorGroup-border)]">
											<VSCodeButton
												disabled={restoreWorkspaceDisabled || isCheckpointCheckedOut}
												onClick={handleRestoreWorkspace}
												style={{
													cursor: isCheckpointCheckedOut
														? "not-allowed"
														: restoreWorkspaceDisabled
															? "wait"
															: "pointer",
													width: "100%",
													marginBottom: "10px",
												}}>
												Restore Files
											</VSCodeButton>
											<p className="m-0 mb-0.5 text-[var(--vscode-descriptionForeground)] text-[11px] leading-[14px]">
												Restores your project's files back to a snapshot taken at this point (use
												"Compare" to see what will be reverted)
											</p>
										</div>
										<div className="mb-[10px] pb-1 border-b border-[var(--vscode-editorGroup-border)]">
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
												Deletes messages after this point (does not affect workspace files)
											</p>
										</div>
										<div>
											<VSCodeButton
												disabled={restoreBothDisabled}
												onClick={handleRestoreBoth}
												style={{
													cursor: restoreBothDisabled ? "wait" : "pointer",
													width: "100%",
													marginBottom: "10px",
												}}>
												Restore Files & Task
											</VSCodeButton>
											<p className="m-0 mb-[-2px] text-[var(--vscode-descriptionForeground)] text-[11px] leading-[14px]">
												Restores your project's files and deletes all messages after this point
											</p>
										</div>
									</div>
								</>,
								document.body,
							)}
					</div>
					<div style={getDottedLineStyle(isCheckpointCheckedOut, true)} />
				</div>
			</div>
		</div>
	)
}
