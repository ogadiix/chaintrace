import { useState, useEffect, useCallback } from 'react';

/**
 * Type-safe, zero-dependency HTML5 History client-side router for ChainTrace.
 * Handles synchronizing browser URL, history pushState, and popstate navigation.
 */

export type AppRoute =
  | '/'
  | '/login'
  | '/register'
  | '/forgot-password'
  | '/dashboard'
  | '/cases'
  | '/investigations'
  | '/reports'
  | '/integrations'
  | '/settings'
  | string;

export interface RouterState {
  path: string;
  search: string;
  params: Record<string, string>;
  navigate: (to: string, replace?: boolean) => void;
}

// Global listener registry for synchronized tab navigation
const listeners: Array<() => void> = [];

export function navigate(to: string, replace: boolean = false): void {
  if (replace) {
    window.history.replaceState(null, '', to);
  } else {
    window.history.pushState(null, '', to);
  }
  listeners.forEach((listener) => listener());
}

export function useRouter(): RouterState {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [currentSearch, setCurrentSearch] = useState<string>(() => window.location.search || '');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setCurrentSearch(window.location.search || '');
    };

    listeners.push(handlePopState);
    window.addEventListener('popstate', handlePopState);

    return () => {
      const idx = listeners.indexOf(handlePopState);
      if (idx !== -1) listeners.splice(idx, 1);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Parse path parameters e.g., /cases/:id or /investigations/:id
  const params: Record<string, string> = {};
  const segments = currentPath.split('/').filter(Boolean);

  if (segments[0] === 'cases' && segments[1]) {
    params.caseId = segments[1];
  } else if (segments[0] === 'investigations' && segments[1]) {
    params.investigationId = segments[1];
  }

  const handleNavigate = useCallback((to: string, replace?: boolean) => {
    navigate(to, replace);
    setCurrentPath(to.split('?')[0]);
    setCurrentSearch(to.includes('?') ? '?' + to.split('?')[1] : '');
  }, []);

  return {
    path: currentPath,
    search: currentSearch,
    params,
    navigate: handleNavigate,
  };
}
