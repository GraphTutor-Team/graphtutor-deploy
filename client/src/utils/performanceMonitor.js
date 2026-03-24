/**
 * GraphTutor V3.0 - 前端性能监控工具
 * 
 * 功能：监控前端性能指标，记录慢操作
 */

/**
 * 性能监控类
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.slowThreshold = 1000; // 慢操作阈值（毫秒）
  }

  /**
   * 开始性能监控
   * @param {string} name - 操作名称
   * @returns {Function} 结束监控的函数
   */
  start(name) {
    const startTime = performance.now();
    const startMemory = performance.memory?.usedJSHeapSize || 0;

    return () => {
      const endTime = performance.now();
      const endMemory = performance.memory?.usedJSHeapSize || 0;
      const duration = endTime - startTime;
      const memoryDelta = endMemory - startMemory;

      const metric = {
        name,
        duration: Math.round(duration),
        memoryDelta: memoryDelta > 0 ? Math.round(memoryDelta / 1024) : 0, // KB
        timestamp: new Date().toISOString(),
      };

      this.metrics.push(metric);

      // 如果是慢操作，记录警告
      if (duration > this.slowThreshold) {
        console.warn(`[Performance] Slow operation: ${name} took ${Math.round(duration)}ms`);
      }

      return metric;
    };
  }

  /**
   * 获取性能报告
   * @returns {Object} 性能报告
   */
  getReport() {
    const totalMetrics = this.metrics.length;
    if (totalMetrics === 0) {
      return { message: 'No metrics recorded' };
    }

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = Math.round(totalDuration / totalMetrics);
    const slowOperations = this.metrics.filter(m => m.duration > this.slowThreshold);
    const maxDuration = Math.max(...this.metrics.map(m => m.duration));

    return {
      totalOperations: totalMetrics,
      averageDuration: `${avgDuration}ms`,
      maxDuration: `${maxDuration}ms`,
      slowOperations: slowOperations.length,
      slowOperationsList: slowOperations.map(m => ({
        name: m.name,
        duration: `${m.duration}ms`,
      })),
    };
  }

  /**
   * 清除所有指标
   */
  clear() {
    this.metrics = [];
  }

  /**
   * 获取页面加载性能
   * @returns {Object} 页面加载性能数据
   */
  getPageLoadMetrics() {
    if (!performance.timing) {
      return null;
    }

    const timing = performance.timing;
    const navigation = performance.getEntriesByType('navigation')[0];

    if (navigation) {
      return {
        dns: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
        tcp: Math.round(navigation.connectEnd - navigation.connectStart),
        request: Math.round(navigation.responseStart - navigation.requestStart),
        response: Math.round(navigation.responseEnd - navigation.responseStart),
        dom: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
        load: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        total: Math.round(navigation.loadEventEnd - navigation.fetchStart),
      };
    }

    // 降级方案
    return {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      load: timing.loadEventEnd - timing.loadEventStart,
      total: timing.loadEventEnd - timing.fetchStart,
    };
  }
}

// 创建单例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 监控API请求性能
 * @param {Function} apiCall - API调用函数
 * @param {string} endpoint - API端点名称
 * @returns {Promise} API调用结果
 */
export async function monitorApiCall(apiCall, endpoint) {
  const end = performanceMonitor.start(`API: ${endpoint}`);
  try {
    const result = await apiCall();
    end();
    return result;
  } catch (error) {
    end();
    throw error;
  }
}

/**
 * 监控组件渲染性能
 * @param {string} componentName - 组件名称
 * @param {Function} renderFn - 渲染函数
 */
export function monitorComponentRender(componentName, renderFn) {
  const end = performanceMonitor.start(`Render: ${componentName}`);
  const result = renderFn();
  end();
  return result;
}

