/**
 * ModeSwitch component - toggles between Plan and Act modes
 */

import type { Mode } from "@shared/storage/types"
import type React from "react"
import { useState } from "react"
import HeroTooltip from "@/components/common/HeroTooltip"
import { Slider, SwitchContainer, SwitchOption } from "./mode_switch_components"

interface ModeSwitchProps {
	mode: Mode
	onModeToggle: () => void
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({ mode, onModeToggle }) => {
	const [shownTooltipMode, setShownTooltipMode] = useState<Mode | null>(null)

	return (
		<HeroTooltip
			content={
				<div>
					<div>
						{`In ${shownTooltipMode === "act" ? "Act" : "Plan"} mode, Cline will ${shownTooltipMode === "act" ? "complete the task immediately" : "gather information to architect a plan"}`}
					</div>
				</div>
			}
			disabled={shownTooltipMode === null}
			placement="top">
			<SwitchContainer data-testid="mode-switch" disabled={false} onClick={onModeToggle}>
				<Slider isAct={mode === "act"} isPlan={mode === "plan"} />
				<SwitchOption
					aria-checked={mode === "plan"}
					isActive={mode === "plan"}
					onMouseLeave={() => setShownTooltipMode(null)}
					onMouseOver={() => setShownTooltipMode("plan")}
					role="switch">
					Plan
				</SwitchOption>
				<SwitchOption
					aria-checked={mode === "act"}
					isActive={mode === "act"}
					onMouseLeave={() => setShownTooltipMode(null)}
					onMouseOver={() => setShownTooltipMode("act")}
					role="switch">
					Act
				</SwitchOption>
			</SwitchContainer>
		</HeroTooltip>
	)
}
