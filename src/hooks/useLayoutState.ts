import { useState, useEffect } from 'react';

interface LayoutState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
}

const DEFAULT_LAYOUT: LayoutState = {
  leftPanelOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: true,
};

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768;

export const useLayoutState = () => {
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT);
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      
      // Auto-collapse panels on mobile
      if (mobile) {
        setLayout(prev => ({
          ...prev,
          leftPanelOpen: false,
          rightPanelOpen: false,
        }));
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleLeftPanel = () => {
    setLayout(prev => ({ ...prev, leftPanelOpen: !prev.leftPanelOpen }));
  };

  const toggleRightPanel = () => {
    setLayout(prev => ({ ...prev, rightPanelOpen: !prev.rightPanelOpen }));
  };

  const toggleBottomPanel = () => {
    setLayout(prev => ({ ...prev, bottomPanelOpen: !prev.bottomPanelOpen }));
  };

  return {
    layout,
    isMobile,
    toggleLeftPanel,
    toggleRightPanel,
    toggleBottomPanel,
  };
};
