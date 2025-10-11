import { StringRequest } from "@shared/proto/cline/common"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { TaskServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"

interface ExportButtonProps {
	itemId: string
}

/**
 * Export button for individual history items
 */
export const ExportButton = ({ itemId }: ExportButtonProps) => (
	<VSCodeButton
		appearance="icon"
		aria-label="Export"
		className="export-button"
		onClick={(e) => {
			e.stopPropagation()
			TaskServiceClient.exportTaskWithId(StringRequest.create({ value: itemId })).catch((err) =>
				debug.error("Failed to export task:", err),
			)
		}}>
		<div style={{ fontSize: "11px", fontWeight: 500, opacity: 1 }}>EXPORT</div>
	</VSCodeButton>
)
