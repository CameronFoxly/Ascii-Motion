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

// Responsive breakpoints
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const COMPACT_BREAKPOINT = 1200;

export const useLayoutState = () => {
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // Check responsive breakpoints
  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      const mobile = width < MOBILE_BREAKPOINT;
      const tablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
      const compact = width >= TABLET_BREAKPOINT && width < COMPACT_BREAKPOINT;
      
      setIsMobile(mobile);
      setIsTablet(tablet);
      setIsCompact(compact);
      
      // Auto-collapse panels based on screen size
      if (mobile) {
        // Mobile: collapse side panels, keep timeline if needed
        setLayout(prev => ({
          ...prev,
          leftPanelOpen: false,
          rightPanelOpen: false,
        }));
      } else if (tablet) {
        // Tablet: may collapse one side panel for more canvas space
        setLayout(prev => ({
          ...prev,
          rightPanelOpen: false, // Prioritize left panel (tools) over right panel
        }));
      }
      // Desktop and larger: keep default layout
    };

    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
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
    isTablet,
    isCompact,
    toggleLeftPanel,
    toggleRightPanel,
    toggleBottomPanel,
  };
};
