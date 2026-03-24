/**
 * GraphTutor V3.0 - Toast通知系统
 * 
 * 作用：提供全局的Toast通知功能，用于显示成功、错误、警告和信息提示
 * 关联页面：
 *   - 全站使用 (所有需要显示提示的页面)
 *   - components/common/ToastContainer.jsx (Toast容器组件)
 * 技术栈：
 *   - 事件监听器模式
 *   - 消息队列管理
 *   - 自动消失功能
 */

// 简单的Toast实现（如果项目中没有Toast系统）
let toastListeners = [];

export const toast = {
  /**
   * 显示成功消息
   */
  success: (message, duration = 3000) => {
    showToast(message, 'success', duration);
  },

  /**
   * 显示错误消息
   */
  error: (message, duration = 5000) => {
    showToast(message, 'error', duration);
  },

  /**
   * 显示警告消息
   */
  warning: (message, duration = 4000) => {
    showToast(message, 'warning', duration);
  },

  /**
   * 显示信息消息
   */
  info: (message, duration = 3000) => {
    showToast(message, 'info', duration);
  },

  /**
   * 订阅Toast事件
   */
  subscribe: (listener) => {
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  },
};

function showToast(message, type, duration) {
  // 如果项目已有Toast系统，使用现有的
  if (window.toastHub) {
    window.toastHub.show(message, type, duration);
    return;
  }

  // 否则使用简单的alert（可以后续替换为更好的UI）
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  // 触发自定义事件
  const event = new CustomEvent('toast', {
    detail: { message, type, duration, icon: icons[type] },
  });
  window.dispatchEvent(event);

  // 通知所有监听器
  toastListeners.forEach((listener) => {
    listener({ message, type, duration });
  });
}

/**
 * 处理API错误并显示Toast
 */
export function handleApiError(error, defaultMessage = '操作失败') {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    defaultMessage;
  
  toast.error(message);
  console.error('API Error:', error);
  
  return message;
}

/**
 * 处理API成功并显示Toast
 */
export function handleApiSuccess(message = '操作成功') {
  toast.success(message);
}

