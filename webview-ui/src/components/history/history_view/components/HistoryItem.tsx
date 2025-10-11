import { VSCodeButton, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { formatLargeNumber, formatSize } from "@/utils/format"
import { formatHistoryDate } from "../utils/date_format_utils"
import { ExportButton } from "./ExportButton"

interface HistoryItemProps {
	item: any
	isSelected: boolean
	isPendingFavorite?: boolean
	onSelect: (id: string, checked: boolean) => void
	onShow: (id: string) => void
	onToggleFavorite: (id: string, currentValue: boolean) => void
	onDelete: (id: string) => void
}

/**
 * Individual history item display component
 * Renders task details, tokens, cache, cost, and action buttons
 */
export const HistoryItem = ({
	item,
	isSelected,
	isPendingFavorite,
	onSelect,
	onShow,
	onToggleFavorite,
	onDelete,
}: HistoryItemProps) => {
	const isFavorited = isPendingFavorite !== undefined ? isPendingFavorite : item.isFavorited

	return (
		<div
			className="history-item"
			style={{
				cursor: "pointer",
				display: "flex",
			}}>
			<VSCodeCheckbox
				checked={isSelected}
				className="pl-3 pr-1 py-auto"
				onClick={(e) => {
					const checked = (e.target as HTMLInputElement).checked
					onSelect(item.id, checked)
					e.stopPropagation()
				}}
			/>
			<div
				onClick={() => onShow(item.id)}
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "8px",
					padding: "12px 20px",
					paddingLeft: "16px",
					position: "relative",
					flexGrow: 1,
				}}>
				{/* Header: Date, Delete, and Favorite buttons */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}>
					<span
						style={{
							color: "var(--vscode-descriptionForeground)",
							fontWeight: 500,
							fontSize: "0.85em",
							textTransform: "uppercase",
						}}>
						{formatHistoryDate(item.ts)}
					</span>
					<div style={{ display: "flex", gap: "4px" }}>
						{/* Only show delete button if task not favorited */}
						{!isFavorited && (
							<VSCodeButton
								appearance="icon"
								aria-label="Delete"
								className="delete-button"
								onClick={(e) => {
									e.stopPropagation()
									onDelete(item.id)
								}}
								style={{ padding: "0px 0px" }}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "3px",
										fontSize: "11px",
									}}>
									<span className="codicon codicon-trash"></span>
									{formatSize(item.size)}
								</div>
							</VSCodeButton>
						)}
						<VSCodeButton
							appearance="icon"
							aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
							onClick={(e) => {
								e.stopPropagation()
								onToggleFavorite(item.id, item.isFavorited || false)
							}}
							style={{ padding: "0px" }}>
							<div
								className={`codicon ${isFavorited ? "codicon-star-full" : "codicon-star-empty"}`}
								style={{
									color: isFavorited ? "var(--vscode-button-background)" : "inherit",
									opacity: isFavorited ? 1 : 0.7,
									display: isFavorited ? "block" : undefined,
								}}
							/>
						</VSCodeButton>
					</div>
				</div>

				{/* Task text with HTML highlighting */}
				<div style={{ marginBottom: "8px", position: "relative" }}>
					<div
						style={{
							fontSize: "var(--vscode-font-size)",
							color: "var(--vscode-foreground)",
							display: "-webkit-box",
							WebkitLineClamp: 3,
							WebkitBoxOrient: "vertical",
							overflow: "hidden",
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							overflowWrap: "anywhere",
						}}>
						<span
							className="ph-no-capture"
							dangerouslySetInnerHTML={{
								__html: item.task,
							}}
						/>
					</div>
				</div>

				{/* Metadata: Tokens, Cache, Cost */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "4px",
					}}>
					{/* Tokens row */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "4px",
								flexWrap: "wrap",
							}}>
							<span
								style={{
									fontWeight: 500,
									color: "var(--vscode-descriptionForeground)",
								}}>
								Tokens:
							</span>
							<span
								style={{
									display: "flex",
									alignItems: "center",
									gap: "3px",
									color: "var(--vscode-descriptionForeground)",
								}}>
								<i
									className="codicon codicon-arrow-up"
									style={{
										fontSize: "12px",
										fontWeight: "bold",
										marginBottom: "-2px",
									}}
								/>
								{formatLargeNumber(item.tokensIn || 0)}
							</span>
							<span
								style={{
									display: "flex",
									alignItems: "center",
									gap: "3px",
									color: "var(--vscode-descriptionForeground)",
								}}>
								<i
									className="codicon codicon-arrow-down"
									style={{
										fontSize: "12px",
										fontWeight: "bold",
										marginBottom: "-2px",
									}}
								/>
								{formatLargeNumber(item.tokensOut || 0)}
							</span>
						</div>
						{!item.totalCost && <ExportButton itemId={item.id} />}
					</div>

					{/* Cache row (if present) */}
					{!!(item.cacheWrites || item.cacheReads) && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "4px",
								flexWrap: "wrap",
							}}>
							<span
								style={{
									fontWeight: 500,
									color: "var(--vscode-descriptionForeground)",
								}}>
								Cache:
							</span>
							{item.cacheWrites > 0 && (
								<span
									style={{
										display: "flex",
										alignItems: "center",
										gap: "3px",
										color: "var(--vscode-descriptionForeground)",
									}}>
									<i
										className="codicon codicon-arrow-right"
										style={{
											fontSize: "12px",
											fontWeight: "bold",
											marginBottom: "-1px",
										}}
									/>
									{formatLargeNumber(item.cacheWrites)}
								</span>
							)}
							{item.cacheReads > 0 && (
								<span
									style={{
										display: "flex",
										alignItems: "center",
										gap: "3px",
										color: "var(--vscode-descriptionForeground)",
									}}>
									<i
										className="codicon codicon-arrow-left"
										style={{
											fontSize: "12px",
											fontWeight: "bold",
											marginBottom: 0,
										}}
									/>
									{formatLargeNumber(item.cacheReads)}
								</span>
							)}
						</div>
					)}

					{/* Cost row (if present) */}
					{!!item.totalCost && (
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginTop: -2,
							}}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "4px",
								}}>
								<span
									style={{
										fontWeight: 500,
										color: "var(--vscode-descriptionForeground)",
									}}>
									API Cost:
								</span>
								<span
									style={{
										color: "var(--vscode-descriptionForeground)",
									}}>
									${item.totalCost?.toFixed(4)}
								</span>
							</div>
							<ExportButton itemId={item.id} />
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
