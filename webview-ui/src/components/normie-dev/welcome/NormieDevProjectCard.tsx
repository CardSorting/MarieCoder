import React from 'react'
import NormieDevCard from '../card/NormieDevCard'
import NormieDevBadge from '../badge/NormieDevBadge'
import { ProjectTemplate } from '@/services/normie-dev/projectService'

interface NormieDevProjectCardProps {
  project: ProjectTemplate
  onClick?: () => void
}

const NormieDevProjectCard: React.FC<NormieDevProjectCardProps> = ({
  project,
  onClick
}) => {
  return (
    <NormieDevCard onClick={onClick} className="cursor-pointer">
      <div className="space-y-3">
        <div>
          <h3 className="font-medium normie-dev-brand">{project.name}</h3>
          <p className="text-sm text-[var(--vscode-descriptionForeground)]">
            {project.description}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {project.tech.map((tech) => (
            <NormieDevBadge key={tech} variant="info" size="sm">
              {tech}
            </NormieDevBadge>
          ))}
        </div>
      </div>
    </NormieDevCard>
  )
}

export default NormieDevProjectCard
