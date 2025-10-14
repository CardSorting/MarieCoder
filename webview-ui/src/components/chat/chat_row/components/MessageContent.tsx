import type { ClineAskQuestion, ClineMessage, ClinePlanModeResponse, ClineSayTool } from "@shared/ExtensionMessage"
import { memo } from "react"
import NewTaskPreview from "@/components/chat/NewTaskPreview"
import { OptionsButtons } from "@/components/chat/OptionsButtons"
import QuoteButton from "@/components/chat/QuoteButton"
import ReportBugPreview from "@/components/chat/ReportBugPreview"
import UserMessage from "@/components/chat/UserMessage"
import { CheckmarkControl } from "@/components/common/CheckmarkControl"
import CodeAccordian from "@/components/common/CodeAccordian"
import { WithCopyButton } from "@/components/common/CopyButton"
import McpResponseDisplay from "@/components/mcp/chat-display/McpResponseDisplay"
import { headerStyle } from "../utils/style_constants"
import { ApiRequestDisplay } from "./ApiRequestDisplay"
import { CompletionResult } from "./CompletionResult"
import { ErrorMessage } from "./ErrorMessage"
import { Markdown } from "./Markdown"
import { MessageHeader } from "./MessageHeader"
import { ThinkingBlock } from "./ThinkingBlock"

/**
 * Props for MessageContent component
 */
interface MessageContentProps {
	message: ClineMessage
	icon: JSX.Element | null
	title: JSX.Element | null
	isExpanded: boolean
	isLast: boolean
	lastModifiedMessage?: ClineMessage
	inputValue?: string
	sendMessageFromChatRow?: (text: string, images: string[], files: string[]) => void
	// State from hooks
	apiReqCancelReason?: string
	apiRequestFailedMessage?: string
	apiReqStreamingFailedMessage?: string
	retryStatus?: {
		attempt: number
		maxAttempts: number
		delaySec?: number
		errorSnippet?: string
	}
	// Quote selection
	quoteButtonState: {
		visible: boolean
		left: number
		top: number
	}
	contentRef: React.RefObject<HTMLDivElement>
	onQuoteClick: () => void
	onMouseUp: (e: React.MouseEvent<Element>) => void
	onToggle: () => void
}

/**
 * Message content component
 * Routes to appropriate renderer based on message type
 *
 * This component acts as a central router for all message types,
 * delegating to specialized renderers and components
 */
