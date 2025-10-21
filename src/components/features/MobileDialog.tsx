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
        className="w-[90vw] max-w-md p-6 max-h-[90vh] overflow-y-auto"
        hideClose={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Desktop Only</DialogTitle>
        
        <div className="flex flex-col gap-6">
          {/* ASCII Animation */}
          <div className="w-full flex items-center justify-center">
            <WelcomeAsciiAnimation />
          </div>
          
          {/* Message */}
          <p className="text-sm text-foreground leading-relaxed text-center px-2">
            ASCII Motion is a web app for creating and animating ASCII art. 
            Currently, only desktop editing is supported. Please visit{' '}
            <span className="font-semibold">ascii-motion.app</span> on a desktop 
            computer to start making ASCII art.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
