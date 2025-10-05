import React from "react"
import NormieDevLogo from "@/assets/NormieDevLogo"

interface NormieDevHeaderProps {
	className?: string
}

const NormieDevHeader: React.FC<NormieDevHeaderProps> = ({ className = "" }) => {
	return (
		<div className={`flex items-center gap-2 p-2 normie-dev-subtle rounded-lg marie-kondo-clean ${className}`}>
			<NormieDevLogo className="size-6 normie-dev-brand" />
			<div className="flex flex-col">
				<span className="text-sm font-medium normie-dev-brand">Normie Dev</span>
				<span className="text-xs text-[var(--vscode-descriptionForeground)]">Next.js & SQLite Specialist</span>
			</div>
		</div>
	)
}

export default NormieDevHeader
