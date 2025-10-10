import React from "react"

interface MarieCoderLogoProps {
	className?: string
	size?: number
}

const MarieCoderLogo: React.FC<MarieCoderLogoProps> = ({ className = "", size = 24 }) => {
	return (
		<svg className={className} fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
			{/* Simple, clean design representing "M" for Marie */}
			<rect fill="currentColor" height="18" rx="1.5" width="3" x="3" y="3" />
			<rect fill="currentColor" height="12" rx="1.5" width="3" x="8" y="6" />
			<rect fill="currentColor" height="6" rx="1.5" width="3" x="13" y="9" />
			<rect fill="currentColor" height="18" rx="1.5" width="3" x="18" y="3" />
			{/* Small dot representing the "Dev" aspect */}
			<circle cx="12" cy="20" fill="var(--vscode-focusBorder, #007fd4)" r="1.5" />
		</svg>
	)
}

export default MarieCoderLogo
