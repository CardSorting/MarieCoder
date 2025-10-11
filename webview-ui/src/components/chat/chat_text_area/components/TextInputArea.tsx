/**
 * TextInputArea - The main text input area with highlights and overlays
 */

import type { Mode } from "@shared/storage/types"
import type React from "react"
import { lazy, Suspense } from "react"
import ContextMenu from "@/components/chat/ContextMenu"
import SlashCommandMenu from "@/components/chat/SlashCommandMenu"
import DynamicTextArea from "@/components/common/AutoGrowTextarea"
import { PulsingBorder } from "@/components/common/PulsingBorder"
import Thumbnails from "@/components/common/Thumbnails"
import type { ContextMenuOptionType, SearchResult } from "@/utils/chat"
import { cn } from "@/utils/classnames"
import type { GitCommit } from "../types"
import { PLAN_MODE_COLOR } from "../utils/constants"

const VoiceRecorder = lazy(() => import("@/components/chat/VoiceRecorder"))

interface TextInputAreaProps {
	inputValue: string
	placeholderText: string
	sendingDisabled: boolean
	isTextAreaFocused: boolean
	isDraggingOver: boolean
	isVoiceRecording: boolean
	thumbnailsHeight: number
	textAreaBaseHeight: number | undefined
	showUnsupportedFileError: boolean
	showDimensionError: boolean
	showSlashCommandsMenu: boolean
	showContextMenu: boolean
	mode: Mode
	selectedImages: string[]
	selectedFiles: string[]
	selectedSlashCommandsIndex: number
	slashCommandsQuery: string
	searchQuery: string
	selectedMenuIndex: number
	selectedType: ContextMenuOptionType | null
	queryItems: GitCommit[]
	fileSearchResults: SearchResult[]
	searchLoading: boolean
	localWorkflowToggles: Record<string, boolean>
	globalWorkflowToggles: Record<string, boolean>
	dictationEnabled: boolean
	dictationLanguage?: string
	textAreaRef: React.RefObject<HTMLTextAreaElement | null>
	highlightLayerRef: React.RefObject<HTMLDivElement>
	slashCommandsMenuContainerRef: React.RefObject<HTMLDivElement>
	contextMenuContainerRef: React.RefObject<HTMLDivElement>
	onBlur: () => void
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
	onFocus: () => void
	onHeightChange?: (height: number) => void
	onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
	onKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
	onMouseUp: () => void
	onPaste: (e: React.ClipboardEvent) => void
	onScroll: () => void
	onSelect: () => void
	onDragEnter: (e: React.DragEvent) => void
	onDragLeave: (e: React.DragEvent) => void
	onDragOver: (e: React.DragEvent) => void
	onDrop: (e: React.DragEvent) => void
	onMenuMouseDown: () => void
	onMentionSelect: (type: ContextMenuOptionType, value?: string) => void
	onSlashCommandSelect: (command: any) => void
	onVoiceRecordingStateChange: (isRecording: boolean) => void
	onVoiceTranscription: (text: string) => void
	onVoiceProcessingStateChange: (isProcessing: boolean, message?: string) => void
	onSend: () => void
	setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>
	setSelectedFiles: React.Dispatch<React.SetStateAction<string[]>>
	setSelectedSlashCommandsIndex: React.Dispatch<React.SetStateAction<number>>
	setSelectedMenuIndex: React.Dispatch<React.SetStateAction<number>>
	handleThumbnailsHeightChange: (height: number) => void
}

