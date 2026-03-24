/**
 * GraphTutor V3.0 - 应用入口文件
 * 
 * 作用：React应用的入口点，负责初始化应用、挂载根组件、初始化各种工具和功能
 * 关联页面：
 *   - App.jsx (根组件)
 *   - utils/accessibility.js (无障碍功能初始化)
 *   - utils/keyboardShortcuts.js (快捷键系统初始化)
 *   - utils/mobileOptimization.js (移动端优化初始化)
 *   - utils/csrf.js (CSRF token初始化)
 * 技术栈：
 *   - React 18 (createRoot)
 *   - ReactDOM
 *   - 应用初始化
 *   - 全局功能设置
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initAccessibility, addScreenReaderStyles } from './utils/accessibility.js'
import { initKeyboardShortcuts } from './utils/keyboardShortcuts.js'
import { initMobileOptimization } from './utils/mobileOptimization.js'
import { initCsrfToken } from './utils/csrf.js'

// 初始化无障碍功能
initAccessibility()
addScreenReaderStyles()

// 初始化快捷键系统
initKeyboardShortcuts()

// 初始化移动端优化
initMobileOptimization();

// 初始化CSRF token
initCsrfToken();

// 注册Service Worker (PWA支持)
// 开发环境禁用 Service Worker，避免缓存问题
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // 开发环境：注销已注册的 Service Worker
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('Service Worker unregistered for development');
    });
  });
}

// 错误边界：捕获渲染错误
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('找不到 #root 元素');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('[App] React 应用已成功挂载');
} catch (error) {
  console.error('[App] 应用启动失败:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1 style="color: #dc2626;">应用启动失败</h1>
        <p style="color: #6b7280;">错误信息: ${error.message}</p>
        <p style="color: #6b7280;">请检查浏览器控制台获取更多信息</p>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
          刷新页面
        </button>
      </div>
    `;
  }
}
