import { lazy, Suspense } from "react"
import ChatView from "./components/chat/ChatView"
import { useExtensionState } from "./context/ExtensionStateContext"
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
	} = useExtensionState()

	if (!didHydrateState) {
		return null
	}

	return (
		<div className="flex h-screen w-full flex-col">
			<Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
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
