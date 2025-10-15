import { lazy, Suspense } from "react"
import { debug } from "@/utils/debug_logger"
import ChatView from "./components/chat/ChatView"
import { SkeletonLoader } from "./components/common/SkeletonLoader"
import { useSettingsState } from "./context/SettingsContext"
import { useUIState } from "./context/UIStateContext"
import { Providers } from "./Providers"

// Lazy load infrequently accessed views for faster initial load
const HistoryView = lazy(() => import("./components/history/HistoryView"))
const McpView = lazy(() => import("./components/mcp/configuration/McpConfigurationView"))
const SettingsView = lazy(() => import("./components/settings/SettingsView"))

const AppContent = () => {
	const { didHydrateState } = useSettingsState()
	const { showMcp, mcpTab, showSettings, showHistory, closeMcpView, navigateToHistory, hideSettings, hideHistory } =
		useUIState()

	// Debug logging
	debug.log("[App] Render state:", { showSettings, showHistory, showMcp, didHydrateState })

	if (!didHydrateState) {
		return null
	}

	return (
		<div className="flex h-screen w-full flex-col">
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
