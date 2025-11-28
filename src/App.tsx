import './App.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { CanvasProvider, useCanvasContext } from './contexts/CanvasContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useCloudProject, GalleryHeaderText, NotificationButton, AdminCheckProvider } from '@ascii-motion/premium'
import { ThemeToggle } from './components/common/ThemeToggle'
import { AccountButton } from './components/features/AccountButton'
import { HamburgerMenu } from './components/features/HamburgerMenu'
import { GalleryMobileMenu } from './components/features/GalleryMobileMenu'
import { ExportImportButtons } from './components/features/ExportImportButtons'
import { useCloudDialogState } from './hooks/useCloudDialogState'
import { useCloudProjectActions } from './hooks/useCloudProjectActions'
import { useAuth, usePasswordRecoveryCallback, useEmailVerificationCallback, UpdatePasswordDialog, SignInDialog } from '@ascii-motion/premium'
import { AsciiMotionLogo } from './components/common/AsciiMotionLogo'
import { InlineProjectNameEditor } from './components/features/InlineProjectNameEditor'
import { SaveToCloudDialog } from './components/features/SaveToCloudDialog'
import { ProjectsDialog } from './components/features/ProjectsDialog'
import { SilentSaveHandler } from './components/features/SilentSaveHandler'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'
import { MobileDialog } from './components/features/MobileDialog'
import { BrushSizePreviewOverlay } from './components/features/BrushSizePreviewOverlay'
import { PublishToGalleryDialogWrapper } from './components/features/PublishToGalleryDialogWrapper'
import { PerformanceOverlay } from './components/common/PerformanceOverlay'
import { EditorPage } from './pages/EditorPage'
import { CommunityPage } from './pages/CommunityPage'
import { useAdminProjectLoader } from './hooks/useAdminProjectLoader'

/**
 * Auth Redirect Component
 * Handles deep links from marketing site (/auth/signup, /auth/login)
 * Redirects to root and opens the appropriate dialog
 */
function AuthRedirect({ type }: { type: 'signup' | 'login' }) {
  const navigate = useNavigate()
  
  useEffect(() => {
    // Navigate to root first
    navigate('/', { replace: true })
    
    // Then dispatch event to open the appropriate dialog
    // Use setTimeout to ensure navigation completes first
    setTimeout(() => {
      if (type === 'signup') {
        window.dispatchEvent(new CustomEvent('openSignUpDialog'))
      } else {
        window.dispatchEvent(new CustomEvent('open-signin-dialog'))
      }
    }, 100)
  }, [navigate, type])
  
  // Return the editor page while redirecting (prevents flash)
  return <EditorPage />
}

/**
 * Inner component that uses auth hooks
 * This component is rendered inside AuthProvider
 * Fixed: Moved useAuth hook inside AuthProvider context
 */
