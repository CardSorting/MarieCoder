import React from 'react'
import { NormieDevWelcome, NormieDevProjectCard } from '../index'
import { projectTemplates } from '@/services/normie-dev/projectService'

// Simple example showing how to use NormieDev components
const WelcomeExample: React.FC = () => {
  const handleGetStarted = () => {
    console.log('Get started clicked')
  }

  const handleTakeTour = () => {
    console.log('Take tour clicked')
  }

  const handleProjectClick = (projectId: string) => {
    console.log('Project clicked:', projectId)
  }

  return (
    <div className="space-y-6">
      <NormieDevWelcome 
        onGetStarted={handleGetStarted}
        onTakeTour={handleTakeTour}
      />
      
      <div className="space-y-4">
        <h2 className="text-lg font-medium normie-dev-brand">
          Quick Start Projects
        </h2>
        
        <div className="grid gap-4">
          {projectTemplates.map((project) => (
            <NormieDevProjectCard
              key={project.id}
              project={project}
              onClick={() => handleProjectClick(project.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default WelcomeExample
