import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  className?: string
}

export function LoadingScreen({ className = '' }: LoadingScreenProps) {
  const [dots, setDots] = useState('')
  const [progress, setProgress] = useState(0)

  // Animate the dots in "Loading ASCII Motion..."
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Simple progress that reflects "if we're still here, we're loading"
  useEffect(() => {
    // Start at 0
    setProgress(0)
    
    // Quickly show some progress
    const timer1 = setTimeout(() => setProgress(30), 50)
    const timer2 = setTimeout(() => setProgress(60), 150) 
    const timer3 = setTimeout(() => setProgress(90), 300)
    
    // If we're still mounted after 300ms, we're genuinely loading
    // The component will unmount when Suspense resolves, regardless of our progress
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2) 
      clearTimeout(timer3)
    }
  }, [])

  // Calculate dimensions based on content
  const textContent = `Loading ASCII Motion${dots.padEnd(3, ' ')}`
  const textWidth = textContent.length
  const loadingBarWidth = textWidth + 2 // Loading bar is 2 characters wider than text
  const containerWidth = textWidth + 10 // 5 chars padding on each side (not 2)
  const topPadding = ' '.repeat(containerWidth)
  const bottomPadding = ' '.repeat(containerWidth)

  return (
    <div className={`fixed inset-0 bg-background flex items-center justify-center ${className}`}>
      <div className="text-center">
        {/* Top corner brackets with proper spacing */}
        <div className="mb-6">
          <pre className="font-mono text-muted-foreground text-sm leading-none select-none">
┌{topPadding}┐
          </pre>
        </div>

        {/* Loading Text */}
        <div className="mb-6">
          <pre className="font-mono text-lg text-foreground leading-none select-none">
     {textContent}
          </pre>
        </div>

        {/* ASCII Loading Bar - 2 characters wider than text */}
        <div className="mb-6">
          <pre className="font-mono text-base leading-none select-none">
    <span className="text-purple-400">{'█'.repeat(Math.floor((progress / 100) * loadingBarWidth))}</span><span className="text-gray-600">{'░'.repeat(loadingBarWidth - Math.floor((progress / 100) * loadingBarWidth))}</span>
          </pre>
        </div>

        {/* Bottom corner brackets with proper spacing */}
        <div>
          <pre className="font-mono text-muted-foreground text-sm leading-none select-none">
└{bottomPadding}┘
          </pre>
        </div>
      </div>
    </div>
  )
}