function AppContent() {
  // Admin project loader (handles sessionStorage loading after navigation)
  useAdminProjectLoader();
  
  // Get typography callbacks from CanvasContext
  const { setFontSize, setCharacterSpacing, setLineSpacing, setSelectedFontId } = useCanvasContext()
  
  // Cloud storage state and actions
  const { user } = useAuth()
  const { loadFromCloud } = useCloudProject()
  const { 
    showSaveToCloudDialog, 
    showProjectsDialog,
    setShowSaveToCloudDialog,
    setShowProjectsDialog,
  } = useCloudDialogState()
  const {
    handleLoadFromCloud: loadFromCloudBase,
    handleDownloadProject,
    projectsRefreshTrigger,
  } = useCloudProjectActions()

  // Wrapper that includes typography callbacks
  const handleLoadFromCloud = useCallback(
    async (projectId: string, sessionData: unknown) => {
      await loadFromCloudBase(projectId, sessionData, {
        setFontSize,
        setCharacterSpacing,
        setLineSpacing,
        setSelectedFontId,
      });
    },
    [loadFromCloudBase, setFontSize, setCharacterSpacing, setLineSpacing, setSelectedFontId]
  );

  // Track if we've already processed URL parameters (prevents infinite loop)
  const processedUrlRef = useRef(false);

  // Handle URL parameters for remix flow
  useEffect(() => {
    // Skip if already processed
    if (processedUrlRef.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search)
    const projectId = params.get('project')
    const isRemix = params.get('remix') === 'true'
    const manageProjects = params.get('manage-projects') === 'true'

    // Open "My Projects" dialog if requested
    if (manageProjects && user) {
      processedUrlRef.current = true;
      setShowProjectsDialog(true)
      // Clean up URL immediately
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      return
    }

    // Auto-load project if specified
    if (projectId && user && isRemix) {
      processedUrlRef.current = true;
      // Clean up URL IMMEDIATELY to prevent re-triggers
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      // Fetch project data then load it
      const loadRemixedProject = async () => {
        try {
          const cloudProject = await loadFromCloud(projectId)
          if (cloudProject) {
            await handleLoadFromCloud(projectId, cloudProject.sessionData)
          }
        } catch (error) {
          console.error('Failed to load remixed project:', error)
        }
      }
      
      loadRemixedProject()
    }
  }, [user, handleLoadFromCloud, loadFromCloud, setShowProjectsDialog])

  // Password recovery callback detection
  const { isRecovery, resetRecovery } = usePasswordRecoveryCallback()
  const [showUpdatePasswordDialog, setShowUpdatePasswordDialog] = useState(isRecovery)

  // Email verification callback detection
  useEmailVerificationCallback()

  // State for sign-in dialog (for email verification toast button)
  const [showSignInDialog, setShowSignInDialog] = useState(false)

  // Listen for custom event to open sign-in dialog
  useEffect(() => {
    const handleOpenSignIn = () => {
      setShowSignInDialog(true)
    }
    
    window.addEventListener('open-signin-dialog', handleOpenSignIn)
    return () => window.removeEventListener('open-signin-dialog', handleOpenSignIn)
  }, [])

  // Navigation
  const navigate = useNavigate()
  const location = useLocation()
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  // Check if we're on community routes
  const isCommunityRoute = location.pathname.startsWith('/community')
  
  // State for gallery header text animation
  const [isGalleryTextVisible, setIsGalleryTextVisible] = useState(false)
  
  // Setup IntersectionObserver for hero animation on gallery page
  useEffect(() => {
    if (!isCommunityRoute) {
      setIsGalleryTextVisible(false)
      return
    }
    
    // Wait for the hero animation element to be rendered
    const checkForHeroElement = () => {
      const heroElement = document.querySelector('[data-hero-animation="true"]')
      if (!heroElement) {
        // Retry after a short delay if element not found
        setTimeout(checkForHeroElement, 100)
        return
      }
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Show text when hero is NOT in viewport (exiting)
            // Hide text when hero IS in viewport (entering)
            setIsGalleryTextVisible(!entry.isIntersecting)
          })
        },
        {
          threshold: 0.1, // Trigger when 10% of hero is visible
          rootMargin: '0px',
        }
      )
      
      observer.observe(heroElement)
      
      return () => {
        observer.disconnect()
      }
    }
    
    // Start checking for the hero element
    const cleanup = checkForHeroElement()
    
    return cleanup
  }, [isCommunityRoute, location.pathname])

  // Update dialog visibility when recovery state changes
  useEffect(() => {
    setShowUpdatePasswordDialog(isRecovery)
  }, [isRecovery])

  const handleUpdatePasswordClose = (open: boolean) => {
    setShowUpdatePasswordDialog(open)
    if (!open) {
      resetRecovery()
    }
  }

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] bg-background text-foreground">
        {/* Header - adaptive design with fixed height */}
        <header className="flex-shrink-0 border-b border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16">
          <div className="px-4 h-full">
            <div className="flex items-center h-full">
              {isCommunityRoute ? (
                /* Community Gallery Header Layout */
                <>
                  {/* Left side - Hamburger menu */}
                  <div className="flex gap-3 items-center flex-shrink-0">
                    <GalleryMobileMenu />
                  </div>
                  
                  {/* Center - Animated Gallery Text (slides in from bottom) - Hidden below 1210px */}
                  <div className="flex-1 items-center justify-center overflow-hidden min-w-0 hidden xl:flex" style={{ height: '64px' }}>
                    <div
                      className={`transition-all duration-300 ease-in-out ${
                        isGalleryTextVisible
                          ? 'translate-y-0 opacity-100'
                          : 'translate-y-full opacity-0'
                      }`}
                    >
                      <GalleryHeaderText autoPlay={true} />
                    </div>
                  </div>
                  
                  {/* Spacer - visible when animation is hidden */}
                  <div className="flex-1 xl:hidden"></div>
                  
                  {/* Right side - Theme toggle + Account */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ThemeToggle />
                    {user && <NotificationButton />}
                    <AccountButton />
                  </div>
                </>
              ) : (
                /* Editor Header Layout */
                <>
                  {/* Left side - Hamburger + ASCII Motion Logo */}
                  <div className="flex gap-3 relative items-center">
                    <HamburgerMenu 
                      onOpenGallery={() => navigate('/community')}
                      onOpenPublish={() => setShowPublishDialog(true)}
                    />
                    <AsciiMotionLogo 
                      onClick={() => navigate('/')}
                      height={32}
                    />
                  </div>
                  
                  {/* Center - Project name editor */}
                  <div className="flex-1 flex justify-center">
                    <InlineProjectNameEditor />
                  </div>
                  
                  {/* Right side - Export/Import + Theme toggle + Account */}
                  <div className="flex items-center gap-2">
                    <ExportImportButtons />
                    <ThemeToggle />
                    {user && <NotificationButton />}
                    <AccountButton />
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Routes - Main app vs Community gallery */}
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/community/*" element={<CommunityPage />} />
          <Route path="/auth/signup" element={<AuthRedirect type="signup" />} />
          <Route path="/auth/login" element={<AuthRedirect type="login" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Global Dialogs - Available on all routes */}
          {user && (
            <>
              {/* Silent Save Handler - Handles Ctrl+S for already-saved projects */}
              <SilentSaveHandler />
              
              <SaveToCloudDialog 
                open={showSaveToCloudDialog} 
                onOpenChange={setShowSaveToCloudDialog} 
              />
              <ProjectsDialog
                open={showProjectsDialog}
                onOpenChange={setShowProjectsDialog}
                onLoadProject={handleLoadFromCloud}
                onDownloadProject={handleDownloadProject}
                refreshTrigger={projectsRefreshTrigger}
              />
              
              {/* Publish to Gallery Dialog - Community feature */}
              <PublishToGalleryDialogWrapper
                isOpen={showPublishDialog}
                onOpenChange={setShowPublishDialog}
                onPublishSuccess={(projectId) => {
                  console.log('Published project:', projectId)
                  setShowPublishDialog(false)
                  
                  // Show success toast with link to gallery
                  toast.success('Published to community gallery', {
                    description: 'Your project is now live!',
                    action: {
                      label: 'Go to gallery',
                      onClick: () => {
                        window.location.href = '/community'
                      }
                    },
                    duration: 5000,
                  })
                }}
              />
            </>
          )}
          
          {/* Password Recovery Dialog - Shows when user clicks email reset link */}
          <UpdatePasswordDialog 
            open={showUpdatePasswordDialog} 
            onOpenChange={handleUpdatePasswordClose}
          />
          
          {/* Sign In Dialog - Shows after email verification */}
          <SignInDialog 
            open={showSignInDialog} 
            onOpenChange={setShowSignInDialog}
          />
          
          {/* Mobile Dialog - Shows on mobile devices to inform about desktop-only support */}
          <MobileDialog />
          
          {/* Brush Size Preview Overlay - Shows when adjusting brush size */}
          <BrushSizePreviewOverlay />
        
        {/* Performance Overlay for Development */}
        <PerformanceOverlay />
        
        {/* Toast Notifications */}
        <Toaster />
        
        {/* Vercel Analytics */}
        <Analytics />
      </div>
  )
}

/**
 * App wrapper component
 * Provides AuthProvider, ThemeProvider, CanvasProvider, and BrowserRouter context
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminCheckProvider>
          <ThemeProvider>
            <CanvasProvider>
              <AppContent />
            </CanvasProvider>
          </ThemeProvider>
        </AdminCheckProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
