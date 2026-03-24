/**
 * GraphTutor V3.0 - Toast通知容器组件
 * 
 * 功能：统一管理Toast通知的显示
 */

import { useEffect, useState } from 'react';
import { toast } from '../../utils/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // 监听toast事件
    const handleToast = (event) => {
      const { message, type, duration = 3000 } = event.detail;
      const id = Date.now();
      
      setToasts(prev => [...prev, { id, message, type }]);
      
      // 自动移除
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    };

    window.addEventListener('toast', handleToast);
    return () => window.removeEventListener('toast', handleToast);
  }, []);

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${typeStyles[toast.type] || typeStyles.info} px-4 py-3 rounded-lg shadow-lg min-w-[300px] animate-slide-in-right`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

