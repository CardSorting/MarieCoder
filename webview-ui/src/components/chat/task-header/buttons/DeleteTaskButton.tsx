import { StringArrayRequest } from "@shared/proto/cline/common"
import { Button } from "@/components/common/Button"
import HeroTooltip from "@/components/common/HeroTooltip"
import { TrashIcon } from "@/components/icons"
import { TaskServiceClient } from "@/services/grpc-client"
import { cn } from "@/utils/classnames"
import { formatSize } from "@/utils/format"

const DeleteTaskButton: React.FC<{
	taskId?: string
	taskSize?: number
	className?: string
}> = ({ taskId, className, taskSize }) => (
	<HeroTooltip content={`Delete Task (size: ${taskSize ? formatSize(taskSize) : "--"})`} placement="right">
		<Button
			aria-label="Delete Task"
			className={cn("flex items-center border-0 text-sm font-bold bg-transparent hover:opacity-100 p-0", className)}
			isIconOnly={true}
			onClick={() => {
				taskId && TaskServiceClient.deleteTasksWithIds(StringArrayRequest.create({ value: [taskId] }))
			}}
			size="sm">
			<TrashIcon size="13" />
		</Button>
	</HeroTooltip>
)
DeleteTaskButton.displayName = "DeleteTaskButton"

export default DeleteTaskButton
