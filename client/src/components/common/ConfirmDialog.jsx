/**
 * GraphTutor V3.0 - 确认对话框组件
 * 
 * 功能：统一的确认对话框
 */

export default function ConfirmDialog({
  open = true,
  title = '确认操作',
  message = '确定要执行此操作吗？',
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'warning', // warning, danger, info
  children,
}) {
  if (open === false) return null;

  const typeStyles = {
    warning: {
      icon: '⚠️',
      confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
    },
    danger: {
      icon: '🗑️',
      confirmBg: 'bg-red-600 hover:bg-red-700',
    },
    info: {
      icon: 'ℹ️',
      confirmBg: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const styles = typeStyles[type] || typeStyles.warning;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{styles.icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {title}
            </h3>
            {children || <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 ${styles.confirmBg} text-white rounded-lg transition-colors`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
