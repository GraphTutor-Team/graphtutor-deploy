/**
 * GraphTutor V3.0 - 防抖Hook
 * 
 * 作用：提供防抖功能，延迟执行函数，避免频繁调用，常用于搜索输入、窗口resize等场景
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (搜索防抖)
 *   - pages/admin/OperationLogs.jsx (搜索防抖)
 *   - hooks/useUserManagement.js (使用此hook)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - 防抖算法
 *   - 清理定时器
 */

import { useEffect, useState } from 'react';

/**
 * 防抖Hook
 * @param {*} value - 要防抖的值
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {*} 防抖后的值
 */
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

