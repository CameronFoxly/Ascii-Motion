/**
 * Welcome Dialog Hook
 * 
 * Manages the welcome dialog state with localStorage persistence.
 * Shows dialog on:
 * - First visit to the site
 * - After a major version update (e.g., 0.2.x → 0.3.x)
 * 
 * Uses 'ascii-motion-welcome-state' localStorage key.
 */

import { useState, useEffect } from 'react';
import { VERSION } from '@/constants/version';
import type { WelcomeState } from '@/types/welcomeDialog';

const STORAGE_KEY = 'ascii-motion-welcome-state';

/**
 * Get the major version string (e.g., "0.2" from "0.2.1")
 */
const getMajorVersion = (version: string): string => {
  return version.split('.').slice(0, 2).join('.');
};

/**
 * Get welcome state from localStorage
 */
const getWelcomeState = (): WelcomeState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as WelcomeState;
  } catch (error) {
    console.error('Failed to parse welcome state:', error);
    return null;
  }
};

/**
 * Save welcome state to localStorage
 */
const saveWelcomeState = (state: WelcomeState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save welcome state:', error);
  }
};

/**
 * Determine if welcome dialog should show
 */
const shouldShowWelcome = (): boolean => {
  const state = getWelcomeState();
  
  // First visit - show welcome
  if (!state || !state.hasSeenWelcome) {
    return true;
  }
  
  // Check if major version has changed
  const currentMajorVersion = getMajorVersion(VERSION);
  const lastSeenMajorVersion = getMajorVersion(state.lastSeenVersion || '0.0');
  
  return currentMajorVersion !== lastSeenMajorVersion;
};

/**
 * Hook for managing welcome dialog state
 */
export const useWelcomeDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if we should show the welcome dialog
    if (shouldShowWelcome()) {
      // Delay showing by 500ms for smooth page load
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  /**
   * Handle dialog close
   * Saves state to localStorage if user checked "don't show again"
   */
  const handleClose = (open: boolean) => {
    if (!open && dontShowAgain) {
      // User closed dialog with "don't show again" checked
      const state: WelcomeState = {
        hasSeenWelcome: true,
        lastSeenVersion: getMajorVersion(VERSION),
        dismissedAt: new Date().toISOString(),
      };
      saveWelcomeState(state);
    } else if (!open) {
      // User closed dialog without checking "don't show again"
      // Save minimal state so it shows again next time
      const state: WelcomeState = {
        hasSeenWelcome: false,
        lastSeenVersion: getMajorVersion(VERSION),
        dismissedAt: new Date().toISOString(),
      };
      saveWelcomeState(state);
    }
    
    setIsOpen(open);
  };

  return {
    isOpen,
    setIsOpen: handleClose,
    dontShowAgain,
    setDontShowAgain,
  };
};
