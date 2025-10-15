import { ClineMessage } from "@shared/ExtensionMessage"
import { StringRequest } from "@shared/proto/cline/common"
import React, { useCallback, useMemo } from "react"
import Thumbnails from "@/components/common/Thumbnails"
import { ChevronDownIcon, ChevronRightIcon } from "@/components/icons"
import { Navbar } from "@/components/menu/Navbar"
import { getModeSpecificFields, normalizeApiConfiguration } from "@/components/settings/utils/providerUtils"
import { useSettingsState } from "@/context/SettingsContext"
import { useTaskState } from "@/context/TaskStateContext"
import { useUIState } from "@/context/UIStateContext"
import { UiServiceClient } from "@/services/grpc-client"
import { cn } from "@/utils/classnames"
import { debug } from "@/utils/debug_logger"
import CopyTaskButton from "./buttons/CopyTaskButton"
import DeleteTaskButton from "./buttons/DeleteTaskButton"
import NewTaskButton from "./buttons/NewTaskButton"
import OpenDiskConversationHistoryButton from "./buttons/OpenDiskConversationHistoryButton"
import { CheckpointError } from "./CheckpointError"
import ContextWindow from "./ContextWindow"
import { highlightText } from "./Highlights"
import TaskTimeline from "./TaskTimeline"

const IS_DEV = process.env.IS_DEV === '"true"'
interface TaskHeaderProps {
	task: ClineMessage
	tokensIn: number
	tokensOut: number
	doesModelSupportPromptCache: boolean
	cacheWrites?: number
	cacheReads?: number
	totalCost: number
	lastApiReqTotalTokens?: number
	lastProgressMessageText?: string
	onClose: () => void
	onScrollToMessage?: (messageIndex: number) => void
	onSendMessage?: (command: string, files: string[], images: string[]) => void
}

const BUTTON_CLASS = "max-h-3 border-0 font-bold bg-transparent hover:opacity-100 text-foreground"

