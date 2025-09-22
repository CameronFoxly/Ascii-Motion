import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LazyApp } from './LazyApp'
import { LoadingScreen } from './components/common/LoadingScreen'
import { LoadingProvider } from './contexts/LoadingContext'
import { AppReveal } from './components/common/AppReveal'

// Set initial theme from localStorage or default to dark
const storedTheme = localStorage.getItem('ascii-motion-theme') || 'dark'
document.documentElement.classList.add(storedTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoadingProvider>
      <Suspense fallback={<LoadingScreen />}>
        <AppReveal>
          <LazyApp />
        </AppReveal>
      </Suspense>
    </LoadingProvider>
  </StrictMode>,
)
