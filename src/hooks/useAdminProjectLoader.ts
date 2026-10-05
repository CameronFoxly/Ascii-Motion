import { useEffect, useCallback, useRef } from 'react';
import { SessionImporter } from '../utils/sessionImporter';
import type { SessionData } from '@ascii-motion/premium';

type TypographyCallbacks = Parameters<typeof SessionImporter.importSessionFile>[1];

export function useAdminProjectLoader(typographyCallbacks?: TypographyCallbacks) {
  // Keep the latest callbacks without re-running the one-shot sessionStorage effect
  const callbacksRef = useRef(typographyCallbacks);
  callbacksRef.current = typographyCallbacks;

  useEffect(() => {
    const stored = sessionStorage.getItem('_prj');
    if (stored) {
      try {
        const data = JSON.parse(stored) as SessionData;
        sessionStorage.removeItem('_prj');
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const file = new File([blob], 'session.asciimtn', { type: 'application/json' });
        SessionImporter.importSessionFile(file, callbacksRef.current);
      } catch {
        sessionStorage.removeItem('_prj');
      }
    }
  }, []);

  const loadProjectSession = useCallback(async (sessionData: SessionData) => {
    const blob = new Blob([JSON.stringify(sessionData)], { type: 'application/json' });
    const file = new File([blob], 'session.asciimtn', { type: 'application/json' });
    await SessionImporter.importSessionFile(file, callbacksRef.current);
  }, []);

  return {
    loadProjectSession,
  };
}
