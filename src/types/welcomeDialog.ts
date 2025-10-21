/**
 * Welcome Dialog Types
 * 
 * Type definitions for the welcome experience dialog that shows
 * on first visit and after major version updates.
 */

export type WelcomeMediaType = 'image' | 'video' | 'youtube' | 'component';

export interface WelcomeMedia {
  type: WelcomeMediaType;
  src?: string; // URL for image/video
  embedId?: string; // YouTube video ID
  component?: React.ComponentType; // React component for demos
  placeholder?: string; // Placeholder image URL before loading
  alt: string; // Alt text for accessibility
}

export interface WelcomeCTA {
  text: string;
  action: () => void; // Function to execute (close dialog, activate tool, etc.)
  variant?: 'default' | 'outline' | 'ghost';
}

export interface WelcomeSecondaryCTA {
  text: string;
  href: string; // External link URL
}

export interface WelcomeTab {
  id: string;
  title: string;
  description: string;
  cta?: WelcomeCTA;
  secondaryCta?: WelcomeSecondaryCTA;
  media: WelcomeMedia;
}

export interface WelcomeState {
  hasSeenWelcome: boolean;
  lastSeenVersion: string; // e.g., "0.2" (major.minor only)
  dismissedAt: string; // ISO timestamp
}
