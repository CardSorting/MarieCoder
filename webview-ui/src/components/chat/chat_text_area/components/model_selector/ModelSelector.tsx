/**
 * ModelSelector component - displays and manages model selection
 */

import type { Mode } from "@shared/storage/types"
import type React from "react"
import ApiOptions from "@/components/settings/ApiOptions"
import {
	ModelButtonContent,
	ModelButtonWrapper,
	ModelContainer,
	ModelDisplayButton,
	ModelSelectorTooltip,
} from "./model_selector_components"

interface ModelSelectorProps {
	showModelSelector: boolean
	modelDisplayName: string
	modelFullName: string
	arrowPosition: number
	menuPosition: number
	mode: Mode
	modelSelectorRef: React.RefObject<HTMLDivElement>
	buttonRef: React.RefObject<HTMLDivElement>
	onModelButtonClick: () => void
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
	showModelSelector,
	modelDisplayName,
	modelFullName,
	arrowPosition,
	menuPosition,
	mode,
	modelSelectorRef,
	buttonRef,
	onModelButtonClick,
}) => {
	return (
		<ModelContainer ref={modelSelectorRef}>
			<ModelButtonWrapper ref={buttonRef}>
				<ModelDisplayButton
					disabled={false}
					isActive={showModelSelector}
					onClick={onModelButtonClick}
					role="button"
					tabIndex={0}
					title={`${modelFullName}\n\nClick to select a different model or API provider`}>
					<ModelButtonContent>{modelDisplayName}</ModelButtonContent>
				</ModelDisplayButton>
			</ModelButtonWrapper>
			{showModelSelector && (
				<>
					{/* Backdrop overlay */}
					<div
						className="fixed inset-0 z-[999]"
						onClick={onModelButtonClick}
						style={{
							background: "rgba(0, 0, 0, 0.3)",
							backdropFilter: "blur(2px)",
						}}
					/>
					{/* Model selector popup */}
					<ModelSelectorTooltip
						arrowPosition={arrowPosition}
						menuPosition={menuPosition}
						style={{
							bottom: `calc(100vh - ${menuPosition}px + 6px)`,
						}}>
						<ApiOptions
							apiErrorMessage={undefined}
							currentMode={mode}
							isPopup={true}
							modelIdErrorMessage={undefined}
							showModelOptions={true}
						/>
					</ModelSelectorTooltip>
				</>
			)}
		</ModelContainer>
	)
}
