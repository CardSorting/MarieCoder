import { NewTaskRequest } from "@shared/proto/cline/task"
import React from "react"
import { TaskServiceClient } from "@/services/grpc-client"
import QuickWinCard from "./QuickWinCard"
import { QuickWinTask, quickWinTasks } from "./quickWinTasks"

export const SuggestedTasks: React.FC<{ shouldShowQuickWins: boolean }> = ({ shouldShowQuickWins }) => {
	const handleExecuteQuickWin = async (prompt: string) => {
		await TaskServiceClient.newTask(NewTaskRequest.create({ text: prompt, images: [] }))
	}

	if (shouldShowQuickWins) {
		return (
			<div className="px-4 pt-1 pb-3 select-none">
				<h2 className="text-sm font-medium mb-2.5 text-center">
					<span className="text-description">Quick </span>
					<span className="marie-brand-gradient-text font-semibold">[Wins]</span>
					<span className="text-description"> with Marie</span>
				</h2>
				<div className="flex flex-col space-y-1">
					{quickWinTasks.map((task: QuickWinTask) => (
						<QuickWinCard key={task.id} onExecute={() => handleExecuteQuickWin(task.prompt)} task={task} />
					))}
				</div>
			</div>
		)
	}
}
