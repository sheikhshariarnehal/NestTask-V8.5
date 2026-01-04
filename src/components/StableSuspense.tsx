import React, { Suspense, useState, useEffect, useRef, ReactNode } from 'react';

interface StableSuspenseProps {
  fallback: ReactNode;
  children: ReactNode;
  keepPreviousOnSuspend?: boolean;
}

/**
 * StableSuspense is a wrapper around React Suspense that prevents
 * blank screens when the tab becomes visible again after being hidden.
 * 
 * It caches the last successfully rendered children and shows them
 * while the new content is loading, instead of showing the fallback.
 */
export function StableSuspense({ 
  fallback, 
  children, 
  keepPreviousOnSuspend = true 
}: StableSuspenseProps) {
  const [isReady, setIsReady] = useState(true);
  const previousChildrenRef = useRef<ReactNode>(null);
  const hasRenderedRef = useRef(false);
  
  // Track visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to let React reconcile
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Store previous children when they render successfully
  useEffect(() => {
    if (children) {
      previousChildrenRef.current = children;
      hasRenderedRef.current = true;
    }
  }, [children]);
  
  // Use previous children as fallback if we've rendered before and keepPreviousOnSuspend is true
  const effectiveFallback = keepPreviousOnSuspend && hasRenderedRef.current && previousChildrenRef.current 
    ? previousChildrenRef.current 
    : fallback;
  
  return (
    <Suspense fallback={effectiveFallback}>
      {isReady ? children : effectiveFallback}
    </Suspense>
  );
}

/**
 * A hook to track if we should show a loading state
 * Returns false during tab switches to prevent flicker
 */
export function useStableLoading(isLoading: boolean): boolean {
  const [stableLoading, setStableLoading] = useState(isLoading);
  const wasHiddenRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHiddenRef.current = true;
      } else if (document.visibilityState === 'visible') {
        // If we were hidden and now visible, delay showing loading state
        if (wasHiddenRef.current) {
          // Clear any existing timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          // Wait a bit before allowing loading state
          timeoutRef.current = window.setTimeout(() => {
            wasHiddenRef.current = false;
          }, 500);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    // Don't show loading if we just came back from hidden state
    if (wasHiddenRef.current && isLoading) {
      return;
    }
    setStableLoading(isLoading);
  }, [isLoading]);
  
  return stableLoading;
}
