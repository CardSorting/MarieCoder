import type { ClineAskUseMcpServer, ClineMessage } from "@shared/ExtensionMessage"
import type { McpServer } from "@shared/mcp"
import React from "react"
import CodeAccordian from "@/components/common/CodeAccordian"
import McpResourceRow from "@/components/mcp/configuration/tabs/installed/server-row/McpResourceRow"
import McpToolRow from "@/components/mcp/configuration/tabs/installed/server-row/McpToolRow"
import { findMatchingResourceOrTemplate } from "@/utils/mcp"

interface McpMessageRendererProps {
	message: ClineMessage
	mcpServer: McpServer | undefined
	icon: React.ReactNode
	title: React.ReactNode
}

/**
 * Renders MCP server interaction messages
 */
export const McpMessageRenderer: React.FC<McpMessageRendererProps> = ({ message, mcpServer, icon, title }) => {
	const useMcpServer = JSON.parse(message.text || "{}") as ClineAskUseMcpServer

	return (
		<>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "10px",
					marginBottom: "12px",
				}}>
				{icon && icon}
				{title && title}
			</div>

			<div
				style={{
					background: "var(--vscode-textCodeBlock-background)",
					borderRadius: "3px",
					padding: "8px 10px",
					marginTop: "8px",
				}}>
				{useMcpServer.type === "access_mcp_resource" && (
					<McpResourceRow
						item={{
							...(findMatchingResourceOrTemplate(
								useMcpServer.uri || "",
								mcpServer?.resources,
								mcpServer?.resourceTemplates,
							) || {
								name: "",
								mimeType: "",
								description: "",
							}),
							uri: useMcpServer.uri || "",
						}}
					/>
				)}

				{useMcpServer.type === "use_mcp_tool" && (
					<>
						<div onClick={(e) => e.stopPropagation()}>
							<McpToolRow
								serverName={useMcpServer.serverName}
								tool={{
									name: useMcpServer.toolName || "",
									description:
										mcpServer?.tools?.find((t) => t.name === useMcpServer.toolName)?.description || "",
									autoApprove:
										mcpServer?.tools?.find((t) => t.name === useMcpServer.toolName)?.autoApprove || false,
								}}
							/>
						</div>
						{useMcpServer.arguments && useMcpServer.arguments !== "{}" && (
							<div style={{ marginTop: "8px" }}>
								<div
									style={{
										marginBottom: "4px",
										opacity: 0.8,
										fontSize: "12px",
										textTransform: "uppercase",
									}}>
									Arguments
								</div>
								<CodeAccordian
									code={useMcpServer.arguments}
									isExpanded={true}
									language="json"
									onToggleExpand={() => {
										// No-op: always expanded
									}}
								/>
							</div>
						)}
					</>
				)}
			</div>
		</>
	)
}
