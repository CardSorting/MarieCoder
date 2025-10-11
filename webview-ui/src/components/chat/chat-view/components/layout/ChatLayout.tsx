import type React from "react"

interface ChatLayoutProps {
	isHidden: boolean
	children: React.ReactNode
}

/**
 * Main layout container for the chat view
 * Provides the fixed positioning and flex layout structure
 */
export const ChatLayout: React.FC<ChatLayoutProps> = ({ isHidden, children }) => {
	return (
		<div
			className={`${isHidden ? "hidden" : "grid"} grid-rows-[1fr_auto] overflow-hidden p-0 m-0 w-full h-full min-h-screen relative`}>
			<div className="flex flex-col overflow-hidden row-start-1">{children}</div>
		</div>
	)
}
