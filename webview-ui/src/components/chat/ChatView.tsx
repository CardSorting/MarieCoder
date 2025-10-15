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
import {
	CHAT_CONSTANTS,
	ChatLayout,
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

	const task = messages.at(0)
	const modifiedMessages = useMemo(() => combineApiRequests(combineCommandSequences(messages.slice(1))), [messages])
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
			const target = e.target as HTMLElement | null
			// Let default behavior handle input/textarea
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
				return
			}

			const selection = window.getSelection()
			const text = selection?.toString()
			if (text) {
				try {
					await FileServiceClient.copyToClipboard(StringRequest.create({ value: text }))
					e.preventDefault()
				} catch (error) {
					debug.error("Error copying to clipboard:", error)
				}
			}
		}

		document.addEventListener("copy", handleCopy)
		return () => document.removeEventListener("copy", handleCopy)
	}, [])

	useEffect(() => {
		setExpandedRows({})
	}, [task?.ts])

	const messageHandlers = useMessageHandlers(messages, chatState)
	const { selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, mode)

	const selectFilesAndImages = useCallback(async () => {
		try {
			const response = await FileServiceClient.selectFiles(
				BooleanRequest.create({ value: selectedModelInfo.supportsImages }),
			)
			if (!response || (!response.values1?.length && !response.values2?.length)) {
				return
			}

			const currentTotal = selectedImages.length + selectedFiles.length
			const availableSlots = MAX_IMAGES_AND_FILES_PER_MESSAGE - currentTotal

			if (availableSlots <= 0) {
				return
			}

			const imagesToAdd = Math.min(response.values1.length, availableSlots)
			if (imagesToAdd > 0) {
				setSelectedImages((prev) => [...prev, ...response.values1.slice(0, imagesToAdd)])
			}

			const remainingSlots = availableSlots - imagesToAdd
			if (remainingSlots > 0) {
				setSelectedFiles((prev) => [...prev, ...response.values2.slice(0, remainingSlots)])
			}
		} catch (error) {
			debug.error("Error selecting images & files:", error)
		}
	}, [selectedModelInfo.supportsImages, selectedImages.length, selectedFiles.length])

	const shouldDisableFilesAndImages = selectedImages.length + selectedFiles.length >= MAX_IMAGES_AND_FILES_PER_MESSAGE

	// Handle focus events and input subscription
	useEffect(() => {
		const handleFocusChatInput = () => {
			if (!isHidden) {
				textAreaRef.current?.focus()
			}
		}

		window.addEventListener("focusChatInput", handleFocusChatInput)

		const cleanup = UiServiceClient.subscribeToAddToInput(
			{},
			{
				onResponse: (event) => {
					if (event.value) {
						setInputValue((prev) => (prev ? `${prev}\n${event.value}\n` : `${event.value}\n`))
						if (textAreaRef.current) {
							textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight
							textAreaRef.current.focus()
						}
					}
				},
				onError: (error) => debug.error("Error in addToInput subscription:", error),
				onComplete: () => debug.log("addToInput subscription completed"),
			},
		)

		return () => {
			window.removeEventListener("focusChatInput", handleFocusChatInput)
			cleanup()
		}
	}, [isHidden])

	// Auto-focus textarea when conditions are met
	useEffect(() => {
		if (!isHidden && !sendingDisabled && !enableButtons) {
			textAreaRef.current?.focus()
		}
	}, [isHidden, sendingDisabled, enableButtons])

	const visibleMessages = useMemo(() => filterVisibleMessages(modifiedMessages), [modifiedMessages])
	const groupedMessages = useMemo(() => groupMessages(visibleMessages), [visibleMessages])
	const scrollBehavior = useScrollBehavior(messages, visibleMessages, groupedMessages, expandedRows, setExpandedRows)

	const lastProgressMessageText =
		currentFocusChainChecklist || [...modifiedMessages].reverse().find((msg) => msg.say === "task_progress")?.text

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
