import React from 'react'
import NormieDevLogo from '@/assets/NormieDevLogo'

interface NormieDevHeaderProps {
	className?: string
	showSubtitle?: boolean
	variant?: 'default' | 'compact' | 'minimal'
}

const NormieDevHeader: React.FC<NormieDevHeaderProps> = ({ 
	className = "", 
	showSubtitle = true,
	variant = 'default'
}) => {
	const getVariantStyles = () => {
		switch (variant) {
			case 'compact':
				return 'flex items-center gap-2 p-1 normie-dev-subtle rounded-md marie-kondo-clean'
			case 'minimal':
				return 'flex items-center gap-1 p-1'
			default:
				return 'flex items-center gap-2 p-2 normie-dev-subtle rounded-lg marie-kondo-clean'
		}
	}

	const getLogoSize = () => {
		switch (variant) {
			case 'compact':
				return 'size-4'
			case 'minimal':
				return 'size-3'
			default:
				return 'size-6'
		}
	}

	return (
		<div className={`${getVariantStyles()} ${className}`}>
			<NormieDevLogo className={`${getLogoSize()} normie-dev-brand`} />
			<div className="flex flex-col">
				<span className={`normie-dev-brand font-medium ${variant === 'compact' ? 'text-xs' : variant === 'minimal' ? 'text-xs' : 'text-sm'}`}>
					Normie Dev
				</span>
				{showSubtitle && variant !== 'minimal' && (
					<span className={`text-[var(--vscode-descriptionForeground)] ${variant === 'compact' ? 'text-xs' : 'text-xs'}`}>
						Next.js & SQLite Specialist
					</span>
				)}
			</div>
		</div>
	)
}

export default NormieDevHeader
