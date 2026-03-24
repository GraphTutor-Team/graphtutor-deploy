/**
 * GraphTutor V3.0 - 错误边界回退组件
 * 
 * 功能：显示友好的错误界面
 */

export default function ErrorBoundaryFallback({ error, resetError }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          出错了
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          应用遇到了一个错误，我们已经记录了这个问题。
        </p>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-slate-500 dark:text-slate-400 mb-2">
              错误详情（开发模式）
            </summary>
            <pre className="text-xs bg-slate-100 dark:bg-slate-700 p-4 rounded overflow-auto max-h-40">
              {error.toString()}
              {error.stack && `\n${error.stack}`}
            </pre>
          </details>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            刷新页面
          </button>
          {resetError && (
            <button
              onClick={resetError}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              重试
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

