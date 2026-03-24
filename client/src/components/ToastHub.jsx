import { useEffect, useState, useCallback } from 'react';
import { TOAST_CONFIG } from '../constants/index.js';

export default function ToastHub(){
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const showToast = (m) => {
      if (m == null) {
        setMsg(null);
        return;
      }
      setMsg(String(m));
      const timer = setTimeout(() => {
        setMsg(null);
      }, TOAST_CONFIG.DEFAULT_DURATION);
      
      // 返回清理函数（虽然这里不需要，但保持一致性）
      return () => clearTimeout(timer);
    };

    window.toast = showToast;

    return () => {
      if (window.toast === showToast) {
        delete window.toast;
      }
    };
  }, []);

  if(!msg) return null;
  
  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-black text-white text-sm px-3 py-2 shadow-lg">
      {msg}
    </div>
  );
}