export const TextInputArea: React.FC<TextInputAreaProps> = (props) => {
	const {
		inputValue,
		placeholderText,
		sendingDisabled,
		isTextAreaFocused,
		isDraggingOver,
		isVoiceRecording,
		thumbnailsHeight,
		textAreaBaseHeight,
		showUnsupportedFileError,
		showDimensionError,
		showSlashCommandsMenu,
		showContextMenu,
		mode,
		selectedImages,
		selectedFiles,
		selectedSlashCommandsIndex,
		slashCommandsQuery,
		searchQuery,
		selectedMenuIndex,
		selectedType,
		queryItems,
		fileSearchResults,
		searchLoading,
		localWorkflowToggles,
		globalWorkflowToggles,
		dictationEnabled,
		dictationLanguage,
		textAreaRef,
		highlightLayerRef,
		slashCommandsMenuContainerRef,
		contextMenuContainerRef,
		onBlur,
		onChange,
		onFocus,
		onHeightChange,
		onKeyDown,
		onKeyUp,
		onMouseUp,
		onPaste,
		onScroll,
		onSelect,
		onDragEnter,
		onDragLeave,
		onDragOver,
		onDrop,
		onMenuMouseDown,
		onMentionSelect,
		onSlashCommandSelect,
		onVoiceRecordingStateChange,
		onVoiceTranscription,
		onVoiceProcessingStateChange,
		onSend,
		setSelectedImages,
		setSelectedFiles,
		setSelectedSlashCommandsIndex,
		setSelectedMenuIndex,
		handleThumbnailsHeightChange,
	} = props

	return (
		<div
			className="relative flex transition-colors ease-in-out duration-100 px-3.5 py-2.5"
			onDragEnter={onDragEnter}
			onDragLeave={onDragLeave}
			onDragOver={onDragOver}
			onDrop={onDrop}>
			{isVoiceRecording && (
				<div
					className={cn(
						"absolute pointer-events-none z-10 overflow-hidden rounded-xs transition-all ease-in-out duration-300 left-3.5 right-3.5 top-2.5 bottom-2.5",
					)}>
					<PulsingBorder
						bloom={1}
						className="w-full h-full"
						colorBack={"rgba(0,0,0,0)"}
						colors={["#9d57fa", "#57c7fa", "#fa57a8", "#9d57fa"]}
						intensity={0.4}
						pulse={0.3}
						roundness={0}
						scale={1.0}
						smoke={0.25}
						smokeSize={0.8}
						softness={0.8}
						speed={1.5}
						spotSize={0.5}
						spots={4}
						thickness={0.1}
					/>
				</div>
			)}

			{showDimensionError && (
				<div className="absolute inset-2.5 bg-[rgba(var(--vscode-errorForeground-rgb),0.1)] border-2 border-error rounded-xs flex items-center justify-center z-10 pointer-events-none">
					<span className="text-error font-bold text-xs text-center">Image dimensions exceed 7500px</span>
				</div>
			)}

			{showUnsupportedFileError && (
				<div className="absolute inset-2.5 bg-[rgba(var(--vscode-errorForeground-rgb),0.1)] border-2 border-error rounded-xs flex items-center justify-center z-10 pointer-events-none">
					<span className="text-error font-bold text-xs">Files other than images are currently disabled</span>
				</div>
			)}

			{showSlashCommandsMenu && (
				<div ref={slashCommandsMenuContainerRef}>
					<SlashCommandMenu
						globalWorkflowToggles={globalWorkflowToggles}
						localWorkflowToggles={localWorkflowToggles}
						onMouseDown={onMenuMouseDown}
						onSelect={onSlashCommandSelect}
						query={slashCommandsQuery}
						selectedIndex={selectedSlashCommandsIndex}
						setSelectedIndex={setSelectedSlashCommandsIndex}
					/>
				</div>
			)}

			{showContextMenu && (
				<div ref={contextMenuContainerRef}>
					<ContextMenu
						dynamicSearchResults={fileSearchResults}
						isLoading={searchLoading}
						onMouseDown={onMenuMouseDown}
						onSelect={onMentionSelect}
						queryItems={queryItems}
						searchQuery={searchQuery}
						selectedIndex={selectedMenuIndex}
						selectedType={selectedType}
						setSelectedIndex={setSelectedMenuIndex}
					/>
				</div>
			)}

			{/* Highlight layer */}
			<div
				className={cn(
					"absolute bottom-2.5 top-2.5 whitespace-pre-wrap break-words rounded-xs overflow-hidden bg-input-background",
					isTextAreaFocused || isVoiceRecording
						? "left-3.5 right-3.5"
						: "left-3.5 right-3.5 border border-input-border",
				)}
				ref={highlightLayerRef}
				style={{
					position: "absolute",
					pointerEvents: "none",
					whiteSpace: "pre-wrap",
					wordWrap: "break-word",
					color: "transparent",
					overflow: "hidden",
					fontFamily: "var(--vscode-font-family)",
					fontSize: "var(--vscode-editor-font-size)",
					lineHeight: "var(--vscode-editor-line-height)",
					borderRadius: 2,
					borderLeft: isTextAreaFocused || isVoiceRecording ? 0 : undefined,
					borderRight: isTextAreaFocused || isVoiceRecording ? 0 : undefined,
					borderTop: isTextAreaFocused || isVoiceRecording ? 0 : undefined,
					borderBottom: isTextAreaFocused || isVoiceRecording ? 0 : undefined,
					padding: `9px 28px ${9 + thumbnailsHeight}px 9px`,
				}}
			/>

			{/* Text area */}
			<DynamicTextArea
				autoFocus={true}
				data-testid="chat-input"
				maxRows={10}
				minRows={3}
				onBlur={onBlur}
				onChange={onChange}
				onFocus={onFocus}
				onHeightChange={(height) => {
					if (textAreaBaseHeight === undefined || height < textAreaBaseHeight) {
						onHeightChange?.(height)
					}
					onHeightChange?.(height)
				}}
				onKeyDown={onKeyDown}
				onKeyUp={onKeyUp}
				onMouseUp={onMouseUp}
				onPaste={onPaste}
				onScroll={onScroll}
				onSelect={onSelect}
				placeholder={showUnsupportedFileError || showDimensionError ? "" : placeholderText}
				ref={textAreaRef as React.LegacyRef<HTMLTextAreaElement>}
				style={{
					width: "100%",
					boxSizing: "border-box",
					backgroundColor: "transparent",
					color: "var(--vscode-input-foreground)",
					borderRadius: 2,
					fontFamily: "var(--vscode-font-family)",
					fontSize: "var(--vscode-editor-font-size)",
					lineHeight: "var(--vscode-editor-line-height)",
					resize: "none",
					overflowX: "hidden",
					overflowY: "scroll",
					scrollbarWidth: "none",
					borderLeft: 0,
					borderRight: 0,
					borderTop: 0,
					borderBottom: `${thumbnailsHeight}px solid transparent`,
					borderColor: "transparent",
					padding: `9px ${dictationEnabled ? "48" : "28"}px 9px 9px`,
					cursor: "text",
					flex: 1,
					zIndex: 1,
					outline:
						isDraggingOver && !showUnsupportedFileError
							? "2px dashed var(--vscode-focusBorder)"
							: isTextAreaFocused
								? `1px solid ${mode === "plan" ? PLAN_MODE_COLOR : "var(--vscode-focusBorder)"}`
								: "none",
					outlineOffset: isDraggingOver && !showUnsupportedFileError ? "1px" : "0px",
				}}
				value={inputValue}
			/>

			{/* Placeholder hint */}
			{!inputValue && selectedImages.length === 0 && selectedFiles.length === 0 && (
				<div className="text-[10px] absolute bottom-5 left-5 right-16 text-[var(--vscode-input-placeholderForeground)]/50 whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none z-1">
					Type @ for context, / for slash commands & workflows, hold shift to drag in files/images
				</div>
			)}

			{/* Thumbnails */}
			{(selectedImages.length > 0 || selectedFiles.length > 0) && (
				<Thumbnails
					files={selectedFiles}
					images={selectedImages}
					onHeightChange={handleThumbnailsHeightChange}
					setFiles={setSelectedFiles}
					setImages={setSelectedImages}
					style={{
						position: "absolute",
						paddingTop: 4,
						bottom: 14,
						left: 22,
						right: 47,
						zIndex: 2,
					}}
				/>
			)}

			{/* Voice recorder and send button */}
			<div className="absolute flex items-end bottom-4.5 right-5 z-10 h-8 text-xs" style={{ height: textAreaBaseHeight }}>
				<div className="flex flex-row items-center">
					{dictationEnabled && (
						<Suspense fallback={<div className="w-8 h-8" />}>
							<VoiceRecorder
								disabled={sendingDisabled}
								isAuthenticated={true}
								language={dictationLanguage || "en"}
								onProcessingStateChange={onVoiceProcessingStateChange}
								onRecordingStateChange={onVoiceRecordingStateChange}
								onTranscription={onVoiceTranscription}
							/>
						</Suspense>
					)}
					{!isVoiceRecording && (
						<button
							aria-label="Send message"
							className={cn("input-icon-button", { disabled: sendingDisabled }, "codicon codicon-send text-sm")}
							data-testid="send-button"
							disabled={sendingDisabled}
							onClick={onSend}
							onKeyDown={(e) => {
								if ((e.key === "Enter" || e.key === " ") && !sendingDisabled) {
									e.preventDefault()
									onSend()
								}
							}}
							type="button"
						/>
					)}
				</div>
			</div>
		</div>
	)
}
