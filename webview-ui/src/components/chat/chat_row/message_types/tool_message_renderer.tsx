import type { ClineMessage, ClineSayTool } from "@shared/ExtensionMessage"
import { StringRequest } from "@shared/proto/cline/common"
import React from "react"
import SearchResultsDisplay from "@/components/chat/SearchResultsDisplay"
import CodeAccordian, { cleanPathPrefix } from "@/components/common/CodeAccordian"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { FileServiceClient, UiServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { ToolIcon } from "../components/ToolIcon"
import { isImageFile } from "../utils/file_type_utils"
import { headerStyle, normalColor } from "../utils/style_constants"

interface ToolMessageRendererProps {
	tool: ClineSayTool
	message: ClineMessage
	isExpanded: boolean
	onToggleExpand: () => void
}

/**
 * Renders tool-specific messages (file operations, searches, etc.)
 */
export const ToolMessageRenderer: React.FC<ToolMessageRendererProps> = ({ tool, message, isExpanded, onToggleExpand }) => {
	switch (tool.tool) {
		case "editedExistingFile":
			return (
				<>
					<div style={headerStyle}>
						<ToolIcon name="edit" />
						{tool.operationIsLocatedInWorkspace === false && (
							<ToolIcon
								color="yellow"
								name="sign-out"
								rotation={-90}
								title="This file is outside of your workspace"
							/>
						)}
						<span style={{ fontWeight: "bold" }}>Marie wants to edit this file:</span>
					</div>
					<CodeAccordian
						code={tool.content}
						isExpanded={isExpanded}
						onToggleExpand={onToggleExpand}
						path={tool.path!}
					/>
				</>
			)

		case "newFileCreated":
			return (
				<>
					<div style={headerStyle}>
						<ToolIcon name="new-file" />
						{tool.operationIsLocatedInWorkspace === false && (
							<ToolIcon
								color="yellow"
								name="sign-out"
								rotation={-90}
								title="This file is outside of your workspace"
							/>
						)}
						<span style={{ fontWeight: "bold" }}>Marie wants to create a new file:</span>
					</div>
					<CodeAccordian
						code={tool.content!}
						isExpanded={isExpanded}
						isLoading={message.partial}
						onToggleExpand={onToggleExpand}
						path={tool.path!}
					/>
				</>
			)

		case "readFile": {
			const isImage = isImageFile(tool.path || "")
			return (
				<>
					<div style={headerStyle}>
						<ToolIcon name={isImage ? "file-media" : "file-code"} />
						{tool.operationIsLocatedInWorkspace === false && (
							<ToolIcon
								color="yellow"
								name="sign-out"
								rotation={-90}
								title="This file is outside of your workspace"
							/>
						)}
						<span style={{ fontWeight: "bold" }}>Marie wants to read this file:</span>
					</div>
					<div
						style={{
							borderRadius: 3,
							backgroundColor: CODE_BLOCK_BG_COLOR,
							overflow: "hidden",
							border: "1px solid var(--vscode-editorGroup-border)",
						}}>
						<div
							onClick={
								isImage
									? undefined
									: () => {
											FileServiceClient.openFile(StringRequest.create({ value: tool.content })).catch(
												(err) => debug.error("Failed to open file:", err),
											)
										}
							}
							style={{
								color: "var(--vscode-descriptionForeground)",
								display: "flex",
								alignItems: "center",
								padding: "9px 10px",
								cursor: isImage ? "default" : "pointer",
								userSelect: isImage ? "text" : "none",
								WebkitUserSelect: isImage ? "text" : "none",
								MozUserSelect: isImage ? "text" : "none",
								msUserSelect: isImage ? "text" : "none",
							}}>
							{tool.path?.startsWith(".") && <span>.</span>}
							{tool.path && !tool.path.startsWith(".") && <span>/</span>}
							<span
								className="ph-no-capture"
								style={{
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
									marginRight: "8px",
									direction: "rtl",
									textAlign: "left",
								}}>
								{cleanPathPrefix(tool.path ?? "") + "\u200E"}
							</span>
							<div style={{ flexGrow: 1 }}></div>
							{!isImage && (
								<span
									className={`codicon codicon-link-external`}
									style={{
										fontSize: 13.5,
										margin: "1px 0",
									}}></span>
							)}
						</div>
					</div>
				</>
			)
		}

		case "listFilesTopLevel":
			return (
				<>
					<div style={headerStyle}>
						<ToolIcon name="folder-opened" />
						{tool.operationIsLocatedInWorkspace === false && (
							<ToolIcon color="yellow" name="sign-out" rotation={-90} title="This is outside of your workspace" />
						)}
						<span style={{ fontWeight: "bold" }}>
							{message.type === "ask"
								? "Marie wants to view the top level files in this directory:"
								: "Marie viewed the top level files in this directory:"}
						</span>
					</div>
					<CodeAccordian
						code={tool.content!}
						isExpanded={isExpanded}
						language="shell-session"
						onToggleExpand={onToggleExpand}
						path={tool.path!}
					/>
				</>
			)

		case "listFilesRecursive":
			return (
				<>
					<div style={headerStyle}>
						<ToolIcon name="folder-opened" />
						{tool.operationIsLocatedInWorkspace === false && (
							<ToolIcon color="yellow" name="sign-out" rotation={-90} title="This is outside of your workspace" />
						)}
						<span style={{ fontWeight: "bold" }}>
							{message.type === "ask"
								? "Marie wants to recursively view all files in this directory:"
								: "Marie recursively viewed all files in this directory:"}
						</span>
					</div>
					<CodeAccordian
						code={tool.content!}
						isExpanded={isExpanded}
						language="shell-session"
						onToggleExpand={onToggleExpand}
						path={tool.path!}
					/>
				</>
			)

		case "listCodeDefinitionNames":
			return (
				<>
					<div style={headerStyle}>
						<ToolIcon name="file-code" />
						{tool.operationIsLocatedInWorkspace === false && (
							<ToolIcon
								color="yellow"
								name="sign-out"
								rotation={-90}
								title="This file is outside of your workspace"
							/>
						)}
						<span style={{ fontWeight: "bold" }}>
							{message.type === "ask"
								? "Marie wants to view source code definition names used in this directory:"
								: "Marie viewed source code definition names used in this directory:"}
						</span>
					</div>
					<CodeAccordian
						code={tool.content!}
						isExpanded={isExpanded}
						onToggleExpand={onToggleExpand}
						path={tool.path!}
					/>
				</>
			)

		case "searchFiles":
			return (
				<>
					<div style={headerStyle}>
						<ToolIcon name="search" />
						{tool.operationIsLocatedInWorkspace === false && (
							<ToolIcon color="yellow" name="sign-out" rotation={-90} title="This is outside of your workspace" />
						)}
						<span style={{ fontWeight: "bold" }}>
							Marie wants to search this directory for <code style={{ wordBreak: "break-all" }}>{tool.regex}</code>:
						</span>
					</div>
					<SearchResultsDisplay
						content={tool.content!}
						filePattern={tool.filePattern}
						isExpanded={isExpanded}
						onToggleExpand={onToggleExpand}
						path={tool.path!}
					/>
				</>
			)

		case "summarizeTask":
			return (
				<>
					<div style={headerStyle}>
						<ToolIcon name="book" />
						<span style={{ fontWeight: "bold" }}>Marie is condensing the conversation:</span>
					</div>
					<div
						style={{
							borderRadius: 3,
							backgroundColor: CODE_BLOCK_BG_COLOR,
							overflow: "hidden",
							border: "1px solid var(--vscode-editorGroup-border)",
						}}>
						<div
							onClick={onToggleExpand}
							style={{
								color: "var(--vscode-descriptionForeground)",
								padding: "9px 10px",
								cursor: "pointer",
								userSelect: "none",
								WebkitUserSelect: "none",
								MozUserSelect: "none",
								msUserSelect: "none",
							}}>
							{isExpanded ? (
								<div>
									<div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
										<span style={{ fontWeight: "bold", marginRight: "4px" }}>Summary:</span>
										<div style={{ flexGrow: 1 }}></div>
										<span
											className="codicon codicon-chevron-up"
											style={{
												fontSize: 13.5,
												margin: "1px 0",
											}}></span>
									</div>
									<span
										className="ph-no-capture"
										style={{
											whiteSpace: "pre-wrap",
											wordBreak: "break-word",
											overflowWrap: "anywhere",
										}}>
										{tool.content}
									</span>
								</div>
							) : (
								<div style={{ display: "flex", alignItems: "center" }}>
									<span
										className="ph-no-capture"
										style={{
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
											marginRight: "8px",
											direction: "rtl",
											textAlign: "left",
											flex: 1,
										}}>
										{tool.content + "\u200E"}
									</span>
									<span
										className="codicon codicon-chevron-down"
										style={{
											fontSize: 13.5,
											margin: "1px 0",
											flexShrink: 0,
										}}></span>
								</div>
							)}
						</div>
					</div>
				</>
			)

		case "webFetch":
			return (
				<>
					<div style={headerStyle}>
						<span className="codicon codicon-link" style={{ color: normalColor, marginBottom: "-1.5px" }}></span>
						{tool.operationIsLocatedInWorkspace === false && (
							<ToolIcon color="yellow" name="sign-out" rotation={-90} title="This URL is external" />
						)}
						<span style={{ fontWeight: "bold" }}>
							{message.type === "ask"
								? "Marie wants to fetch content from this URL:"
								: "Marie fetched content from this URL:"}
						</span>
					</div>
					<div
						onClick={() => {
							if (tool.path) {
								UiServiceClient.openUrl(StringRequest.create({ value: tool.path })).catch((err) => {
									debug.error("Failed to open URL:", err)
								})
							}
						}}
						style={{
							borderRadius: 3,
							backgroundColor: CODE_BLOCK_BG_COLOR,
							overflow: "hidden",
							border: "1px solid var(--vscode-editorGroup-border)",
							padding: "9px 10px",
							cursor: "pointer",
							userSelect: "none",
							WebkitUserSelect: "none",
							MozUserSelect: "none",
							msUserSelect: "none",
						}}>
						<span
							className="ph-no-capture"
							style={{
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								marginRight: "8px",
								direction: "rtl",
								textAlign: "left",
								color: "var(--vscode-textLink-foreground)",
								textDecoration: "underline",
							}}>
							{tool.path + "\u200E"}
						</span>
					</div>
				</>
			)

		default:
			return null
	}
}
