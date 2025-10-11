import type {
	ClineAskQuestion,
	ClineAskUseMcpServer,
	ClineMessage,
	ClinePlanModeResponse,
	ClineSayTool,
} from "@shared/ExtensionMessage"
import { COMPLETION_RESULT_CHANGES_FLAG } from "@shared/ExtensionMessage"
import { Int64Request } from "@shared/proto/cline/common"
import { VSCodeBadge } from "@vscode/webview-ui-toolkit/react"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { ErrorBlockTitle } from "@/components/chat/ErrorBlockTitle"
import ErrorRow from "@/components/chat/ErrorRow"
import NewTaskPreview from "@/components/chat/NewTaskPreview"
import { OptionsButtons } from "@/components/chat/OptionsButtons"
import QuoteButton from "@/components/chat/QuoteButton"
import ReportBugPreview from "@/components/chat/ReportBugPreview"
import TaskFeedbackButtons from "@/components/chat/TaskFeedbackButtons"
import UserMessage from "@/components/chat/UserMessage"
import { Button } from "@/components/common/Button"
import { CheckmarkControl } from "@/components/common/CheckmarkControl"
import CodeAccordian from "@/components/common/CodeAccordian"
import { WithCopyButton } from "@/components/common/CopyButton"
import McpResponseDisplay from "@/components/mcp/chat-display/McpResponseDisplay"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { TaskServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { getMcpServerDisplayName } from "@/utils/mcp"
import { Markdown } from "./components/Markdown"
import { ProgressIndicator } from "./components/ProgressIndicator"
import { useMessageState } from "./hooks/use_message_state"
import { useQuoteSelection } from "./hooks/use_quote_selection"
import { CommandMessageRenderer } from "./message_types/command_message_renderer"
import { McpMessageRenderer } from "./message_types/mcp_message_renderer"
import { ToolMessageRenderer } from "./message_types/tool_message_renderer"
import { errorColor, headerStyle, normalColor, successColor } from "./utils/style_constants"

interface ChatRowContentProps {
	message: ClineMessage
	isExpanded: boolean
	onToggleExpand: (ts: number) => void
	lastModifiedMessage?: ClineMessage
	isLast: boolean
	inputValue?: string
	sendMessageFromChatRow?: (text: string, images: string[], files: string[]) => void
	onSetQuote: (text: string) => void
}

/**
 * Main content renderer for chat messages
 * Dispatches to specific renderers based on message type
 */
export const ChatRowContent = memo(
	({
		message,
		isExpanded,
		onToggleExpand,
		lastModifiedMessage,
		isLast,
		inputValue,
		sendMessageFromChatRow,
		onSetQuote,
	}: ChatRowContentProps) => {
		const { mcpServers, mcpMarketplaceCatalog, onRelinquishControl } = useExtensionState()
		const [seeNewChangesDisabled, setSeeNewChangesDisabled] = useState(false)
		const { quoteButtonState, contentRef, handleQuoteClick, handleMouseUp } = useQuoteSelection(onSetQuote)
		const {
			cost,
			apiReqCancelReason,
			apiReqStreamingFailedMessage,
			retryStatus,
			apiRequestFailedMessage,
			isCommandExecuting,
			isMcpServerResponding,
		} = useMessageState(message, lastModifiedMessage, isLast)

		const type = message.type === "ask" ? message.ask : message.say

		const handleToggle = useCallback(() => {
			onToggleExpand(message.ts)
		}, [onToggleExpand, message.ts])

		useEffect(() => {
			return onRelinquishControl(() => {
				setSeeNewChangesDisabled(false)
			})
		}, [onRelinquishControl])

		// Header icon and title
		const [icon, title] = useMemo(() => {
			switch (type) {
				case "error":
					return [
						<span className="codicon codicon-error" style={{ color: errorColor, marginBottom: "-1.5px" }}></span>,
						<span style={{ color: errorColor, fontWeight: "bold" }}>Error</span>,
					]
				case "mistake_limit_reached":
					return [
						<span className="codicon codicon-error" style={{ color: errorColor, marginBottom: "-1.5px" }}></span>,
						<span style={{ color: errorColor, fontWeight: "bold" }}>Marie is having trouble...</span>,
					]
				case "auto_approval_max_req_reached":
					return [
						<span className="codicon codicon-warning" style={{ color: errorColor, marginBottom: "-1.5px" }}></span>,
						<span style={{ color: errorColor, fontWeight: "bold" }}>Maximum Requests Reached</span>,
					]
				case "command":
					return [
						isCommandExecuting ? (
							<ProgressIndicator />
						) : (
							<span
								className="codicon codicon-terminal"
								style={{ color: normalColor, marginBottom: "-1.5px" }}></span>
						),
						<span style={{ color: normalColor, fontWeight: "bold" }}>Marie wants to execute this command:</span>,
					]
				case "use_mcp_server": {
					const mcpServerUse = JSON.parse(message.text || "{}") as ClineAskUseMcpServer
					return [
						isMcpServerResponding ? (
							<ProgressIndicator />
						) : (
							<span
								className="codicon codicon-server"
								style={{ color: normalColor, marginBottom: "-1.5px" }}></span>
						),
						<span
							className="ph-no-capture"
							style={{ color: normalColor, fontWeight: "bold", wordBreak: "break-word" }}>
							Marie wants to {mcpServerUse.type === "use_mcp_tool" ? "use a tool" : "access a resource"} on the{" "}
							<code style={{ wordBreak: "break-all" }}>
								{getMcpServerDisplayName(mcpServerUse.serverName, mcpMarketplaceCatalog)}
							</code>{" "}
							MCP server:
						</span>,
					]
				}
				case "completion_result":
					return [
						<span className="codicon codicon-check" style={{ color: successColor, marginBottom: "-1.5px" }}></span>,
						<span style={{ color: successColor, fontWeight: "bold" }}>Task Completed</span>,
					]
				case "api_req_started":
					return ErrorBlockTitle({
						cost,
						apiReqCancelReason,
						apiRequestFailedMessage,
						retryStatus,
					})
				case "followup":
					return [
						<span className="codicon codicon-question" style={{ color: normalColor, marginBottom: "-1.5px" }}></span>,
						<span style={{ color: normalColor, fontWeight: "bold" }}>Marie has a question:</span>,
					]
				default:
					return [null, null]
			}
		}, [
			type,
			cost,
			apiRequestFailedMessage,
			isCommandExecuting,
			apiReqCancelReason,
			isMcpServerResponding,
			message.text,
			mcpMarketplaceCatalog,
			retryStatus,
		])

		const tool = useMemo(() => {
			if (message.ask === "tool" || message.say === "tool") {
				return JSON.parse(message.text || "{}") as ClineSayTool
			}
			return null
		}, [message.ask, message.say, message.text])

		// Tool messages
		if (tool) {
			return <ToolMessageRenderer isExpanded={isExpanded} message={message} onToggleExpand={handleToggle} tool={tool} />
		}

		// Command messages
		if (message.ask === "command" || message.say === "command") {
			return (
				<CommandMessageRenderer
					icon={icon}
					isExpanded={isExpanded}
					messageText={message.text || ""}
					onToggleExpand={handleToggle}
					title={title}
				/>
			)
		}

		// MCP server messages
		if (message.ask === "use_mcp_server" || message.say === "use_mcp_server") {
			const useMcpServer = JSON.parse(message.text || "{}") as ClineAskUseMcpServer
			const mcpServer = mcpServers.find((server) => server.name === useMcpServer.serverName)
			return <McpMessageRenderer icon={icon} mcpServer={mcpServer} message={message} title={title} />
		}

		// Say messages
		if (message.type === "say") {
			switch (message.say) {
				case "api_req_started":
					return (
						<>
							<div
								onClick={handleToggle}
								style={{
									...headerStyle,
									marginBottom:
										(cost == null && apiRequestFailedMessage) || apiReqStreamingFailedMessage ? 10 : 0,
									justifyContent: "space-between",
									cursor: "pointer",
									userSelect: "none",
									WebkitUserSelect: "none",
									MozUserSelect: "none",
									msUserSelect: "none",
								}}>
								<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
									{icon}
									{title}
									<VSCodeBadge style={{ opacity: cost != null && cost > 0 ? 1 : 0 }}>
										${Number(cost || 0)?.toFixed(4)}
									</VSCodeBadge>
								</div>
								<span className={`codicon codicon-chevron-${isExpanded ? "up" : "down"}`}></span>
							</div>
							{((cost == null && apiRequestFailedMessage) || apiReqStreamingFailedMessage) && (
								<ErrorRow
									apiReqStreamingFailedMessage={apiReqStreamingFailedMessage}
									apiRequestFailedMessage={apiRequestFailedMessage}
									errorType="error"
									message={message}
								/>
							)}
							{isExpanded && (
								<div style={{ marginTop: "10px" }}>
									<CodeAccordian
										code={JSON.parse(message.text || "{}").request}
										isExpanded={true}
										language="markdown"
										onToggleExpand={handleToggle}
									/>
								</div>
							)}
						</>
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
						<WithCopyButton
							onMouseUp={handleMouseUp}
							position="bottom-right"
							ref={contentRef}
							textToCopy={message.text}>
							<Markdown markdown={message.text} />
							{quoteButtonState.visible && (
								<QuoteButton left={quoteButtonState.left} onClick={handleQuoteClick} top={quoteButtonState.top} />
							)}
						</WithCopyButton>
					)

				case "reasoning":
					return (
						<>
							{message.text && (
								<div
									onClick={handleToggle}
									style={{
										cursor: "pointer",
										color: "var(--vscode-descriptionForeground)",
										fontStyle: "italic",
										overflow: "hidden",
									}}>
									{isExpanded ? (
										<div style={{ marginTop: -3 }}>
											<span style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>
												Thinking
												<span
													className="codicon codicon-chevron-down"
													style={{
														display: "inline-block",
														transform: "translateY(3px)",
														marginLeft: "1.5px",
													}}
												/>
											</span>
											<span className="ph-no-capture">{message.text}</span>
										</div>
									) : (
										<div style={{ display: "flex", alignItems: "center" }}>
											<span style={{ fontWeight: "bold", marginRight: "4px" }}>Thinking:</span>
											<span
												className="ph-no-capture"
												style={{
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
													direction: "rtl",
													textAlign: "left",
													flex: 1,
												}}>
												{message.text + "\u200E"}
											</span>
											<span
												className="codicon codicon-chevron-right"
												style={{ marginLeft: "4px", flexShrink: 0 }}
											/>
										</div>
									)}
								</div>
							)}
						</>
					)

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
								onToggleExpand={handleToggle}
							/>
						</div>
					)
				}

				case "error":
					return <ErrorRow errorType="error" message={message} />
				case "diff_error":
					return <ErrorRow errorType="diff_error" message={message} />
				case "clineignore_error":
					return <ErrorRow errorType="clineignore_error" message={message} />

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
					const hasChanges = message.text?.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false
					const text = hasChanges ? message.text?.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length) : message.text
					return (
						<>
							<div style={{ ...headerStyle, marginBottom: "10px" }}>
								{icon}
								{title}
							</div>
							<WithCopyButton
								onMouseUp={handleMouseUp}
								position="bottom-right"
								ref={contentRef}
								style={{ color: "var(--vscode-charts-green)", paddingTop: 10 }}
								textToCopy={text}>
								<Markdown markdown={text} />
								{quoteButtonState.visible && (
									<QuoteButton
										left={quoteButtonState.left}
										onClick={handleQuoteClick}
										top={quoteButtonState.top}
									/>
								)}
							</WithCopyButton>
							{message.partial !== true && hasChanges && (
								<div style={{ paddingTop: 17 }}>
									<Button
										disabled={seeNewChangesDisabled}
										icon={<i className="codicon codicon-new-file" />}
										onClick={() => {
											setSeeNewChangesDisabled(true)
											TaskServiceClient.taskCompletionViewChanges(
												Int64Request.create({ value: message.ts }),
											).catch((err) => debug.error("Failed to show task completion view changes:", err))
										}}
										style={{ cursor: seeNewChangesDisabled ? "wait" : "pointer", width: "100%" }}
										variant="success">
										See new changes
									</Button>
								</div>
							)}
						</>
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
									}}></i>
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
									{icon}
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

		// Ask messages
		if (message.type === "ask") {
			switch (message.ask) {
				case "mistake_limit_reached":
					return <ErrorRow errorType="mistake_limit_reached" message={message} />
				case "auto_approval_max_req_reached":
					return <ErrorRow errorType="auto_approval_max_req_reached" message={message} />

				case "completion_result": {
					if (!message.text) {
						return null
					}

					const hasChanges = message.text.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false
					const text = hasChanges ? message.text.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length) : message.text
					return (
						<div>
							<div style={{ ...headerStyle, marginBottom: "10px" }}>
								{icon}
								{title}
								<TaskFeedbackButtons
									isFromHistory={
										!isLast ||
										lastModifiedMessage?.ask === "resume_completed_task" ||
										lastModifiedMessage?.ask === "resume_task"
									}
									messageTs={message.ts}
									style={{ marginLeft: "auto" }}
								/>
							</div>
							<WithCopyButton
								onMouseUp={handleMouseUp}
								position="bottom-right"
								ref={contentRef}
								style={{ color: "var(--vscode-charts-green)", paddingTop: 10 }}
								textToCopy={text}>
								<Markdown markdown={text} />
								{quoteButtonState.visible && (
									<QuoteButton
										left={quoteButtonState.left}
										onClick={handleQuoteClick}
										top={quoteButtonState.top}
									/>
								)}
							</WithCopyButton>
							{message.partial !== true && hasChanges && (
								<div style={{ marginTop: 15 }}>
									<Button
										disabled={seeNewChangesDisabled}
										icon={<i className="codicon codicon-new-file" />}
										onClick={() => {
											setSeeNewChangesDisabled(true)
											TaskServiceClient.taskCompletionViewChanges(
												Int64Request.create({ value: message.ts }),
											).catch((err) => debug.error("Failed to show task completion view changes:", err))
										}}
										style={{ cursor: seeNewChangesDisabled ? "wait" : "pointer" }}
										variant="success">
										See new changes
									</Button>
								</div>
							)}
						</div>
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
									{icon}
									{title}
								</div>
							)}
							<WithCopyButton
								onMouseUp={handleMouseUp}
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
									<QuoteButton
										left={quoteButtonState.left}
										onClick={handleQuoteClick}
										top={quoteButtonState.top}
									/>
								)}
							</WithCopyButton>
						</>
					)
				}

				case "new_task":
					return (
						<>
							<div style={headerStyle}>
								<span
									className="codicon codicon-new-file"
									style={{ color: normalColor, marginBottom: "-1.5px" }}></span>
								<span style={{ color: normalColor, fontWeight: "bold" }}>Marie wants to start a new task:</span>
							</div>
							<NewTaskPreview context={message.text || ""} />
						</>
					)

				case "condense":
					return (
						<>
							<div style={headerStyle}>
								<span
									className="codicon codicon-new-file"
									style={{ color: normalColor, marginBottom: "-1.5px" }}></span>
								<span style={{ color: normalColor, fontWeight: "bold" }}>
									Marie wants to condense your conversation:
								</span>
							</div>
							<NewTaskPreview context={message.text || ""} />
						</>
					)

				case "report_bug":
					return (
						<>
							<div style={headerStyle}>
								<span
									className="codicon codicon-new-file"
									style={{ color: normalColor, marginBottom: "-1.5px" }}></span>
								<span style={{ color: normalColor, fontWeight: "bold" }}>
									Marie wants to create a Github issue:
								</span>
							</div>
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
						<WithCopyButton onMouseUp={handleMouseUp} position="bottom-right" ref={contentRef} textToCopy={response}>
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
								<QuoteButton left={quoteButtonState.left} onClick={handleQuoteClick} top={quoteButtonState.top} />
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
