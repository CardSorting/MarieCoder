import React from 'react'

interface NormieDevLogoProps {
	className?: string
	size?: number
}

const NormieDevLogo: React.FC<NormieDevLogoProps> = ({ className = "", size = 24 }) => {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			{/* Simple, clean design representing "N" for Normie */}
			<rect
				x="3"
				y="3"
				width="3"
				height="18"
				rx="1.5"
				fill="currentColor"
			/>
			<rect
				x="8"
				y="6"
				width="3"
				height="12"
				rx="1.5"
				fill="currentColor"
			/>
			<rect
				x="13"
				y="9"
				width="3"
				height="6"
				rx="1.5"
				fill="currentColor"
			/>
			<rect
				x="18"
				y="3"
				width="3"
				height="18"
				rx="1.5"
				fill="currentColor"
			/>
			{/* Small dot representing the "Dev" aspect */}
			<circle
				cx="12"
				cy="20"
				r="1.5"
				fill="var(--vscode-focusBorder, #007fd4)"
			/>
		</svg>
	)
}

export default NormieDevLogo
