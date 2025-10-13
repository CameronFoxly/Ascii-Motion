import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface AppRevealProps {
  children: ReactNode
}

export function AppReveal({ children }: AppRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    // Trigger the reveal animation immediately when this component mounts
    // This happens when Suspense resolves and the app is ready
    const timer = setTimeout(() => {
      setIsRevealed(true)
    }, 50) // Small delay to ensure smooth transition start

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative h-screen overflow-hidden">
      {/* App content */}
      <div className="h-full">
        {children}
      </div>
      
      {/* Theme-aware curtain that slides down */}
      <div 
        className={`
          fixed inset-0 bg-background z-50 transition-transform duration-200 ease-linear
          ${isRevealed ? 'translate-y-full' : 'translate-y-0'}
        `}
      />
    </div>
  )
}