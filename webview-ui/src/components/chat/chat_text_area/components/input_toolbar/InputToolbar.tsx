/**
 * InputToolbar component - contains context, files, MCP toggles, and model selector
 */

import type { Mode } from "@shared/storage/types"
import type React from "react"
import ServersToggleModal from "@/components/chat/ServersToggleModal"
import ClineRulesToggleModal from "@/components/cline-rules/ClineRulesToggleModal"
import { AtSignIcon, PlusIcon } from "@/components/icons"
import { ModelSelector } from "../model_selector/ModelSelector"
import { ToolbarButton, ToolbarContainer, ToolbarDivider, ToolbarGroup } from "./toolbar_components"

interface InputToolbarProps {
	shouldDisableFilesAndImages: boolean
	showModelSelector: boolean
	modelDisplayName: string
	modelFullName: string
	arrowPosition: number
	menuPosition: number
	mode: Mode
	modelSelectorRef: React.RefObject<HTMLDivElement>
	buttonRef: React.RefObject<HTMLDivElement>
	onContextButtonClick: () => void
	onSelectFilesAndImages: () => void
	onModelButtonClick: () => void
}

export const InputToolbar: React.FC<InputToolbarProps> = ({
	shouldDisableFilesAndImages,
	showModelSelector,
	modelDisplayName,
	modelFullName,
	arrowPosition,
	menuPosition,
	mode,
	modelSelectorRef,
	buttonRef,
	onContextButtonClick,
	onSelectFilesAndImages,
	onModelButtonClick,
}) => {
	return (
		<ToolbarContainer>
			{/* Primary action buttons */}
			<ToolbarGroup>
				<ToolbarButton
					aria-label="Add Context"
					data-testid="context-button"
					icon={<AtSignIcon size={12} />}
					onClick={onContextButtonClick}
					tooltip="Add Context"
				/>
				<ToolbarButton
					aria-label="Add Files & Images"
					data-testid="files-button"
					disabled={shouldDisableFilesAndImages}
					icon={<PlusIcon size={12} />}
					onClick={onSelectFilesAndImages}
					tooltip="Add Files & Images"
				/>
			</ToolbarGroup>

			<ToolbarDivider />

			{/* Toggle buttons */}
			<ToolbarGroup>
				<ServersToggleModal />
				<ClineRulesToggleModal />
			</ToolbarGroup>

			<ToolbarDivider />

			{/* Model selector */}
			<ModelSelector
				arrowPosition={arrowPosition}
				buttonRef={buttonRef}
				menuPosition={menuPosition}
				mode={mode}
				modelDisplayName={modelDisplayName}
				modelFullName={modelFullName}
				modelSelectorRef={modelSelectorRef}
				onModelButtonClick={onModelButtonClick}
				showModelSelector={showModelSelector}
			/>
		</ToolbarContainer>
	)
}
