import React from 'react'
import NormieDevHeader from '../header/NormieDevHeader'
import NormieDevBadge from '../badge/NormieDevBadge'

interface NormieDevChatHeaderProps {
  isActive: boolean
  taskCount?: number
}

const NormieDevChatHeader: React.FC<NormieDevChatHeaderProps> = ({
  isActive,
  taskCount = 0
}) => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-[var(--vscode-input-border)]">
      <NormieDevHeader variant="compact" />
      
      {isActive && (
        <div className="flex items-center space-x-2">
          <NormieDevBadge variant="info" size="sm">
            Active Task
          </NormieDevBadge>
          {taskCount > 0 && (
            <NormieDevBadge variant="default" size="sm">
              {taskCount}
            </NormieDevBadge>
          )}
        </div>
      )}
    </div>
  )
}

export default NormieDevChatHeader
