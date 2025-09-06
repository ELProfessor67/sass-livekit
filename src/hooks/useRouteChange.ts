import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook to detect route changes and trigger callbacks
 * Useful for refreshing data when navigating between pages
 */
export function useRouteChange(callback: () => void, dependencies: any[] = []) {
  const location = useLocation();
  const prevLocationRef = useRef(location.pathname);

  useEffect(() => {
    // Only trigger callback if the route actually changed
    if (prevLocationRef.current !== location.pathname) {
      prevLocationRef.current = location.pathname;
      callback();
    }
  }, [location.pathname, callback, ...dependencies]);
}

/**
 * Hook to trigger API calls on route changes with proper dependency management
 */
export function useRouteChangeData(
  fetchFn: () => Promise<any>,
  dependencies: any[] = [],
  options: {
    enabled?: boolean;
    refetchOnRouteChange?: boolean;
  } = {}
) {
  const { enabled = true, refetchOnRouteChange = true } = options;

  useRouteChange(() => {
    if (enabled && refetchOnRouteChange) {
      fetchFn();
    }
  }, dependencies);

  return { refetch: fetchFn };
}
