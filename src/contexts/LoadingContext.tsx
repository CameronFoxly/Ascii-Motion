import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface LoadingContextType {
  isLoading: boolean
  setLoading: (loading: boolean) => void
  progress: number
  setProgress: (progress: number) => void
  loadingMessage: string
  setLoadingMessage: (message: string) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

interface LoadingProviderProps {
  children: ReactNode
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgressState] = useState(0)
  const [loadingMessage, setLoadingMessageState] = useState('Loading ASCII Motion...')

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const setProgress = useCallback((newProgress: number) => {
    setProgressState(Math.max(0, Math.min(100, newProgress)))
  }, [])

  const setLoadingMessage = useCallback((message: string) => {
    setLoadingMessageState(message)
  }, [])

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        setLoading,
        progress,
        setProgress,
        loadingMessage,
        setLoadingMessage,
      }}
    >
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

// Hook for simulating loading progress during app initialization
export function useAppInitialization() {
  const { setLoading, setProgress, setLoadingMessage } = useLoading()

  const initializeApp = useCallback(async () => {
    setLoading(true)
    setProgress(0)
    
    // Simulate different loading stages
    const stages = [
      { message: 'Loading ASCII Motion...', duration: 500, progress: 20 },
      { message: 'Initializing Canvas...', duration: 300, progress: 40 },
      { message: 'Loading Tools...', duration: 400, progress: 60 },
      { message: 'Setting up Animation...', duration: 300, progress: 80 },
      { message: 'Almost Ready...', duration: 200, progress: 100 },
    ]

    for (const stage of stages) {
      setLoadingMessage(stage.message)
      await new Promise(resolve => setTimeout(resolve, stage.duration))
      setProgress(stage.progress)
    }

    // Final delay to show 100% briefly
    await new Promise(resolve => setTimeout(resolve, 300))
    setLoading(false)
  }, [setLoading, setProgress, setLoadingMessage])

  return { initializeApp }
}