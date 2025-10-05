import React from 'react'
import NormieDevHeader from '../header/NormieDevHeader'
import NormieDevButton from '../button/NormieDevButton'
import { NORMIE_DEV } from '@/utils/normie-dev/constants'

interface NormieDevWelcomeProps {
  onGetStarted?: () => void
  onTakeTour?: () => void
}

const NormieDevWelcome: React.FC<NormieDevWelcomeProps> = ({
  onGetStarted,
  onTakeTour
}) => {
  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      <NormieDevHeader variant="default" />
      
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-xl font-semibold normie-dev-brand">
          What can I build for you?
        </h1>
        
        <p className="text-sm text-[var(--vscode-descriptionForeground)]">
          I specialize in Next.js and SQLite development, applying the Marie Kondo methodology 
          to make development spark joy!
        </p>
      </div>

      <div className="flex flex-col space-y-3 w-full max-w-xs">
        <NormieDevButton 
          variant="primary" 
          onClick={onGetStarted}
          className="w-full"
        >
          Get Started
        </NormieDevButton>
        
        <NormieDevButton 
          variant="ghost" 
          onClick={onTakeTour}
          className="w-full"
        >
          Take a Tour
        </NormieDevButton>
      </div>
    </div>
  )
}

export default NormieDevWelcome