export const MessageContent = memo(
	({
		message,
		icon,
		title,
		isExpanded,
		isLast,
		lastModifiedMessage,
		inputValue,
		sendMessageFromChatRow,
		apiReqCancelReason,
		apiRequestFailedMessage,
		apiReqStreamingFailedMessage,
		retryStatus,
		quoteButtonState,
		contentRef,
		onQuoteClick,
		onMouseUp,
		onToggle,
	}: MessageContentProps) => {
		// Handle "say" messages
		if (message.type === "say") {
			switch (message.say) {
				case "api_req_started":
					return (
						<ApiRequestDisplay
							apiReqCancelReason={apiReqCancelReason}
							apiReqStreamingFailedMessage={apiReqStreamingFailedMessage}
							apiRequestFailedMessage={apiRequestFailedMessage}
							cost={0}
							isExpanded={isExpanded}
							message={message}
							onToggle={onToggle}
							retryStatus={retryStatus}
						/>
					)

				case "api_req_finished":
					return null

				case "mcp_server_response":
					return <McpResponseDisplay responseText={message.text || ""} />

				case "mcp_notification":
					return (
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: "8px",
								padding: "8px 12px",
								backgroundColor: "var(--vscode-textBlockQuote-background)",
								borderRadius: "4px",
								fontSize: "13px",
								color: "var(--vscode-foreground)",
								opacity: 0.9,
								marginBottom: "8px",
							}}>
							<i
								className="codicon codicon-bell"
								style={{
									marginTop: "2px",
									fontSize: "14px",
									color: "var(--vscode-notificationsInfoIcon-foreground)",
									flexShrink: 0,
								}}
							/>
							<div style={{ flex: 1, wordBreak: "break-word" }}>
								<span style={{ fontWeight: 500 }}>MCP Notification: </span>
								<span className="ph-no-capture">{message.text}</span>
							</div>
						</div>
					)

				case "text":
					return (
						<WithCopyButton onMouseUp={onMouseUp} position="bottom-right" ref={contentRef} textToCopy={message.text}>
							<Markdown markdown={message.text} />
							{quoteButtonState.visible && (
								<QuoteButton left={quoteButtonState.left} onClick={onQuoteClick} top={quoteButtonState.top} />
							)}
						</WithCopyButton>
					)

				case "reasoning":
					return message.text ? <ThinkingBlock isExpanded={isExpanded} onToggle={onToggle} text={message.text} /> : null

				case "user_feedback":
					return (
						<UserMessage
							files={message.files}
							images={message.images}
							messageTs={message.ts}
							sendMessageFromChatRow={sendMessageFromChatRow}
							text={message.text}
						/>
					)

				case "user_feedback_diff": {
					const tool = JSON.parse(message.text || "{}") as ClineSayTool
					return (
						<div style={{ marginTop: -10, width: "100%" }}>
							<CodeAccordian
								diff={tool.diff!}
								isExpanded={isExpanded}
								isFeedback={true}
								onToggleExpand={onToggle}
							/>
						</div>
					)
				}

				case "error":
					return <ErrorMessage errorType="error" message={message} />
				case "diff_error":
					return <ErrorMessage errorType="diff_error" message={message} />
				case "clineignore_error":
					return <ErrorMessage errorType="clineignore_error" message={message} />

				case "checkpoint_created":
					return <CheckmarkControl isCheckpointCheckedOut={message.isCheckpointCheckedOut} messageTs={message.ts} />

				case "load_mcp_documentation":
					return (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								color: "var(--vscode-foreground)",
								opacity: 0.7,
								fontSize: 12,
								padding: "4px 0",
							}}>
							<i className="codicon codicon-book" style={{ marginRight: 6 }} />
							Loading MCP documentation
						</div>
					)

				case "completion_result": {
					return (
						<CompletionResult
							contentRef={contentRef}
							icon={icon}
							isLast={isLast}
							isPartial={message.partial}
							lastModifiedMessage={lastModifiedMessage}
							messageTs={message.ts}
							onMouseUp={onMouseUp}
							onQuoteClick={onQuoteClick}
							quoteButtonState={quoteButtonState}
							text={message.text || ""}
							title={title}
						/>
					)
				}

				case "shell_integration_warning":
					return (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								backgroundColor: "var(--vscode-textBlockQuote-background)",
								padding: 8,
								borderRadius: 3,
								fontSize: 12,
							}}>
							<div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
								<i
									className="codicon codicon-warning"
									style={{
										marginRight: 8,
										fontSize: 14,
										color: "var(--vscode-descriptionForeground)",
									}}
								/>
								<span style={{ fontWeight: 500, color: "var(--vscode-foreground)" }}>
									Shell Integration Unavailable
								</span>
							</div>
							<div style={{ color: "var(--vscode-foreground)", opacity: 0.8 }}>
								Cline may have trouble viewing the command's output. Please update VSCode (
								<code>CMD/CTRL + Shift + P</code> → "Update") and make sure you're using a supported shell: zsh,
								bash, fish, or PowerShell (<code>CMD/CTRL + Shift + P</code> → "Terminal: Select Default
								Profile").{" "}
								<a
									href="https://github.com/cline/cline/wiki/Troubleshooting-%E2%80%90-Shell-Integration-Unavailable"
									style={{ color: "inherit", textDecoration: "underline" }}>
									Still having trouble?
								</a>
							</div>
						</div>
					)

				case "task_progress":
					return null

				default:
					return (
						<>
							{title && (
								<div style={headerStyle}>
									{icon && icon}
									{title}
								</div>
							)}
							<div style={{ paddingTop: 10 }}>
								<Markdown markdown={message.text} />
							</div>
						</>
					)
			}
		}

		// Handle "ask" messages
		if (message.type === "ask") {
			switch (message.ask) {
				case "mistake_limit_reached":
					return <ErrorMessage errorType="mistake_limit_reached" message={message} />
				case "auto_approval_max_req_reached":
					return <ErrorMessage errorType="auto_approval_max_req_reached" message={message} />

				case "completion_result": {
					if (!message.text) {
						return null
					}

					return (
						<CompletionResult
							contentRef={contentRef}
							icon={icon}
							isLast={isLast}
							isPartial={message.partial}
							lastModifiedMessage={lastModifiedMessage}
							messageTs={message.ts}
							onMouseUp={onMouseUp}
							onQuoteClick={onQuoteClick}
							quoteButtonState={quoteButtonState}
							text={message.text}
							title={title}
						/>
					)
				}

				case "followup": {
					let question: string | undefined
					let options: string[] | undefined
					let selected: string | undefined
					try {
						const parsedMessage = JSON.parse(message.text || "{}") as ClineAskQuestion
						question = parsedMessage.question
						options = parsedMessage.options
						selected = parsedMessage.selected
					} catch {
						// Legacy messages pass question directly
						question = message.text
					}

					return (
						<>
							{title && (
								<div style={headerStyle}>
									{icon && icon}
									{title}
								</div>
							)}
							<WithCopyButton
								onMouseUp={onMouseUp}
								position="bottom-right"
								ref={contentRef}
								style={{ paddingTop: 10 }}
								textToCopy={question}>
								<Markdown markdown={question} />
								<OptionsButtons
									inputValue={inputValue}
									isActive={
										(isLast && lastModifiedMessage?.ask === "followup") ||
										(!selected && options && options.length > 0)
									}
									options={options}
									selected={selected}
								/>
								{quoteButtonState.visible && (
									<QuoteButton left={quoteButtonState.left} onClick={onQuoteClick} top={quoteButtonState.top} />
								)}
							</WithCopyButton>
						</>
					)
				}

				case "new_task":
					return (
						<>
							<MessageHeader icon={icon} showChevron={false} title={title} />
							<NewTaskPreview context={message.text || ""} />
						</>
					)

				case "condense":
					return (
						<>
							<MessageHeader icon={icon} showChevron={false} title={title} />
							<NewTaskPreview context={message.text || ""} />
						</>
					)

				case "report_bug":
					return (
						<>
							<MessageHeader icon={icon} showChevron={false} title={title} />
							<ReportBugPreview data={message.text || ""} />
						</>
					)

				case "plan_mode_respond": {
					let response: string | undefined
					let options: string[] | undefined
					let selected: string | undefined
					try {
						const parsedMessage = JSON.parse(message.text || "{}") as ClinePlanModeResponse
						response = parsedMessage.response
						options = parsedMessage.options
						selected = parsedMessage.selected
					} catch {
						// Legacy messages pass response directly
						response = message.text
					}
					return (
						<WithCopyButton onMouseUp={onMouseUp} position="bottom-right" ref={contentRef} textToCopy={response}>
							<Markdown markdown={response} />
							<OptionsButtons
								inputValue={inputValue}
								isActive={
									(isLast && lastModifiedMessage?.ask === "plan_mode_respond") ||
									(!selected && options && options.length > 0)
								}
								options={options}
								selected={selected}
							/>
							{quoteButtonState.visible && (
								<QuoteButton left={quoteButtonState.left} onClick={onQuoteClick} top={quoteButtonState.top} />
							)}
						</WithCopyButton>
					)
				}

				default:
					return null
			}
		}

		return null
	},
)

MessageContent.displayName = "MessageContent"
