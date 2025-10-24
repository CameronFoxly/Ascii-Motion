import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/bundled-fonts.css'
import { AppReveal } from './components/common/AppReveal'
import App from './App'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { preloadBundledFonts } from './utils/fontLoader'

// Preload bundled fonts during idle time
preloadBundledFonts();

// Set initial theme from localStorage or default to dark
const storedTheme = localStorage.getItem('ascii-motion-theme') || 'dark'
document.documentElement.classList.add(storedTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppReveal>
      <App />
    </AppReveal>
    <SpeedInsights />
  </StrictMode>,
)
