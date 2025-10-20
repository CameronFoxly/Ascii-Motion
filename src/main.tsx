import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppReveal } from './components/common/AppReveal'
import App from './App'
import { SpeedInsights } from '@vercel/speed-insights/react'

// Preload fonts for SVG export (async, non-blocking)
import('./utils/font/fontLoader').then(({ fontLoader }) => {
  fontLoader.preloadBundledFonts().catch(err => {
    console.warn('[App] Font preloading failed:', err);
  });
});

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
