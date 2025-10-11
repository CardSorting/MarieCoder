/**
 * ChatTextArea - Main text input component (refactored and consolidated)
 */

import { forwardRef, useCallback, useEffect, useMemo, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { InputToolbar } from "./chat_text_area/components/input_toolbar/InputToolbar"
import { ModeSwitch } from "./chat_text_area/components/mode_switch/ModeSwitch"
import { TextInputArea } from "./chat_text_area/components/TextInputArea"
import {
	useContextButton,
	useContextMenu,
	useDragDrop,
	useErrorMessages,
	useInputState,
	useModelSelector,
	useModeToggle,
	usePasteHandler,
	useSlashCommands,
	useTextHighlighting,
} from "./chat_text_area/hooks"
import type { ChatTextAreaProps } from "./chat_text_area/types"

const ChatTextArea = forwardRef<HTMLTextAreaElement, ChatTextAreaProps>(
	(
		{
			inputValue,
			setInputValue,
			sendingDisabled,
			placeholderText,
			selectedFiles,
			selectedImages,
			setSelectedImages,
			setSelectedFiles,
			onSend,
			onSelectFilesAndImages,
			shouldDisableFilesAndImages,
			onHeightChange,
			onFocusChange,
		},
		ref,
	) => {
		const {
			mode,
			apiConfiguration,
			openRouterModels,
			localWorkflowToggles,
			globalWorkflowToggles,
			showChatModelSelector: showModelSelector,
			setShowChatModelSelector: setShowModelSelector,
			dictationSettings,
		} = useExtensionState()

		// Input state management
		const {
			cursorPosition,
			setCursorPosition,
			intendedCursorPosition,
			setIntendedCursorPosition,
			isTextAreaFocused,
			setIsTextAreaFocused,
			thumbnailsHeight,
			textAreaBaseHeight,
			setTextAreaBaseHeight,
			textAreaRef,
			updateCursorPosition,
			handleThumbnailsHeightChange,
		} = useInputState()

		// Error messages
		const { showDimensionError, showDimensionErrorMessage } = useErrorMessages()

		// Context menu
		const contextMenu = useContextMenu({
			cursorPosition,
			setInputValue,
			setCursorPosition,
			setIntendedCursorPosition,
			textAreaRef,
		})

		// Slash commands
		const slashCommands = useSlashCommands({
			setInputValue,
			setCursorPosition,
			setIntendedCursorPosition,
			textAreaRef,
		})

		// Model selector
		const modelSelector = useModelSelector({
			apiConfiguration: apiConfiguration!,
			mode,
			openRouterModels: openRouterModels || {},
			showModelSelector,
			setShowModelSelector,
		})

		// Text highlighting
		const { highlightLayerRef, updateHighlights } = useTextHighlighting({
			inputValue,
			textAreaRef,
			localWorkflowToggles,
			globalWorkflowToggles,
		})

		// Paste handler
		const { handlePaste } = usePasteHandler({
			inputValue,
			setInputValue,
			cursorPosition,
			setCursorPosition,
			setIntendedCursorPosition,
			setShowContextMenu: contextMenu.setShowContextMenu,
			shouldDisableFilesAndImages,
			selectedImages,
			setSelectedImages,
			selectedFiles,
			showDimensionErrorMessage,
			textAreaRef,
		})

		// Drag and drop
		const dragDrop = useDragDrop({
			inputValue,
			setInputValue,
			cursorPosition,
			setCursorPosition,
			setIntendedCursorPosition,
			intendedCursorPosition,
			selectedImages,
			setSelectedImages,
			selectedFiles,
			shouldDisableFilesAndImages,
			textAreaRef,
			showDimensionErrorMessage,
		})

		// Mode toggle
		const { onModeToggle } = useModeToggle({
			mode,
			showModelSelector,
			submitApiConfig: modelSelector.submitApiConfig,
			inputValue,
			selectedImages,
			selectedFiles,
			setInputValue,
			textAreaRef,
		})

		// Voice recording state
		const [isVoiceRecording, setIsVoiceRecording] = useState(false)

		// Combined input change handler
		const handleInputChange = useCallback(
			(e: React.ChangeEvent<HTMLTextAreaElement>) => {
				const newValue = e.target.value
				const newCursorPosition = e.target.selectionStart
				setInputValue(newValue)
				setCursorPosition(newCursorPosition)

				// Check both menus
				slashCommands.handleInputChange(newValue, newCursorPosition)
				contextMenu.handleInputChange(newValue, newCursorPosition)
			},
			[setInputValue, setCursorPosition, contextMenu, slashCommands],
		)

		// Context button
		const { handleContextButtonClick } = useContextButton({
			inputValue,
			textAreaRef,
			handleInputChange: (newValue: string, newCursorPosition: number) => {
				setInputValue(newValue)
				setCursorPosition(newCursorPosition)
				contextMenu.handleInputChange(newValue, newCursorPosition)
			},
			updateHighlights,
		})

		// Keyboard handlers
		const handleKeyDown = useCallback(
			(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
				// Simple keyboard handling inline to reduce complexity
				if (slashCommands.showSlashCommandsMenu || contextMenu.showContextMenu) {
					// Menu-specific handling would go here
					// For now, simplified
				}

				// Enter to send
				if (event.key === "Enter" && !event.shiftKey && !sendingDisabled) {
					event.preventDefault()
					setIsTextAreaFocused(false)
					onSend()
				}
			},
			[slashCommands.showSlashCommandsMenu, contextMenu.showContextMenu, sendingDisabled, onSend, setIsTextAreaFocused],
		)

		const handleKeyUp = useCallback(
			(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
				if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
					updateCursorPosition()
				}
			},
			[updateCursorPosition],
		)

		const handleBlur = useCallback(() => {
			contextMenu.setShowContextMenu(false)
			slashCommands.setShowSlashCommandsMenu(false)
			setIsTextAreaFocused(false)
			onFocusChange?.(false)
		}, [contextMenu, slashCommands, setIsTextAreaFocused, onFocusChange])

		const handleFocus = useCallback(() => {
			setIsTextAreaFocused(true)
			onFocusChange?.(true)
		}, [setIsTextAreaFocused, onFocusChange])

		// Voice transcription handlers
		const handleVoiceTranscription = useCallback(
			(text: string) => {
				const processingPattern = /\s*\[Transcribing\.\.\.\]$/
				const cleanedValue = inputValue.replace(processingPattern, "")
				if (!text) {
					setInputValue(cleanedValue)
					return
				}
				const newValue = cleanedValue + (cleanedValue ? " " : "") + text
				setInputValue(newValue)
				setTimeout(() => {
					if (textAreaRef.current) {
						textAreaRef.current.focus()
						const length = newValue.length
						textAreaRef.current.setSelectionRange(length, length)
					}
				}, 0)
			},
			[inputValue, setInputValue, textAreaRef],
		)

		const handleVoiceProcessingStateChange = useCallback(
			(isProcessing: boolean, message?: string) => {
				if (isProcessing && message) {
					setInputValue(`${inputValue} [${message}]`.trim())
				}
			},
			[inputValue, setInputValue],
		)

		// Query items for context menu (empty for now, git commits will be used)
		const queryItems = useMemo(() => contextMenu.gitCommits, [contextMenu.gitCommits])

		// Reset thumbnail height when cleared
		useEffect(() => {
			if (selectedImages.length === 0 && selectedFiles.length === 0) {
				handleThumbnailsHeightChange(0)
			}
		}, [selectedImages, selectedFiles, handleThumbnailsHeightChange])

		// Forward ref
		useEffect(() => {
			if (typeof ref === "function") {
				ref(textAreaRef.current)
			} else if (ref) {
				ref.current = textAreaRef.current
			}
		}, [ref, textAreaRef])

		return (
			<div>
				<TextInputArea
					contextMenuContainerRef={contextMenu.contextMenuContainerRef}
					dictationEnabled={dictationSettings?.dictationEnabled === true && dictationSettings?.featureEnabled}
					dictationLanguage={dictationSettings?.dictationLanguage}
					fileSearchResults={contextMenu.fileSearchResults}
					globalWorkflowToggles={globalWorkflowToggles}
					handleThumbnailsHeightChange={handleThumbnailsHeightChange}
					highlightLayerRef={highlightLayerRef}
					inputValue={inputValue}
					isDraggingOver={dragDrop.isDraggingOver}
					isTextAreaFocused={isTextAreaFocused}
					isVoiceRecording={isVoiceRecording}
					localWorkflowToggles={localWorkflowToggles}
					mode={mode}
					onBlur={handleBlur}
					onChange={(e) => {
						handleInputChange(e)
						updateHighlights()
					}}
					onDragEnter={dragDrop.handleDragEnter}
					onDragLeave={dragDrop.handleDragLeave}
					onDragOver={dragDrop.onDragOver}
					onDrop={dragDrop.onDrop}
					onFocus={handleFocus}
					onHeightChange={(height) => {
						if (textAreaBaseHeight === undefined || height < textAreaBaseHeight) {
							setTextAreaBaseHeight(height)
						}
						onHeightChange?.(height)
					}}
					onKeyDown={handleKeyDown}
					onKeyUp={handleKeyUp}
					onMentionSelect={contextMenu.handleMentionSelect}
					onMenuMouseDown={contextMenu.handleMenuMouseDown}
					onMouseUp={() => updateCursorPosition()}
					onPaste={handlePaste}
					onScroll={() => updateHighlights()}
					onSelect={() => updateCursorPosition()}
					onSend={() => {
						setIsTextAreaFocused(false)
						onSend()
					}}
					onSlashCommandSelect={slashCommands.handleSlashCommandsSelect}
					onVoiceProcessingStateChange={handleVoiceProcessingStateChange}
					onVoiceRecordingStateChange={setIsVoiceRecording}
					onVoiceTranscription={handleVoiceTranscription}
					placeholderText={placeholderText}
					queryItems={queryItems}
					searchLoading={contextMenu.searchLoading}
					searchQuery={contextMenu.searchQuery}
					selectedFiles={selectedFiles}
					selectedImages={selectedImages}
					selectedMenuIndex={contextMenu.selectedMenuIndex}
					selectedSlashCommandsIndex={slashCommands.selectedSlashCommandsIndex}
					selectedType={contextMenu.selectedType}
					sendingDisabled={sendingDisabled}
					setSelectedFiles={setSelectedFiles}
					setSelectedImages={setSelectedImages}
					setSelectedMenuIndex={contextMenu.setSelectedMenuIndex}
					setSelectedSlashCommandsIndex={slashCommands.setSelectedSlashCommandsIndex}
					showContextMenu={contextMenu.showContextMenu}
					showDimensionError={showDimensionError}
					showSlashCommandsMenu={slashCommands.showSlashCommandsMenu}
					showUnsupportedFileError={dragDrop.showUnsupportedFileError}
					slashCommandsMenuContainerRef={slashCommands.slashCommandsMenuContainerRef}
					slashCommandsQuery={slashCommands.slashCommandsQuery}
					textAreaBaseHeight={textAreaBaseHeight}
					textAreaRef={textAreaRef}
					thumbnailsHeight={thumbnailsHeight}
				/>

				<div className="flex items-center gap-2 -mt-1 px-3 pb-2">
					<InputToolbar
						arrowPosition={modelSelector.arrowPosition}
						buttonRef={modelSelector.buttonRef}
						menuPosition={modelSelector.menuPosition}
						mode={mode}
						modelDisplayName={modelSelector.modelDisplayName}
						modelFullName={modelSelector.modelFullName}
						modelSelectorRef={modelSelector.modelSelectorRef}
						onContextButtonClick={handleContextButtonClick}
						onModelButtonClick={modelSelector.handleModelButtonClick}
						onSelectFilesAndImages={onSelectFilesAndImages}
						shouldDisableFilesAndImages={shouldDisableFilesAndImages}
						showModelSelector={showModelSelector}
					/>

					<ModeSwitch mode={mode} onModeToggle={onModeToggle} />
				</div>
			</div>
		)
	},
)

ChatTextArea.displayName = "ChatTextArea"

export default ChatTextArea
