import { useState, useEffect } from 'react';

interface LayoutState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
}

interface UserPreferences {
  leftPanelPreferred: boolean;
  rightPanelPreferred: boolean;
  bottomPanelPreferred: boolean;
}

const DEFAULT_LAYOUT: LayoutState = {
  leftPanelOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: true,
};

const DEFAULT_PREFERENCES: UserPreferences = {
  leftPanelPreferred: true,
  rightPanelPreferred: true,
  bottomPanelPreferred: true,
};

// Responsive breakpoints
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const COMPACT_BREAKPOINT = 1200;

export const useLayoutState = () => {
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // Check responsive breakpoints
  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      const prevMobile = isMobile;
      const prevTablet = isTablet;
      
      const mobile = width < MOBILE_BREAKPOINT;
      const tablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
      const compact = width >= TABLET_BREAKPOINT && width < COMPACT_BREAKPOINT;
      
      setIsMobile(mobile);
      setIsTablet(tablet);
      setIsCompact(compact);
      
      // Responsive panel management with preference restoration
      if (mobile) {
        // Mobile: collapse side panels, keep timeline if needed
        setLayout(prev => ({
          ...prev,
          leftPanelOpen: false,
          rightPanelOpen: false,
        }));
      } else if (tablet) {
        // Tablet: collapse right panel, restore left if user preferred it
        setLayout(prev => ({
          ...prev,
          leftPanelOpen: userPreferences.leftPanelPreferred,
          rightPanelOpen: false, // Always collapse right panel on tablet
        }));
      } else {
        // Desktop and larger: restore user preferences if coming from smaller screen
        if (prevMobile || prevTablet) {
          setLayout(prev => ({
            ...prev,
            leftPanelOpen: userPreferences.leftPanelPreferred,
            rightPanelOpen: userPreferences.rightPanelPreferred,
            bottomPanelOpen: userPreferences.bottomPanelPreferred,
          }));
        }
      }
    };

    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, [isMobile, isTablet, userPreferences]);

  const toggleLeftPanel = () => {
    setLayout(prev => {
      const newState = !prev.leftPanelOpen;
      // Update user preference when manually toggled
      setUserPreferences(prefs => ({ ...prefs, leftPanelPreferred: newState }));
      return { ...prev, leftPanelOpen: newState };
    });
  };

  const toggleRightPanel = () => {
    setLayout(prev => {
      const newState = !prev.rightPanelOpen;
      // Update user preference when manually toggled
      setUserPreferences(prefs => ({ ...prefs, rightPanelPreferred: newState }));
      return { ...prev, rightPanelOpen: newState };
    });
  };

  const toggleBottomPanel = () => {
    setLayout(prev => {
      const newState = !prev.bottomPanelOpen;
      // Update user preference when manually toggled
      setUserPreferences(prefs => ({ ...prefs, bottomPanelPreferred: newState }));
      return { ...prev, bottomPanelOpen: newState };
    });
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
