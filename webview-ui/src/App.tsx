import { lazy, Suspense } from "react"
import ChatView from "./components/chat/ChatView"
import { KeyboardHelp } from "./components/common/KeyboardHelp"
import { SkeletonLoader } from "./components/common/SkeletonLoader"
import { useExtensionState } from "./context/ExtensionStateContext"
import { usePageTitle } from "./hooks/use_page_title"
import { Providers } from "./Providers"

// Lazy load infrequently accessed views for faster initial load
const HistoryView = lazy(() => import("./components/history/HistoryView"))
const McpView = lazy(() => import("./components/mcp/configuration/McpConfigurationView"))
const SettingsView = lazy(() => import("./components/settings/SettingsView"))

const AppContent = () => {
	const {
		didHydrateState,
		showMcp,
		mcpTab,
		showSettings,
		showHistory,
		closeMcpView,
		navigateToHistory,
		hideSettings,
		hideHistory,
		currentTaskItem,
	} = useExtensionState()

	// Debug logging
	console.log("[App] Render state:", { showSettings, showHistory, showMcp, didHydrateState })

	// Dynamic page title based on current view
	const pageTitle = showSettings
		? "Settings"
		: showHistory
			? "History"
			: showMcp
				? mcpTab === "marketplace"
					? "MCP Marketplace"
					: mcpTab === "addRemote"
						? "Add MCP Server"
						: "MCP Configuration"
				: currentTaskItem?.task
					? `Task: ${currentTaskItem.task.substring(0, 50)}${currentTaskItem.task.length > 50 ? "..." : ""}`
					: "Chat"

	usePageTitle(pageTitle)

	if (!didHydrateState) {
		return null
	}

	return (
		<div className="flex h-screen w-full flex-col">
			{/* Screen reader announcer for page title changes */}
			<div aria-atomic="true" aria-live="polite" className="sr-only" id="page-title-announcer" role="status" />

			{/* Global keyboard help overlay (toggled with ?) */}
			<KeyboardHelp />

			<Suspense
				fallback={
					<div className="flex items-center justify-center h-full p-8">
						<div className="w-full max-w-3xl">
							<SkeletonLoader height="60vh" type="card" />
						</div>
					</div>
				}>
				{showSettings && <SettingsView onDone={hideSettings} />}
				{showHistory && <HistoryView onDone={hideHistory} />}
				{showMcp && <McpView initialTab={mcpTab} onDone={closeMcpView} />}
			</Suspense>
			{/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
			<ChatView isHidden={showSettings || showHistory || showMcp} showHistoryView={navigateToHistory} />
		</div>
	)
}

const App = () => {
	return (
		<Providers>
			<AppContent />
		</Providers>
	)
}

export default App
