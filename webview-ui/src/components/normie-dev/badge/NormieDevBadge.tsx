import React from 'react'

interface NormieDevBadgeProps {
	children: React.ReactNode
	variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
	size?: 'sm' | 'md'
	className?: string
}

const NormieDevBadge: React.FC<NormieDevBadgeProps> = ({
	children,
	variant = 'default',
	size = 'sm',
	className = ""
}) => {
	const getVariantStyles = () => {
		switch (variant) {
			case 'success':
				return 'bg-green-500/20 text-green-400 border-green-500/30'
			case 'warning':
				return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
			case 'error':
				return 'bg-red-500/20 text-red-400 border-red-500/30'
			case 'info':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
			default:
				return 'normie-dev-subtle normie-dev-brand'
		}
	}

	const getSizeStyles = () => {
		switch (size) {
			case 'sm':
				return 'text-xs px-2 py-1'
			default:
				return 'text-sm px-3 py-1'
		}
	}

	return (
		<span
			className={`
				${getVariantStyles()}
				${getSizeStyles()}
				border rounded-full font-medium
				${className}
			`.trim()}
		>
			{children}
		</span>
	)
}

export default NormieDevBadge
