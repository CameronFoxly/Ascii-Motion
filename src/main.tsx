import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/bundled-fonts.css'
import { AppReveal } from './components/common/AppReveal'
import App from './App'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { registerAllEffects } from './registry/effects'
import { registerAllPostEffects } from './registry/postEffects'
import { registerAllGenerators } from './registry/generators'

// Register all built-in effects in the procedural effects registry
registerAllEffects()

// Register all built-in post effects (WebGL shader-based)
registerAllPostEffects()

// Register all built-in procedural generators
registerAllGenerators()

// Set initial theme from localStorage or default to dark
const storedTheme = localStorage.getItem('ascii-motion-theme') || 'dark'
document.documentElement.classList.add(storedTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppReveal>
      <App />
    </AppReveal>
    <SpeedInsights />
  </StrictMode>
)
