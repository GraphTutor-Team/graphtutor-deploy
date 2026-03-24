/**
 * GraphTutor V3.0 - 分页Hook
 * 
 * 作用：提供统一的分页逻辑处理，包括页码、每页数量、总数等状态管理
 * 关联页面：
 *   - 所有需要分页的页面组件
 *   - hooks/useUserManagement.js (用户管理分页)
 * 技术栈：
 *   - React Hooks (useState, useCallback)
 *   - 分页计算逻辑
 *   - 状态管理
 */

import { useState, useCallback } from 'react';

/**
 * 分页Hook
 * @param {Object} options - 选项
 * @returns {Object} 分页状态和方法
 */
export function usePagination(options = {}) {
  const {
    initialPage = 1,
    initialLimit = 20,
    initialTotal = 0,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(initialTotal);

  const totalPages = Math.ceil(total / limit);

  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    limit,
    total,
    totalPages,
    setPage,
    setLimit,
    setTotal,
    goToPage,
    nextPage,
    prevPage,
    reset,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

