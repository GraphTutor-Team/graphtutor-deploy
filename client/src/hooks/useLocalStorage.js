/**
 * GraphTutor V3.0 - 本地存储Hook
 * 
 * 作用：简化localStorage的使用，支持JSON序列化/反序列化，自动同步React状态和localStorage
 * 关联页面：
 *   - 所有需要持久化存储的组件
 *   - utils/theme.js (主题设置存储)
 *   - utils/studyReminder.js (提醒设置存储)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - LocalStorage API
 *   - JSON序列化
 *   - 状态同步
 */

import { useState, useEffect } from 'react';

/**
 * 本地存储Hook
 * @param {string} key - 存储键
 * @param {*} initialValue - 初始值
 * @returns {[value, setValue]} 值和设置函数
 */
export function useLocalStorage(key, initialValue) {
  // 从localStorage读取初始值
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`读取localStorage失败 [${key}]:`, error);
      return initialValue;
    }
  });

  // 设置值的函数
  const setValue = (value) => {
    try {
      // 支持函数式更新
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`保存localStorage失败 [${key}]:`, error);
    }
  };

  return [storedValue, setValue];
}

