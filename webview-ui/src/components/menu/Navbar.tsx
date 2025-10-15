import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useMemo } from "react"
import { HistoryIcon, PlusIcon } from "@/components/icons"
import { useUIState } from "@/context/UIStateContext"
import { TaskServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import HeroTooltip from "../common/HeroTooltip"

export const Navbar = () => {
	const { navigateToHistory, navigateToChat } = useUIState()

	const NAVBAR_TABS = useMemo(
		() => [
			{
				id: "chat",
				name: "Chat",
				tooltip: "New Task",
				icon: PlusIcon,
				navigate: () => {
					debug.log("[Navbar] Starting new task flow")
					// Close the current task, then navigate to the chat view
					TaskServiceClient.clearTask({})
						.catch((error) => {
							debug.error("Failed to clear task:", error)
						})
						.finally(() => {
							debug.log("[Navbar] Task cleared, navigating to chat")
							navigateToChat()
						})
				},
			},
			{
				id: "history",
				name: "History",
				tooltip: "History",
				icon: HistoryIcon,
				navigate: () => {
					debug.log("[Navbar] Navigating to history")
					navigateToHistory()
				},
			},
		],
		[navigateToChat, navigateToHistory],
	)

	return (
		<nav
			className="flex-none inline-flex justify-end bg-transparent gap-2 mb-1 z-[100] border-none items-center !mr-4"
			id="cline-navbar-container"
			style={{ gap: "4px", pointerEvents: "auto" }}>
			{NAVBAR_TABS.map((tab) => (
				<HeroTooltip content={tab.tooltip} key={`navbar-tooltip-${tab.id}`} placement="bottom">
					<VSCodeButton
						appearance="icon"
						aria-label={tab.tooltip}
						data-testid={`tab-${tab.id}`}
						key={`navbar-button-${tab.id}`}
						onClick={(e) => {
							e.preventDefault()
							e.stopPropagation()
							debug.log(`[Navbar] Clicked ${tab.id} button`)
							tab.navigate()
							debug.log(`[Navbar] Called navigate for ${tab.id}`)
						}}
						style={{ padding: "0px", height: "20px", cursor: "pointer", pointerEvents: "auto" }}>
						<div className="flex items-center gap-1 text-xs whitespace-nowrap min-w-0 w-full">
							<tab.icon className="text-[var(--vscode-foreground)]" size={18} strokeWidth={1} />
						</div>
					</VSCodeButton>
				</HeroTooltip>
			))}
		</nav>
	)
}
