/**
 * Mobile Dialog Component
 * 
 * Shows on mobile devices to inform users that ASCII Motion
 * is a desktop-only web application.
 */

import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { WelcomeAsciiAnimation } from './WelcomeAsciiAnimation';

/**
 * Detects if the user is on a mobile device
 */
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for touch capability and screen size
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768; // Typical mobile breakpoint
  
  // Check user agent for mobile keywords
  const mobileUserAgentRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUserAgent = mobileUserAgentRegex.test(navigator.userAgent);
  
  return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
};

export const MobileDialog: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  
  // Check if mobile on mount
  React.useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    if (mobile) {
      setIsOpen(true);
    }
  }, []);
  
  // Don't render anything if not mobile
  if (!isMobile) return null;
  
  return (
    <Dialog open={isOpen} modal={true}>
      <DialogContent 
        className="w-[95vw] max-w-md p-4 max-h-[90vh] overflow-y-auto focus:outline-none focus-visible:outline-none"
        hideClose={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Desktop Only</DialogTitle>
        
        <div className="flex flex-col gap-6 items-center">
          {/* ASCII Animation - constrained to prevent overflow */}
          <div className="w-full max-w-full overflow-hidden flex items-center justify-center">
            <div className="max-w-full">
              <WelcomeAsciiAnimation />
            </div>
          </div>
          
          {/* Message */}
          <p className="text-sm text-foreground leading-relaxed text-center">
            ASCII Motion is a web app for creating and animating ASCII art. 
            Currently, only desktop editing is supported. Please visit{' '}
            <a 
              href="https://ascii-motion.app" 
              className="font-semibold text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              ascii-motion.app
            </a>{' '}
            on a desktop computer to start making ASCII art.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
