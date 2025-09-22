import { lazy } from 'react'

// Lazy load the main App component to enable code splitting
export const LazyApp = lazy(() => import('./App'))