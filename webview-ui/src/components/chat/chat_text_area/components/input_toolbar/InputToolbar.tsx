/**
 * InputToolbar component - contains context, files, MCP toggles, and model selector
 */

import type { Mode } from "@shared/storage/types"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import type React from "react"
import ServersToggleModal from "@/components/chat/ServersToggleModal"
import ClineRulesToggleModal from "@/components/cline-rules/ClineRulesToggleModal"
import HeroTooltip from "@/components/common/HeroTooltip"
import { AtSignIcon, PlusIcon } from "@/components/icons"
import { ModelSelector } from "../model_selector/ModelSelector"
import { ButtonContainer, ButtonGroup } from "../model_selector/model_selector_components"

interface InputToolbarProps {
	shouldDisableFilesAndImages: boolean
	showModelSelector: boolean
	modelDisplayName: string
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
		<div className="relative flex-1 min-w-0 h-5">
			<ButtonGroup className="absolute top-0 left-0 right-0 ease-in-out w-full h-5 z-10 flex items-center">
				<HeroTooltip content="Add Context" placement="top">
					<VSCodeButton
						appearance="icon"
						aria-label="Add Context"
						className="p-0 m-0 flex items-center"
						data-testid="context-button"
						onClick={onContextButtonClick}>
						<ButtonContainer>
							<AtSignIcon size={12} />
						</ButtonContainer>
					</VSCodeButton>
				</HeroTooltip>

				<HeroTooltip content="Add Files & Images" placement="top">
					<VSCodeButton
						appearance="icon"
						aria-label="Add Files & Images"
						className="p-0 m-0 flex items-center"
						data-testid="files-button"
						disabled={shouldDisableFilesAndImages}
						onClick={() => {
							if (!shouldDisableFilesAndImages) {
								onSelectFilesAndImages()
							}
						}}>
						<ButtonContainer>
							<PlusIcon size={13} />
						</ButtonContainer>
					</VSCodeButton>
				</HeroTooltip>

				<ServersToggleModal />
				<ClineRulesToggleModal />

				<ModelSelector
					arrowPosition={arrowPosition}
					buttonRef={buttonRef}
					menuPosition={menuPosition}
					mode={mode}
					modelDisplayName={modelDisplayName}
					modelSelectorRef={modelSelectorRef}
					onModelButtonClick={onModelButtonClick}
					showModelSelector={showModelSelector}
				/>
			</ButtonGroup>
		</div>
	)
}
