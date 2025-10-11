import React from "react"

interface CollapsibleContentProps {
	isOpen: boolean
	children: React.ReactNode
	className?: string
}

const CollapsibleContent: React.FC<CollapsibleContentProps> = ({ isOpen, children, className = "" }) => {
	return (
		<div
			className={`overflow-hidden transition-all duration-300 ease-in-out ${className}`}
			style={{
				maxHeight: isOpen ? "1000px" : "0",
				opacity: isOpen ? 1 : 0,
				marginTop: isOpen ? "15px" : "0",
				visibility: isOpen ? "visible" : "hidden",
			}}>
			{children}
		</div>
	)
}

export default CollapsibleContent
