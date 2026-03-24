/**
 * GraphTutor V3.0 - 图表渲染优化
 * 
 * 功能：优化图表渲染性能
 */

import { useState } from 'react';
import { lazy } from 'react';

/**
 * 防抖函数
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 虚拟滚动优化（用于长列表）
 */
export function useVirtualScroll(items, itemHeight, containerHeight) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;
  
  return {
    visibleItems,
    offsetY,
    totalHeight,
    setScrollTop,
  };
}

/**
 * 图表数据采样（用于大数据集）
 */
export function sampleData(data, maxPoints = 100) {
  if (!Array.isArray(data) || data.length <= maxPoints) {
    return data;
  }
  
  const step = Math.ceil(data.length / maxPoints);
  const sampled = [];
  
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }
  
  // 确保包含最后一个点
  if (sampled[sampled.length - 1] !== data[data.length - 1]) {
    sampled.push(data[data.length - 1]);
  }
  
  return sampled;
}

/**
 * 延迟加载图表组件
 */
export function lazyLoadChart(importFunc) {
  return lazy(() => importFunc().then(module => ({ default: module })));
}

