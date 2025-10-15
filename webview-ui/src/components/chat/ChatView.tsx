import { findLast } from "@shared/array"
import { combineApiRequests } from "@shared/combineApiRequests"
import { combineCommandSequences } from "@shared/combineCommandSequences"
import type { ClineApiReqInfo, ClineMessage } from "@shared/ExtensionMessage"
import { getApiMetrics } from "@shared/getApiMetrics"
import { BooleanRequest, StringRequest } from "@shared/proto/cline/common"
import { useCallback, useEffect, useMemo } from "react"
import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils"
import { useSettingsState } from "@/context/SettingsContext"
import { useTaskState } from "@/context/TaskStateContext"
import { FileServiceClient, UiServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { useMount } from "@/utils/hooks"
// Import utilities and hooks from the new structure
import {
	CHAT_CONSTANTS,
	ChatLayout,
	convertHtmlToMarkdown,
	filterVisibleMessages,
	groupMessages,
	useChatState,
	useMessageHandlers,
	useScrollBehavior,
} from "./chat-view"
import { ActionButtons } from "./chat-view/components/layout/ActionButtons"
import { InputSection } from "./chat-view/components/layout/InputSection"
import { MessagesArea } from "./chat-view/components/layout/MessagesArea"
import { TaskSection } from "./chat-view/components/layout/TaskSection"
import { WelcomeSection } from "./chat-view/components/layout/WelcomeSection"

interface ChatViewProps {
	isHidden: boolean
	showHistoryView: () => void
}

// Use constants from the imported module
const MAX_IMAGES_AND_FILES_PER_MESSAGE = CHAT_CONSTANTS.MAX_IMAGES_AND_FILES_PER_MESSAGE

const ChatView = ({ isHidden, showHistoryView }: ChatViewProps) => {
	const { version, apiConfiguration, mode, currentFocusChainChecklist } = useSettingsState()
	const { clineMessages: messages, taskHistory } = useTaskState()

	//const task = messages.length > 0 ? (messages[0].say === "task" ? messages[0] : undefined) : undefined) : undefined
	const task = useMemo(() => messages.at(0), [messages]) // leaving this less safe version here since if the first message is not a task, then the extension is in a bad state and needs to be debugged (see Cline.abort)
	const modifiedMessages = useMemo(() => combineApiRequests(combineCommandSequences(messages.slice(1))), [messages])
	// has to be after api_req_finished are all reduced into api_req_started messages
	const apiMetrics = useMemo(() => getApiMetrics(modifiedMessages), [modifiedMessages])

	const lastApiReqTotalTokens = useMemo(() => {
		const getTotalTokensFromApiReqMessage = (msg: ClineMessage) => {
			if (!msg.text) {
				return 0
			}
			const { tokensIn, tokensOut, cacheWrites, cacheReads }: ClineApiReqInfo = JSON.parse(msg.text)
			return (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)
		}
		const lastApiReqMessage = findLast(modifiedMessages, (msg) => {
			if (msg.say !== "api_req_started") {
				return false
			}
			return getTotalTokensFromApiReqMessage(msg) > 0
		})
		if (!lastApiReqMessage) {
			return undefined
		}
		return getTotalTokensFromApiReqMessage(lastApiReqMessage)
	}, [modifiedMessages])

	// Use custom hooks for state management
	const chatState = useChatState(messages)
	const {
		setInputValue,
		selectedImages,
		setSelectedImages,
		selectedFiles,
		setSelectedFiles,
		sendingDisabled,
		enableButtons,
		expandedRows,
		setExpandedRows,
		textAreaRef,
	} = chatState

	useEffect(() => {
		const handleCopy = async (e: ClipboardEvent) => {
			const targetElement = e.target as HTMLElement | null
			// If the copy event originated from an input or textarea, let the default behavior handle it
			if (
				targetElement &&
				(targetElement.tagName === "INPUT" || targetElement.tagName === "TEXTAREA" || targetElement.isContentEditable)
			) {
				return
			}

			const selection = window.getSelection()
			if (!selection || selection.rangeCount === 0) {
				return
			}

			const range = selection.getRangeAt(0)
			const commonAncestor = range.commonAncestorContainer
			let currentElement =
				commonAncestor.nodeType === Node.ELEMENT_NODE ? (commonAncestor as HTMLElement) : commonAncestor.parentElement

			// Check if we're in a code block - if so, use plain text
			let isCodeBlock = false
			while (currentElement) {
				if (currentElement.tagName === "PRE" && currentElement.querySelector("code")) {
					isCodeBlock = true
					break
				}
				if (currentElement.tagName === "BODY") {
					break
				}
				currentElement = currentElement.parentElement
			}

			try {
				const textToCopy = isCodeBlock
					? selection.toString()
					: await convertHtmlToMarkdown(range.cloneContents().textContent || "")

				if (textToCopy) {
					await FileServiceClient.copyToClipboard(StringRequest.create({ value: textToCopy }))
					e.preventDefault()
				}
			} catch (error) {
				debug.error("Error copying to clipboard:", error)
			}
		}

		document.addEventListener("copy", handleCopy)
		return () => document.removeEventListener("copy", handleCopy)
	}, [])
	// Button state is now managed by useButtonState hook

	useEffect(() => {
		setExpandedRows({})
	}, [task?.ts])

	// handleFocusChange is already provided by chatState

	// Use message handlers hook
	const messageHandlers = useMessageHandlers(messages, chatState)

	const { selectedModelInfo } = useMemo(() => {
		return normalizeApiConfiguration(apiConfiguration, mode)
	}, [apiConfiguration, mode])

	const selectFilesAndImages = useCallback(async () => {
		try {
			const response = await FileServiceClient.selectFiles(
				BooleanRequest.create({
					value: selectedModelInfo.supportsImages,
				}),
			)
			if (
				response &&
				response.values1 &&
				response.values2 &&
				(response.values1.length > 0 || response.values2.length > 0)
			) {
				const currentTotal = selectedImages.length + selectedFiles.length
				const availableSlots = MAX_IMAGES_AND_FILES_PER_MESSAGE - currentTotal

				if (availableSlots > 0) {
					// Prioritize images first
					const imagesToAdd = Math.min(response.values1.length, availableSlots)
					if (imagesToAdd > 0) {
						setSelectedImages((prevImages) => [...prevImages, ...response.values1.slice(0, imagesToAdd)])
					}

					// Use remaining slots for files
					const remainingSlots = availableSlots - imagesToAdd
					if (remainingSlots > 0) {
						setSelectedFiles((prevFiles) => [...prevFiles, ...response.values2.slice(0, remainingSlots)])
					}
				}
			}
		} catch (error) {
			debug.error("Error selecting images & files:", error)
		}
	}, [selectedModelInfo.supportsImages])

	const shouldDisableFilesAndImages = selectedImages.length + selectedFiles.length >= MAX_IMAGES_AND_FILES_PER_MESSAGE

	// Listen for local focusChatInput event
	useEffect(() => {
		const handleFocusChatInput = () => {
			// Only focus chat input box if user is currently viewing the chat (not hidden).
			if (!isHidden) {
				textAreaRef.current?.focus()
			}
		}

		window.addEventListener("focusChatInput", handleFocusChatInput)

		return () => {
			window.removeEventListener("focusChatInput", handleFocusChatInput)
		}
	}, [isHidden])

	// Set up addToInput subscription
	useEffect(() => {
		const cleanup = UiServiceClient.subscribeToAddToInput(
			{},
			{
				onResponse: (event) => {
					if (event.value) {
						setInputValue((prevValue) => {
							const newText = event.value
							const newTextWithNewline = newText + "\n"
							return prevValue ? `${prevValue}\n${newTextWithNewline}` : newTextWithNewline
						})
						if (textAreaRef.current) {
							textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight
							textAreaRef.current.focus()
						}
					}
				},
				onError: (error) => {
					debug.error("Error in addToInput subscription:", error)
				},
				onComplete: () => {
					debug.log("addToInput subscription completed")
				},
			},
		)

		return cleanup
	}, [])

	useMount(() => {
		// NOTE: the vscode window needs to be focused for this to work
		textAreaRef.current?.focus()
	})

	useEffect(() => {
		if (!isHidden && !sendingDisabled && !enableButtons) {
			textAreaRef.current?.focus()
		}
	}, [isHidden, sendingDisabled, enableButtons])

	const visibleMessages = useMemo(() => {
		return filterVisibleMessages(modifiedMessages)
	}, [modifiedMessages])

	const lastProgressMessageText = useMemo(() => {
		// First check if we have a current focus chain list from the extension state
		if (currentFocusChainChecklist) {
			return currentFocusChainChecklist
		}

		// Fall back to the last task_progress message if no state focus chain list
		const lastProgressMessage = [...modifiedMessages].reverse().find((message) => message.say === "task_progress")
		return lastProgressMessage?.text
	}, [modifiedMessages, currentFocusChainChecklist])

	const groupedMessages = useMemo(() => {
		return groupMessages(visibleMessages)
	}, [visibleMessages])

	// Use scroll behavior hook
	const scrollBehavior = useScrollBehavior(messages, visibleMessages, groupedMessages, expandedRows, setExpandedRows)

	const placeholderText = task ? "Type a message..." : "Type your task here..."

	return (
		<ChatLayout isHidden={isHidden}>
			<div className="flex flex-col flex-1 overflow-hidden">
				<main className="flex flex-col flex-1 overflow-hidden">
					{task ? (
						<TaskSection
							apiMetrics={apiMetrics}
							lastApiReqTotalTokens={lastApiReqTotalTokens}
							lastProgressMessageText={lastProgressMessageText}
							messageHandlers={messageHandlers}
							scrollBehavior={scrollBehavior}
							selectedModelInfo={{
								supportsPromptCache: selectedModelInfo.supportsPromptCache,
								supportsImages: selectedModelInfo.supportsImages || false,
							}}
							task={task}
						/>
					) : (
						<WelcomeSection showHistoryView={showHistoryView} taskHistory={taskHistory} version={version} />
					)}
					{task && (
						<MessagesArea
							chatState={chatState}
							groupedMessages={groupedMessages}
							messageHandlers={messageHandlers}
							modifiedMessages={modifiedMessages}
							scrollBehavior={scrollBehavior}
							task={task}
						/>
					)}
				</main>
			</div>
			<footer
				className="bg-[var(--vscode-editor-background)] border-t border-[var(--vscode-panel-border)]"
				style={{
					gridRow: "2",
					boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.05)",
				}}>
				<ActionButtons
					chatState={chatState}
					messageHandlers={messageHandlers}
					messages={messages}
					mode={mode}
					scrollBehavior={{
						scrollToBottomSmooth: scrollBehavior.scrollToBottomSmooth,
						disableAutoScrollRef: scrollBehavior.disableAutoScrollRef,
						showScrollToBottom: scrollBehavior.showScrollToBottom,
						virtuosoRef: scrollBehavior.virtuosoRef,
					}}
					task={task}
				/>
				<InputSection
					chatState={chatState}
					messageHandlers={messageHandlers}
					placeholderText={placeholderText}
					scrollBehavior={scrollBehavior}
					selectFilesAndImages={selectFilesAndImages}
					shouldDisableFilesAndImages={shouldDisableFilesAndImages}
				/>
			</footer>
		</ChatLayout>
	)
}

export default ChatView
