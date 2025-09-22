import { lazy } from 'react'

// Add artificial delay to test loading screen
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Lazy load the main App component with delay for testing
export const LazyApp = lazy(() => 
  delay(2000).then(() => import('./App'))
)