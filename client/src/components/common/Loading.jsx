/**
 * GraphTutor V3.0 - 统一加载组件
 * 
 * 功能：提供统一的加载状态显示
 */

export default function Loading({ 
  text = '加载中...', 
  size = 'md',
  fullScreen = false,
  className = '' 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const containerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50'
    : 'flex items-center justify-center p-8';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <div
          className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
        />
        {text && (
          <div className="text-sm text-slate-600 font-medium">{text}</div>
        )}
      </div>
    </div>
  );
}

/**
 * 内联加载指示器（用于按钮等小空间）
 */
export function InlineLoading({ size = 'sm' }) {
  const sizeClasses = {
    xs: 'w-3 h-3 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-slate-300 border-t-blue-600 rounded-full animate-spin inline-block`}
    />
  );
}

/**
 * 骨架屏加载（用于列表等）
 */
export function SkeletonLoader({ count = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-20 bg-slate-200 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

