import { AskResponseRequest } from "@shared/proto/cline/task"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { TaskServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"

export const OptionsButtons = ({
	options,
	selected,
	isActive,
	inputValue,
}: {
	options?: string[]
	selected?: string
	isActive?: boolean
	inputValue?: string
}) => {
	if (!options?.length) {
		return null
	}

	const hasSelected = selected !== undefined && options.includes(selected)

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				paddingTop: 15,
				// marginTop: "22px",
			}}>
			{/* <div style={{ color: "var(--vscode-descriptionForeground)", fontSize: "11px", textTransform: "uppercase" }}>
				SELECT ONE:
			</div> */}
			{options.map((option, index) => {
				const isSelected = option === selected
				const isNotSelectable = hasSelected || !isActive
				return (
					<button
						className={`options-button py-2 px-3 border border-[var(--vscode-editorGroup-border)] rounded-[2px] text-left text-xs
							${isSelected ? "bg-[var(--vscode-focusBorder)] text-white" : "text-[var(--vscode-input-foreground)]"}
							${isNotSelectable ? "cursor-default" : "cursor-pointer hover:bg-[var(--vscode-focusBorder)] hover:text-white"}`}
						id={`options-button-${index}`}
						key={option}
						onClick={async () => {
							if (hasSelected || !isActive) {
								return
							}
							try {
								await TaskServiceClient.askResponse(
									AskResponseRequest.create({
										responseType: "messageResponse",
										text: option + (inputValue ? `: ${inputValue?.trim()}` : ""),
										images: [],
									}),
								)
							} catch (error) {
								debug.error("Error sending option response:", error)
							}
						}}
						style={{
							background: isSelected ? undefined : CODE_BLOCK_BG_COLOR,
						}}>
						<span className="ph-no-capture">{option}</span>
					</button>
				)
			})}
		</div>
	)
}