const TaskHeader: React.FC<TaskHeaderProps> = ({
	task,
	tokensIn,
	tokensOut,
	cacheWrites,
	cacheReads,
	totalCost,
	lastApiReqTotalTokens,
	lastProgressMessageText: _lastProgressMessageText,
	onClose,
	onScrollToMessage,
	onSendMessage,
}) => {
	const { apiConfiguration, mode } = useSettingsState()
	const { currentTaskId, totalTasksSize, checkpointManagerErrorMessage, clineMessages } = useTaskState()
	const { navigateToSettings, expandTaskHeader: isTaskExpanded, setExpandTaskHeader: setIsTaskExpanded } = useUIState()

	// Simplified computed values
	const { selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, mode)
	const _modeFields = getModeSpecificFields(apiConfiguration, mode)

	const isCostAvailable = totalCost !== undefined

	// Event handlers
	const toggleTaskExpanded = useCallback(() => setIsTaskExpanded(!isTaskExpanded), [setIsTaskExpanded, isTaskExpanded])

	const handleCheckpointSettingsClick = useCallback(() => {
		navigateToSettings()
		setTimeout(async () => {
			try {
				await UiServiceClient.scrollToSettings(StringRequest.create({ value: "features" }))
			} catch (error) {
				debug.error("Error scrolling to checkpoint settings:", error)
			}
		}, 300)
	}, [navigateToSettings])

	const highlightedText = useMemo(() => highlightText(task.text, false), [task.text])

	return (
		<div className={"p-2 flex flex-col gap-1.5"}>
			{/* Navigation Menu */}
			<div className="w-full flex justify-end -mt-1 mb-1">
				<Navbar />
			</div>

			{/* Display Checkpoint Error */}
			<CheckpointError
				checkpointManagerErrorMessage={checkpointManagerErrorMessage}
				handleCheckpointSettingsClick={handleCheckpointSettingsClick}
			/>
			{/* Task Header */}
			<div
				className={cn(
					"relative overflow-hidden cursor-pointer rounded-sm flex flex-col gap-1.5 z-10 pt-2 pb-2 px-2 hover:opacity-100 bg-[var(--vscode-toolbar-hoverBackground)]/65",
					{
						"opacity-100 border-1 border-[var(--vscode-editorGroup-border)]": isTaskExpanded, // No hover effects when expanded, add border
						"hover:bg-[var(--vscode-toolbar-hoverBackground)] border-1 border-[var(--vscode-editorGroup-border)]":
							!isTaskExpanded, // Hover effects only when collapsed
					},
				)}>
				{/* Task Title */}
				<div
					aria-expanded={isTaskExpanded}
					aria-label={isTaskExpanded ? "Collapse task details" : "Expand task details"}
					className="flex justify-between items-center cursor-pointer"
					onClick={toggleTaskExpanded}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault()
							toggleTaskExpanded()
						}
					}}
					role="button"
					tabIndex={0}>
					<div className="flex justify-between items-center">
						{isTaskExpanded ? <ChevronDownIcon size="16" /> : <ChevronRightIcon size="16" />}
						{isTaskExpanded && (
							<div
								className="mt-1 max-h-3 flex justify-end flex-wrap cursor-pointer opacity-80"
								onClick={(e) => e.stopPropagation()}>
								<CopyTaskButton className={BUTTON_CLASS} taskText={task.text} />
								<DeleteTaskButton
									className={BUTTON_CLASS}
									taskId={currentTaskId}
									taskSize={totalTasksSize ?? undefined}
								/>
								{/* Only visible in development mode */}
								{IS_DEV && <OpenDiskConversationHistoryButton className={BUTTON_CLASS} taskId={currentTaskId} />}
							</div>
						)}
					</div>
					<div className="flex items-center select-none flex-grow min-w-0 gap-1 justify-between">
						{!isTaskExpanded && (
							<div className="text-sm whitespace-nowrap overflow-hidden text-ellipsis flex-grow min-w-0">
								<span className="ph-no-capture">{highlightText(task.text, false)}</span>
							</div>
						)}
					</div>
					<div className="inline-flex items-center justify-end select-none flex-shrink-0">
						{isCostAvailable && (
							<div
								className="mr-1 px-1 py-0.25 rounded-full inline-flex shrink-0 text-badge-background bg-badge-foreground/80 items-center"
								id="price-tag">
								<span className="text-xs">${totalCost?.toFixed(4)}</span>
							</div>
						)}
						<NewTaskButton className={BUTTON_CLASS} onClick={onClose} />
					</div>
				</div>

				{/* Expand/Collapse Task Details */}
				{isTaskExpanded && (
					<div className="flex flex-col break-words" key={`task-details-${currentTaskId}`}>
						<div className="whitespace-nowrap overflow-hidden text-ellipsis flex-grow min-w-0 max-h-20 overflow-y-auto scroll-smooth">
							<div
								className={
									"ph-no-capture overflow-hidden whitespace-pre-wrap break-words px-0.5 text-sm cursor-pointer mt-1"
								}>
								{highlightedText}
							</div>
						</div>

						{((task.images && task.images.length > 0) || (task.files && task.files.length > 0)) && (
							<Thumbnails files={task.files ?? []} images={task.images ?? []} />
						)}

						<ContextWindow
							cacheReads={cacheReads}
							cacheWrites={cacheWrites}
							contextWindow={selectedModelInfo?.contextWindow}
							lastApiReqTotalTokens={lastApiReqTotalTokens}
							onSendMessage={onSendMessage}
							tokensIn={tokensIn}
							tokensOut={tokensOut}
							useAutoCondense={false} // Disable auto-condense configuration in UI for now
						/>

						<TaskTimeline messages={clineMessages} onBlockClick={onScrollToMessage} />
					</div>
				)}
			</div>
		</div>
	)
}

export default TaskHeader
