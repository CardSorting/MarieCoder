import React, { useCallback } from "react"
import ChatTextArea from "@/components/chat/ChatTextArea"
import QuotedMessagePreview from "@/components/chat/QuotedMessagePreview"
import { ChatState, MessageHandlers, ScrollBehavior } from "../../types/chatTypes"

interface InputSectionProps {
	chatState: ChatState
	messageHandlers: MessageHandlers
	scrollBehavior: ScrollBehavior
	placeholderText: string
	shouldDisableFilesAndImages: boolean
	selectFilesAndImages: () => Promise<void>
}

/**
 * Input section including quoted message preview and chat text area
 */
export const InputSection: React.FC<InputSectionProps> = ({
	chatState,
	messageHandlers,
	scrollBehavior,
	placeholderText,
	shouldDisableFilesAndImages,
	selectFilesAndImages,
}) => {
	const {
		activeQuote,
		setActiveQuote,
		inputValue,
		setInputValue,
		sendingDisabled,
		selectedImages,
		setSelectedImages,
		selectedFiles,
		setSelectedFiles,
		textAreaRef,
	} = chatState

	const { isAtBottom, scrollToBottomAuto } = scrollBehavior

	// Memoize callbacks to prevent unnecessary re-renders of ChatTextArea
	const handleHeightChange = useCallback(() => {
		if (isAtBottom) {
			scrollToBottomAuto()
		}
	}, [isAtBottom, scrollToBottomAuto])

	const handleSend = useCallback(() => {
		messageHandlers.handleSendMessage(inputValue, selectedImages, selectedFiles)
	}, [messageHandlers, inputValue, selectedImages, selectedFiles])

	const handleDismissQuote = useCallback(() => {
		setActiveQuote(null)
	}, [setActiveQuote])

	return (
		<>
			{activeQuote && (
				<div style={{ marginBottom: "-12px", marginTop: "10px" }}>
					<QuotedMessagePreview isFocused={true} onDismiss={handleDismissQuote} text={activeQuote} />
				</div>
			)}

			<ChatTextArea
				activeQuote={activeQuote}
				inputValue={inputValue}
				onHeightChange={handleHeightChange}
				onSelectFilesAndImages={selectFilesAndImages}
				onSend={handleSend}
				placeholderText={placeholderText}
				ref={textAreaRef}
				selectedFiles={selectedFiles}
				selectedImages={selectedImages}
				sendingDisabled={sendingDisabled}
				setInputValue={setInputValue}
				setSelectedFiles={setSelectedFiles}
				setSelectedImages={setSelectedImages}
				shouldDisableFilesAndImages={shouldDisableFilesAndImages}
			/>
		</>
	)
}
