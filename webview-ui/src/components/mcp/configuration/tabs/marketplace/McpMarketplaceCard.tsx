import { McpMarketplaceItem, McpServer } from "@shared/mcp"
import { StringRequest } from "@shared/proto/cline/common"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { McpServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"

interface McpMarketplaceCardProps {
	item: McpMarketplaceItem
	installedServers: McpServer[]
	setError: (error: string | null) => void
}

const McpMarketplaceCardComponent = ({ item, installedServers, setError }: McpMarketplaceCardProps) => {
	const isInstalled = installedServers.some((server) => server.name === item.mcpId)
	const [isDownloading, setIsDownloading] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const githubLinkRef = useRef<HTMLDivElement>(null)
	const { onRelinquishControl } = useExtensionState()

	useEffect(() => {
		return onRelinquishControl(() => {
			setIsLoading(false)
		})
	}, [onRelinquishControl])

	const githubAuthorUrl = useMemo(() => {
		const url = new URL(item.githubUrl)
		const pathParts = url.pathname.split("/")
		if (pathParts.length >= 2) {
			return `${url.origin}/${pathParts[1]}`
		}
		return item.githubUrl
	}, [item.githubUrl])

	return (
		<>
			<style>
				{`
					.mcp-card {
						cursor: pointer;
						outline: none !important;
					}
					.mcp-card:hover {
						background-color: var(--vscode-list-hoverBackground);
					}
					.mcp-card:focus {
						outline: none !important;
					}
				`}
			</style>
			<a
				className="mcp-card"
				href={item.githubUrl}
				style={{
					padding: "14px 16px",
					display: "flex",
					flexDirection: "column",
					gap: 12,
					cursor: isLoading ? "wait" : "pointer",
					textDecoration: "none",
					color: "inherit",
				}}>
				{/* Main container with logo and content */}
				<div style={{ display: "flex", gap: "12px" }}>
					{/* Logo */}
					{item.logoUrl && (
						<img
							alt={`${item.name} logo`}
							src={item.logoUrl}
							style={{
								width: 42,
								height: 42,
								borderRadius: 4,
							}}
						/>
					)}

					{/* Content section */}
					<div
						style={{
							flex: 1,
							minWidth: 0,
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-between",
						}}>
						{/* First row: name and install button */}
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								gap: "16px",
							}}>
							<h3
								style={{
									margin: 0,
									fontSize: "13px",
									fontWeight: 600,
								}}>
								{item.name}
							</h3>
							<div
								onClick={async (e) => {
									e.preventDefault() // Prevent card click when clicking install
									e.stopPropagation() // Stop event from bubbling up to parent link
									if (!isInstalled && !isDownloading) {
										setIsDownloading(true)
										try {
											const response = await McpServiceClient.downloadMcp(
												StringRequest.create({ value: item.mcpId }),
											)
											if (response.error) {
												debug.error("MCP download failed:", response.error)
												setError(response.error)
											} else {
												debug.log("MCP download successful:", response)
												// Clear any previous errors on success
												setError(null)
											}
										} catch (error) {
											debug.error("Failed to download MCP:", error)
										} finally {
											setIsDownloading(false)
										}
									}
								}}
								style={{}}>
								<button
									className={`text-xs font-medium py-0.5 px-1.5 rounded-[2px] border-none cursor-pointer text-[var(--vscode-button-foreground)]
										${isInstalled ? "bg-[var(--vscode-button-secondaryBackground)] hover:enabled:bg-[var(--vscode-button-secondaryHoverBackground)]" : "bg-[var(--vscode-button-background)] hover:enabled:bg-[var(--vscode-button-hoverBackground)]"}
										active:enabled:opacity-70 disabled:opacity-50 disabled:cursor-default`}
									disabled={isInstalled || isDownloading}>
									{isInstalled ? "Installed" : isDownloading ? "Installing..." : "Install"}
								</button>
							</div>
						</div>

						{/* Second row: metadata */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								fontSize: "12px",
								color: "var(--vscode-descriptionForeground)",
								flexWrap: "wrap",
								minWidth: 0,
								rowGap: 0,
							}}>
							<a
								className="github-link"
								href={githubAuthorUrl}
								onMouseEnter={(e) => {
									e.currentTarget.style.opacity = "1"
									e.currentTarget.style.color = "var(--link-active-foreground)"
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.opacity = "0.7"
									e.currentTarget.style.color = "var(--vscode-foreground)"
								}}
								style={{
									display: "flex",
									alignItems: "center",
									color: "var(--vscode-foreground)",
									minWidth: 0,
									opacity: 0.7,
									textDecoration: "none",
									border: "none !important",
								}}>
								<div ref={githubLinkRef} style={{ display: "flex", gap: "4px", alignItems: "center" }}>
									<span className="codicon codicon-github" style={{ fontSize: "14px" }} />
									<span
										style={{
											overflow: "hidden",
											textOverflow: "ellipsis",
											wordBreak: "break-all",
											minWidth: 0,
										}}>
										{item.author}
									</span>
								</div>
							</a>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "4px",
									minWidth: 0,
									flexShrink: 0,
								}}>
								<span className="codicon codicon-star-full" />
								<span style={{ wordBreak: "break-all" }}>{item.githubStars?.toLocaleString() ?? 0}</span>
							</div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "4px",
									minWidth: 0,
									flexShrink: 0,
								}}>
								<span className="codicon codicon-cloud-download" />
								<span style={{ wordBreak: "break-all" }}>{item.downloadCount?.toLocaleString() ?? 0}</span>
							</div>
							{item.requiresApiKey && (
								<span className="codicon codicon-key" style={{ flexShrink: 0 }} title="Requires API key" />
							)}
						</div>
					</div>
				</div>

				{/* Description and tags */}
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					{/* {!item.isRecommended && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "4px",
								fontSize: "12px",
								color: "var(--vscode-notificationsWarningIcon-foreground)",
								marginTop: -3,
								marginBottom: -3,
							}}>
							<span className="codicon codicon-warning" style={{ fontSize: "14px" }} />
							<span>Community Made (use at your own risk)</span>
						</div>
					)} */}

					<p style={{ fontSize: "13px", margin: 0 }}>{item.description}</p>
					<div
						onScroll={(e) => {
							const target = e.currentTarget
							const gradient = target.querySelector(".tags-gradient") as HTMLElement
							if (gradient) {
								gradient.style.visibility = target.scrollLeft > 0 ? "hidden" : "visible"
							}
						}}
						style={{
							display: "flex",
							gap: "6px",
							flexWrap: "nowrap",
							overflowX: "auto",
							scrollbarWidth: "none",
							position: "relative",
						}}>
						<span
							style={{
								fontSize: "10px",
								padding: "1px 4px",
								borderRadius: "3px",
								border: "1px solid color-mix(in srgb, var(--vscode-descriptionForeground) 50%, transparent)",
								color: "var(--vscode-descriptionForeground)",
								whiteSpace: "nowrap",
							}}>
							{item.category}
						</span>
						{item.tags.map((tag, index) => (
							<span
								key={tag}
								style={{
									fontSize: "10px",
									padding: "1px 4px",
									borderRadius: "3px",
									border: "1px solid color-mix(in srgb, var(--vscode-descriptionForeground) 50%, transparent)",
									color: "var(--vscode-descriptionForeground)",
									whiteSpace: "nowrap",
									display: "inline-flex",
								}}>
								{tag}
								{index === item.tags.length - 1 ? "" : ""}
							</span>
						))}
						<div
							className="tags-gradient"
							style={{
								position: "absolute",
								right: 0,
								top: 0,
								bottom: 0,
								width: "32px",
								background: "linear-gradient(to right, transparent, var(--vscode-sideBar-background))",
								pointerEvents: "none",
							}}
						/>
					</div>
				</div>
			</a>
		</>
	)
}

// Memoize to prevent re-renders in marketplace list
const McpMarketplaceCard = React.memo(McpMarketplaceCardComponent, (prevProps, nextProps) => {
	// Check if item changed
	if (prevProps.item.mcpId !== nextProps.item.mcpId) {
		return false
	}
	if (prevProps.item.name !== nextProps.item.name) {
		return false
	}
	if (prevProps.item.downloadCount !== nextProps.item.downloadCount) {
		return false
	}

	// Check if installation status changed for this item
	const prevInstalled = prevProps.installedServers.some((s) => s.name === prevProps.item.mcpId)
	const nextInstalled = nextProps.installedServers.some((s) => s.name === nextProps.item.mcpId)
	if (prevInstalled !== nextInstalled) {
		return false
	}

	return true
})

export default McpMarketplaceCard
