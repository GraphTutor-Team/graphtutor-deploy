/**
 * GraphTutor V3.0 - 交叉观察器Hook
 * 
 * 功能：检测元素是否进入视口，用于无限滚动等场景
 */

import { useEffect, useRef, useState } from 'react';

/**
 * 交叉观察器Hook
 * @param {Object} options - 选项
 * @returns {[ref, isIntersecting]} ref和是否相交
 */
export function useIntersectionObserver(options = {}) {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState(null);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin]);

  return [elementRef, isIntersecting, entry];
}

