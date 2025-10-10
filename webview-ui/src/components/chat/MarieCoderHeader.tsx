import React from "react"
import MarieCoderLogo from "@/assets/MarieCoderLogo"

interface MarieCoderHeaderProps {
	className?: string
}

const MarieCoderHeader: React.FC<MarieCoderHeaderProps> = ({ className = "" }) => {
	return (
		<div className={`flex items-center gap-2 p-2 marie-coder-subtle rounded-lg marie-kondo-clean ${className}`}>
			<MarieCoderLogo className="size-6 marie-coder-brand" />
			<div className="flex flex-col">
				<span className="text-sm font-medium marie-coder-brand">Marie Coder</span>
				<span className="text-xs text-[var(--vscode-descriptionForeground)]">Next.js & SQLite Specialist</span>
			</div>
		</div>
	)
}

export default MarieCoderHeader
