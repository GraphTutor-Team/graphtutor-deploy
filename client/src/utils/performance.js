/**
 * GraphTutor V3.0 - 性能优化工具
 * 
 * 功能：提供性能优化相关的工具函数
 */

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300) {
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
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 图片懒加载
 * @param {string} selector - 图片选择器
 */
export function lazyLoadImages(selector = 'img[data-src]') {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll(selector).forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    // 降级方案：直接加载所有图片
    document.querySelectorAll(selector).forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}

/**
 * 虚拟滚动优化
 * @param {Array} items - 数据项
 * @param {number} itemHeight - 每项高度
 * @param {number} containerHeight - 容器高度
 * @param {number} scrollTop - 滚动位置
 * @returns {Object} 可见项范围
 */
export function getVisibleRange(items, itemHeight, containerHeight, scrollTop) {
  const start = Math.floor(scrollTop / itemHeight);
  const end = Math.min(
    start + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  return { start, end, visibleItems: items.slice(start, end) };
}

/**
 * 批量处理数据
 * @param {Array} data - 要处理的数据
 * @param {Function} processor - 处理函数
 * @param {number} batchSize - 每批大小
 * @param {Function} onProgress - 进度回调
 * @returns {Promise} 处理结果
 */
export async function batchProcess(data, processor, batchSize = 10, onProgress) {
  const results = [];
  const total = data.length;
  
  for (let i = 0; i < total; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    if (onProgress) {
      onProgress({
        processed: Math.min(i + batchSize, total),
        total,
        percentage: ((i + batchSize) / total * 100).toFixed(1),
      });
    }
    
    // 让出控制权，避免阻塞UI
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
}

/**
 * 内存缓存
 */
export class MemoryCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl; // 默认5分钟
  }

  set(key, value, customTtl) {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: customTtl || this.ttl,
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    return this.cache.has(key) && this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

/**
 * 请求去重
 * @param {Function} requestFn - 请求函数
 * @param {number} ttl - 去重时间窗口（毫秒）
 * @returns {Function} 去重后的请求函数
 */
export function dedupeRequests(requestFn, ttl = 1000) {
  const pending = new Map();
  
  return async function(...args) {
    const key = JSON.stringify(args);
    const now = Date.now();
    
    // 检查是否有正在进行的相同请求
    if (pending.has(key)) {
      const { promise, timestamp } = pending.get(key);
      if (now - timestamp < ttl) {
        return promise;
      }
    }
    
    // 创建新请求
    const promise = requestFn(...args).finally(() => {
      pending.delete(key);
    });
    
    pending.set(key, { promise, timestamp: now });
    return promise;
  };
}

/**
 * 性能监控
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.maxMetrics = 100;
  }

  start(label) {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.record(label, duration);
        return duration;
      },
    };
  }

  record(label, duration) {
    this.metrics.push({ label, duration, timestamp: Date.now() });
    
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
    
    // 如果性能较差，输出警告
    if (duration > 1000) {
      console.warn(`[Performance] ${label} took ${duration.toFixed(2)}ms`);
    }
  }

  getMetrics(label) {
    if (label) {
      return this.metrics.filter(m => m.label === label);
    }
    return this.metrics;
  }

  getAverage(label) {
    const filtered = label ? this.getMetrics(label) : this.metrics;
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
    return sum / filtered.length;
  }

  clear() {
    this.metrics = [];
  }

  report() {
    const report = {};
    const labels = [...new Set(this.metrics.map(m => m.label))];
    
    labels.forEach(label => {
      const labelMetrics = this.getMetrics(label);
      report[label] = {
        count: labelMetrics.length,
        average: this.getAverage(label),
        min: Math.min(...labelMetrics.map(m => m.duration)),
        max: Math.max(...labelMetrics.map(m => m.duration)),
      };
    });
    
    return report;
  }
}

/**
 * 资源预加载
 * @param {Array} resources - 资源列表（URL或对象）
 */
export function preloadResources(resources) {
  resources.forEach(resource => {
    const url = typeof resource === 'string' ? resource : resource.url;
    const as = resource.as || 'fetch';
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    
    if (resource.crossorigin) {
      link.crossOrigin = resource.crossorigin;
    }
    
    document.head.appendChild(link);
  });
}

/**
 * 代码分割辅助函数
 * @param {Function} importFn - 动态导入函数
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise} 导入结果
 */
export function loadComponent(importFn, timeout = 5000) {
  return Promise.race([
    importFn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Component load timeout')), timeout)
    ),
  ]);
}

/**
 * 优化长列表渲染
 * @param {Array} items - 列表项
 * @param {Function} renderFn - 渲染函数
 * @param {number} chunkSize - 每批渲染数量
 * @param {Function} onChunk - 每批完成回调
 */
export async function renderListInChunks(items, renderFn, chunkSize = 50, onChunk) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map(renderFn));
    
    if (onChunk) {
      onChunk({ processed: Math.min(i + chunkSize, items.length), total: items.length });
    }
    
    // 让出控制权
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

