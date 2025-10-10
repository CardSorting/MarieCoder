import { StringRequest } from "@shared/proto/cline/common"
import { Button } from "@/components/common/Button"
import HeroTooltip from "@/components/common/HeroTooltip"
import { ArrowDownToLineIcon } from "@/components/icons"
import { FileServiceClient } from "@/services/grpc-client"
import { cn } from "@/utils/classnames"
import { debug } from "@/utils/debug_logger"

const OpenDiskConversationHistoryButton: React.FC<{
	taskId?: string
	className?: string
}> = ({ taskId, className }) => {
	const handleOpenDiskConversationHistory = () => {
		if (!taskId) {
			return
		}

		FileServiceClient.openDiskConversationHistory(StringRequest.create({ value: taskId })).catch((err) => {
			debug.error(err)
		})
	}

	return (
		<HeroTooltip content="Open Conversation History File" placement="right">
			<Button
				aria-label="Open Disk Conversation History"
				className={cn("flex items-center border-0 text-sm font-bold bg-transparent hover:opacity-100", className)}
				isIconOnly={true}
				onPress={() => handleOpenDiskConversationHistory()}
				radius="sm"
				size="sm">
				<ArrowDownToLineIcon size="14" />
			</Button>
		</HeroTooltip>
	)
}

export default OpenDiskConversationHistoryButton
