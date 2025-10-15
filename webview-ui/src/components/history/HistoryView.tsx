import { VSCodeButton, VSCodeRadio, VSCodeRadioGroup, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { memo, useCallback, useEffect, useState } from "react"
import { Virtuoso } from "react-virtuoso"
import { Button } from "@/components/common/Button"
import { useTaskState } from "@/context/TaskStateContext"
import { useUIState } from "@/context/UIStateContext"
import { formatSize } from "@/utils/format"
import { CustomFilterRadio } from "./history_view/components/CustomFilterRadio"
import { HistoryItem } from "./history_view/components/HistoryItem"
import { useBulkSelection } from "./history_view/hooks/use_bulk_selection"
import { useHistoryData } from "./history_view/hooks/use_history_data"
import { useHistorySearch } from "./history_view/hooks/use_history_search"
import type { SortOption } from "./history_view/utils/sort_utils"

type HistoryViewProps = {
	onDone: () => void
}

/**
 * History view component - displays and manages task history
 * Main orchestrator for history functionality
 */
const HistoryView = ({ onDone }: HistoryViewProps) => {
	const { taskHistory, totalTasksSize, setTotalTasksSize } = useTaskState()
	const { onRelinquishControl } = useUIState()

	// Filter state
	const [searchQuery, setSearchQuery] = useState("")
	const [sortOption, setSortOption] = useState<SortOption>("newest")
	const [lastNonRelevantSort, setLastNonRelevantSort] = useState<SortOption | null>("newest")
	const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
	const [showCurrentWorkspaceOnly, setShowCurrentWorkspaceOnly] = useState(false)

	// Data management
	const {
		tasks,
		deleteAllDisabled,
		pendingFavoriteToggles,
		toggleFavorite,
		handleShowTaskWithId,
		handleDeleteHistoryItem,
		handleDeleteSelectedHistoryItems,
		handleDeleteAllHistory,
	} = useHistoryData(
		showFavoritesOnly,
		showCurrentWorkspaceOnly,
		searchQuery,
		sortOption,
		onRelinquishControl,
		setTotalTasksSize,
	)

	// Search and filter
	const searchResults = useHistorySearch(tasks, searchQuery, sortOption)

	// Bulk selection
	const { selectedItems, selectedItemsSize, handleHistorySelect, handleBatchHistorySelect, clearSelection } =
		useBulkSelection(taskHistory)

	// Auto-switch to "mostRelevant" when searching
	useEffect(() => {
		if (searchQuery && sortOption !== "mostRelevant" && !lastNonRelevantSort) {
			setLastNonRelevantSort(sortOption)
			setSortOption("mostRelevant")
		} else if (!searchQuery && sortOption === "mostRelevant" && lastNonRelevantSort) {
			setSortOption(lastNonRelevantSort)
			setLastNonRelevantSort(null)
		}
	}, [searchQuery, sortOption, lastNonRelevantSort])

	// Clear search
	const handleClearSearch = useCallback(() => {
		setSearchQuery("")
	}, [])

	// Delete selected items with cleanup
	const handleDeleteSelected = useCallback(() => {
		handleDeleteSelectedHistoryItems(selectedItems)
		clearSelection()
	}, [selectedItems, handleDeleteSelectedHistoryItems, clearSelection])

	return (
		<>
			<style>
				{`
					.history-item:hover {
						background-color: var(--vscode-list-hoverBackground);
					}
					.delete-button, .export-button {
						opacity: 0;
						pointer-events: none;
					}
					.history-item:hover .delete-button,
					.history-item:hover .export-button {
						opacity: 1;
						pointer-events: auto;
					}
					.history-item-highlight {
						background-color: var(--vscode-editor-findMatchHighlightBackground);
						color: inherit;
					}
				`}
			</style>
			<div
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}>
				{/* Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						padding: "10px 17px 10px 20px",
					}}>
					<h3 style={{ color: "var(--vscode-foreground)", margin: 0 }}>History</h3>
					<VSCodeButton onClick={onDone}>Done</VSCodeButton>
				</div>

				{/* Search and Filters */}
				<div style={{ padding: "5px 17px 6px 17px" }}>
					<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
						{/* Search Bar */}
						<VSCodeTextField
							onInput={(e) => {
								const newValue = (e.target as HTMLInputElement)?.value
								setSearchQuery(newValue)
								if (newValue && !searchQuery && sortOption !== "mostRelevant") {
									setLastNonRelevantSort(sortOption)
									setSortOption("mostRelevant")
								}
							}}
							placeholder="Fuzzy search history..."
							style={{ width: "100%" }}
							value={searchQuery}>
							<div
								className="codicon codicon-search"
								slot="start"
								style={{ fontSize: 13, marginTop: 2.5, opacity: 0.8 }}
							/>
							{searchQuery && (
								<div
									aria-label="Clear search"
									className="input-icon-button codicon codicon-close"
									onClick={handleClearSearch}
									slot="end"
									style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}
								/>
							)}
						</VSCodeTextField>

						{/* Sort and Filter Options */}
						<VSCodeRadioGroup
							onChange={(e) => setSortOption((e.target as HTMLInputElement).value as SortOption)}
							style={{ display: "flex", flexWrap: "wrap" }}
							value={sortOption}>
							<VSCodeRadio value="newest">Newest</VSCodeRadio>
							<VSCodeRadio value="oldest">Oldest</VSCodeRadio>
							<VSCodeRadio value="mostExpensive">Most Expensive</VSCodeRadio>
							<VSCodeRadio value="mostTokens">Most Tokens</VSCodeRadio>
							<VSCodeRadio disabled={!searchQuery} style={{ opacity: searchQuery ? 1 : 0.5 }} value="mostRelevant">
								Most Relevant
							</VSCodeRadio>
							<CustomFilterRadio
								checked={showCurrentWorkspaceOnly}
								icon="workspace"
								label="Workspace"
								onChange={() => setShowCurrentWorkspaceOnly(!showCurrentWorkspaceOnly)}
							/>
							<CustomFilterRadio
								checked={showFavoritesOnly}
								icon="star-full"
								label="Favorites"
								onChange={() => setShowFavoritesOnly(!showFavoritesOnly)}
							/>
						</VSCodeRadioGroup>

						{/* Bulk Selection Controls */}
						<div className="flex justify-end gap-2.5">
							<VSCodeButton onClick={() => handleBatchHistorySelect(true, searchResults)}>Select All</VSCodeButton>
							<VSCodeButton onClick={() => handleBatchHistorySelect(false, searchResults)}>
								Select None
							</VSCodeButton>
						</div>
					</div>
				</div>

				{/* History List */}
				<div style={{ flexGrow: 1, overflowY: "auto", margin: 0 }}>
					<Virtuoso
						data={searchResults}
						itemContent={(index, item) => (
							<div
								key={item.id}
								style={{
									borderBottom:
										index < taskHistory.length - 1 ? "1px solid var(--vscode-panel-border)" : "none",
								}}>
								<HistoryItem
									isPendingFavorite={pendingFavoriteToggles[item.id]}
									isSelected={selectedItems.includes(item.id)}
									item={item}
									onDelete={handleDeleteHistoryItem}
									onSelect={handleHistorySelect}
									onShow={handleShowTaskWithId}
									onToggleFavorite={toggleFavorite}
								/>
							</div>
						)}
						style={{
							flexGrow: 1,
							overflowY: "scroll",
						}}
					/>
				</div>

				{/* Footer: Delete Controls */}
				<div style={{ padding: "10px 10px", borderTop: "1px solid var(--vscode-panel-border)" }}>
					{selectedItems.length > 0 ? (
						<Button
							aria-label="Delete selected items"
							onClick={handleDeleteSelected}
							style={{ width: "100%" }}
							variant="danger">
							Delete {selectedItems.length > 1 ? selectedItems.length : ""} Selected
							{selectedItemsSize > 0 ? ` (${formatSize(selectedItemsSize)})` : ""}
						</Button>
					) : (
						<Button
							aria-label="Delete all history"
							disabled={deleteAllDisabled || taskHistory.length === 0}
							onClick={handleDeleteAllHistory}
							style={{ width: "100%" }}
							variant="danger">
							Delete All History{totalTasksSize !== null ? ` (${formatSize(totalTasksSize)})` : ""}
						</Button>
					)}
				</div>
			</div>
		</>
	)
}

export default memo(HistoryView)

// Re-export highlight for backward compatibility
export { highlight } from "./history_view/utils/highlight_utils"
