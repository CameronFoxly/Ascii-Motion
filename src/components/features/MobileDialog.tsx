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
  
  // Check if mobile on mount
  React.useEffect(() => {
    if (isMobileDevice()) {
      setIsOpen(true);
    }
  }, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[90vw] max-w-md p-6">
        <DialogTitle className="sr-only">Desktop Only</DialogTitle>
        
        <div className="flex flex-col gap-4">
          {/* ASCII Animation */}
          <div className="w-full">
            <WelcomeAsciiAnimation />
          </div>
          
          {/* Message */}
          <p className="text-sm text-foreground leading-relaxed text-center">
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
