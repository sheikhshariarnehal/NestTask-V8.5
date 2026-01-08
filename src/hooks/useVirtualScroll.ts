import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualScrollResult<T> {
  virtualItems: T[];
  totalHeight: number;
  offsetY: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Virtual Scrolling Hook
 * Renders only visible items for better performance with large lists
 */
export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
): VirtualScrollResult<T> {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleCount + overscan * 2
    );
    const offsetY = startIndex * itemHeight;

    return { startIndex, endIndex, offsetY };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const virtualItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  return {
    virtualItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
  };
}

/**
 * Virtual Scroll Container Component
 */
export function useVirtualScrollHandler(onScroll: (scrollTop: number) => void) {
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      onScroll(target.scrollTop);
    },
    [onScroll]
  );

  return { onScroll: handleScroll };
}

/**
 * Intersection Observer based infinite scroll
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  options: {
    threshold?: number;
    enabled?: boolean;
    hasMore?: boolean;
  } = {}
) {
  const { threshold = 0.8, enabled = true, hasMore = true } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !hasMore) {
      return;
    }

    const currentRef = loadMoreRef.current;
    if (!currentRef) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      {
        threshold,
      }
    );

    observerRef.current.observe(currentRef);

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef);
      }
    };
  }, [onLoadMore, threshold, enabled, hasMore]);

  return loadMoreRef;
}

/**
 * Windowed list with dynamic heights
 */
export function useWindowedList<T>(
  items: T[],
  getItemHeight: (item: T) => number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  const itemOffsets = useRef<number[]>([]);

  // Calculate cumulative offsets
  useEffect(() => {
    let offset = 0;
    itemOffsets.current = items.map((item) => {
      const height = getItemHeight(item);
      const currentOffset = offset;
      offset += height;
      return currentOffset;
    });
  }, [items, getItemHeight]);

  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const offsets = itemOffsets.current;
    if (offsets.length === 0) {
      return { startIndex: 0, endIndex: 0, offsetY: 0 };
    }

    // Binary search for start index
    let startIndex = 0;
    let left = 0;
    let right = offsets.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (offsets[mid] <= scrollTop) {
        startIndex = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // Find end index
    let endIndex = startIndex;
    const viewportBottom = scrollTop + containerHeight;
    while (
      endIndex < offsets.length - 1 &&
      offsets[endIndex] < viewportBottom
    ) {
      endIndex++;
    }

    return {
      startIndex: Math.max(0, startIndex - 1),
      endIndex: Math.min(items.length - 1, endIndex + 1),
      offsetY: offsets[startIndex] || 0,
    };
  }, [scrollTop, containerHeight, items.length]);

  const virtualItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  const totalHeight = useMemo(() => {
    if (itemOffsets.current.length === 0) return 0;
    const lastOffset = itemOffsets.current[itemOffsets.current.length - 1];
    const lastHeight = getItemHeight(items[items.length - 1]);
    return lastOffset + lastHeight;
  }, [items, getItemHeight]);

  return {
    virtualItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    setScrollTop,
  };
}
