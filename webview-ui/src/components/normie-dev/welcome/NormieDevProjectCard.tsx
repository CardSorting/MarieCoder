import React from "react"
import { ProjectTemplate } from "@/services/normie-dev/projectService"
import NormieDevBadge from "../badge/NormieDevBadge"
import NormieDevCard from "../card/NormieDevCard"

interface NormieDevProjectCardProps {
	project: ProjectTemplate
	onClick?: () => void
}

const NormieDevProjectCard: React.FC<NormieDevProjectCardProps> = ({ project, onClick }) => {
	return (
		<NormieDevCard className="cursor-pointer" onClick={onClick}>
			<div className="space-y-3">
				<div>
					<h3 className="font-medium normie-dev-brand">{project.name}</h3>
					<p className="text-sm text-[var(--vscode-descriptionForeground)]">{project.description}</p>
				</div>

				<div className="flex flex-wrap gap-1">
					{project.tech.map((tech) => (
						<NormieDevBadge key={tech} size="sm" variant="info">
							{tech}
						</NormieDevBadge>
					))}
				</div>
			</div>
		</NormieDevCard>
	)
}

export default NormieDevProjectCard
