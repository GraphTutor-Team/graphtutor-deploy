/**
 * GraphTutor V3.0 - 通用API数据获取Hook
 * 
 * 作用：统一处理API数据获取、加载状态、错误处理，提供数据刷新功能，简化组件中的数据获取逻辑
 * 关联页面：
 *   - 所有需要从API获取数据的页面组件
 *   - utils/errorHandler.js (错误处理)
 * 技术栈：
 *   - React Hooks (useState, useEffect, useCallback)
 *   - 异步数据获取
 *   - 错误处理
 *   - 加载状态管理
 */

import { useState, useEffect, useCallback } from 'react';
import { handleApiError } from '../utils/errorHandler';

/**
 * 通用API数据获取Hook
 * @param {Function} apiFunction - API函数
 * @param {Object} params - API参数
 * @param {Object} options - 选项
 * @returns {Object} { data, loading, error, refetch }
 */
export function useApiData(apiFunction, params = {}, options = {}) {
  const {
    immediate = true, // 是否立即执行
    onSuccess, // 成功回调
    onError, // 错误回调
    dependencies = [], // 依赖项
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!apiFunction) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(params);
      setData(result.data || result);
      if (onSuccess) {
        onSuccess(result.data || result);
      }
    } catch (err) {
      const errorMessage = handleApiError(err, '加载数据失败', { showToast: false });
      setError(errorMessage);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [apiFunction, JSON.stringify(params), onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate, fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

