import type { ClineAskUseMcpServer, ClineMessage, ClineSayTool } from "@shared/ExtensionMessage"
import { memo, useCallback } from "react"
import QuoteButton from "@/components/chat/QuoteButton"
import { useMcpState } from "@/context/McpContext"
import { MessageContent } from "./components/MessageContent"
import { useMessageHeader } from "./hooks/use_message_header"
import { useMessageState } from "./hooks/use_message_state"
import { useQuoteSelection } from "./hooks/use_quote_selection"
import { CommandMessageRenderer } from "./message_types/command_message_renderer"
import { McpMessageRenderer } from "./message_types/mcp_message_renderer"
import { ToolMessageRenderer } from "./message_types/tool_message_renderer"

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
 * Refactored to use specialized components and hooks
 *
 * Architecture:
 * - useMessageHeader: Determines icon/title based on message type
 * - useMessageState: Extracts state from message (cost, status, etc.)
 * - useQuoteSelection: Handles text selection for quoting
 * - Specialized renderers: Tool, Command, MCP (return complete components)
 * - MessageContent: Routes all other message types to appropriate renderers
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
		const { mcpServers, mcpMarketplaceCatalog } = useMcpState()

		// Quote selection hook
		const { quoteButtonState, contentRef, handleQuoteClick, handleMouseUp } = useQuoteSelection(onSetQuote)

		// Message state hook
		const {
			cost,
			apiReqCancelReason,
			apiReqStreamingFailedMessage,
			retryStatus,
			apiRequestFailedMessage,
			isCommandExecuting,
			isMcpServerResponding,
		} = useMessageState(message, lastModifiedMessage, isLast)

		// Message header hook
		const headerConfig = useMessageHeader(
			message,
			!!isCommandExecuting,
			!!isMcpServerResponding,
			cost || 0,
			apiReqCancelReason,
			apiRequestFailedMessage,
			retryStatus,
			mcpMarketplaceCatalog,
		)

		// Toggle handler
		const handleToggle = useCallback(() => {
			onToggleExpand(message.ts)
		}, [onToggleExpand, message.ts])

		// Check if message is a tool message
		const tool = message.ask === "tool" || message.say === "tool" ? (JSON.parse(message.text || "{}") as ClineSayTool) : null

		// Tool messages - use dedicated renderer (returns complete component)
		if (tool) {
			return <ToolMessageRenderer isExpanded={!!isExpanded} message={message} onToggleExpand={handleToggle} tool={tool} />
		}

		// Command messages - use dedicated renderer (returns complete component)
		if (message.ask === "command" || message.say === "command") {
			return (
				<CommandMessageRenderer
					icon={headerConfig.icon}
					isExpanded={isExpanded}
					messageText={message.text || ""}
					onToggleExpand={handleToggle}
					title={headerConfig.title}
				/>
			)
		}

		// MCP server messages - use dedicated renderer (returns complete component)
		if (message.ask === "use_mcp_server" || message.say === "use_mcp_server") {
			const useMcpServer = JSON.parse(message.text || "{}") as ClineAskUseMcpServer
			const mcpServer = mcpServers.find((server) => server.name === useMcpServer.serverName)
			return (
				<McpMessageRenderer icon={headerConfig.icon} mcpServer={mcpServer} message={message} title={headerConfig.title} />
			)
		}

		// All other messages - route through MessageContent
		return (
			<div onMouseUp={(e) => handleMouseUp(e as any)} style={{ position: "relative" }}>
				{/* Quote button */}
				{quoteButtonState.visible && (
					<QuoteButton left={quoteButtonState.left} onClick={handleQuoteClick} top={quoteButtonState.top} />
				)}

				{/* Message content router */}
				<MessageContent
					apiReqCancelReason={apiReqCancelReason}
					apiReqStreamingFailedMessage={apiReqStreamingFailedMessage}
					apiRequestFailedMessage={apiRequestFailedMessage}
					contentRef={contentRef}
					icon={headerConfig.icon}
					inputValue={inputValue}
					isExpanded={isExpanded}
					isLast={isLast}
					lastModifiedMessage={lastModifiedMessage}
					message={message}
					onMouseUp={(e: React.MouseEvent<Element>) => handleMouseUp(e as any)}
					onQuoteClick={handleQuoteClick}
					onToggle={handleToggle}
					quoteButtonState={quoteButtonState}
					retryStatus={retryStatus}
					sendMessageFromChatRow={sendMessageFromChatRow}
					title={headerConfig.title}
				/>
			</div>
		)
	},
)

ChatRowContent.displayName = "ChatRowContent"
