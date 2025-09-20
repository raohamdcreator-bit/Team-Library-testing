// src/hooks/useCache.js
import { useState, useEffect, useRef, useMemo } from 'react';

// Simple in-memory cache with TTL support
class Cache {
  constructor() {
    this.data = new Map();
    this.timers = new Map();
  }

  set(key, value, ttl = 300000) { // Default 5 minutes TTL
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set data
    this.data.set(key, {
      value,
      timestamp: Date.now()
    });

    // Set expiration timer
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      this.timers.set(key, timer);
    }
  }

  get(key) {
    const item = this.data.get(key);
    return item ? item.value : undefined;
  }

  has(key) {
    return this.data.has(key);
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.data.delete(key);
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.data.clear();
  }

  size() {
    return this.data.size;
  }

  // Get cache stats
  getStats() {
    const now = Date.now();
    let totalSize = 0;
    let oldestTimestamp = now;

    this.data.forEach(item => {
      totalSize += JSON.stringify(item.value).length;
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
      }
    });

    return {
      entries: this.data.size,
      totalSize,
      oldestEntry: now - oldestTimestamp
    };
  }
}

// Global cache instance
const globalCache = new Cache();

// Hook for caching data
export function useCache(key, fetcher, options = {}) {
  const {
    ttl = 300000, // 5 minutes default
    enabled = true,
    onError,
    staleWhileRevalidate = false
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  
  // Update fetcher ref when it changes
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Fetch data function
  const fetchData = async (forceRefresh = false) => {
    if (!enabled || !key) return;

    // Check cache first (unless forcing refresh)
    if (!forceRefresh && globalCache.has(key)) {
      const cachedData = globalCache.get(key);
      setData(cachedData);
      setError(null);
      return cachedData;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();
      
      // Cache the result
      globalCache.set(key, result, ttl);
      setData(result);
      
      return result;
    } catch (err) {
      setError(err);
      if (onError) onError(err);
      
      // If stale-while-revalidate and we have cached data, keep using it
      if (staleWhileRevalidate && globalCache.has(key)) {
        const staleData = globalCache.get(key);
        setData(staleData);
        return staleData;
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [key, enabled]);

  // Manual refresh
  const refresh = () => fetchData(true);
  
  // Clear cache for this key
  const clearCache = () => {
    globalCache.delete(key);
    setData(null);
  };

  return {
    data,
    loading,
    error,
    refresh,
    clearCache,
    isStale: false // Could be enhanced to track staleness
  };
}

// Hook for debounced values (performance optimization for search)
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for throttled function calls
export function useThrottle(callback, delay = 1000) {
  const lastRun = useRef(Date.now());

  return useMemo(() => {
    return (...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    };
  }, [callback, delay]);
}

// Hook for virtual scrolling (for large lists)
export function useVirtualScroll(items, itemHeight = 60, containerHeight = 400) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState(null);

  const visibleRange = useMemo(() => {
    if (!items.length) return { start: 0, end: 0, visibleItems: [] };

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 1, items.length);

    return {
      start,
      end,
      visibleItems: items.slice(start, end)
    };
  }, [items, scrollTop, itemHeight, containerHeight]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return {
    containerRef: setContainerRef,
    visibleItems: visibleRange.visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  };
}

// Hook for intersection observer (lazy loading)
export function useIntersectionObserver(options = {}) {
  const [entry, setEntry] = useState(null);
  const [node, setNode] = useState(null);

  const observer = useRef(null);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);

    if (node) observer.current.observe(node);

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [node, options]);

  return [setNode, entry];
}

// Performance monitoring hook
export function usePerformanceMonitor(name) {
  const startTime = useRef(null);
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    renderCount: 0,
    averageRenderTime: 0
  });

  useEffect(() => {
    startTime.current = performance.now();
  });

  useEffect(() => {
    const endTime = performance.now();
    if (startTime.current) {
      const renderTime = endTime - startTime.current;
      
      setMetrics(prev => {
        const newRenderCount = prev.renderCount + 1;
        const totalTime = (prev.averageRenderTime * prev.renderCount) + renderTime;
        
        return {
          renderTime,
          renderCount: newRenderCount,
          averageRenderTime: totalTime / newRenderCount
        };
      });

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected in ${name}: ${renderTime.toFixed(2)}ms`);
      }
    }
  });

  return metrics;
}

// Memory usage hook (for development)
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState(null);

  useEffect(() => {
    if (!performance.memory) return;

    const updateMemoryInfo = () => {
      setMemoryInfo({
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      });
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

// Cache management utilities
export const CacheUtils = {
  // Get global cache stats
  getStats() {
    return globalCache.getStats();
  },

  // Clear all cache
  clearAll() {
    globalCache.clear();
  },

  // Clear cache by pattern
  clearByPattern(pattern) {
    const keys = Array.from(globalCache.data.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        globalCache.delete(key);
      }
    });
  },

  // Preload data into cache
  preload(key, data, ttl) {
    globalCache.set(key, data, ttl);
  }
};