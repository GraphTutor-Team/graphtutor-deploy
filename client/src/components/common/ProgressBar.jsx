/**
 * GraphTutor V3.0 - 进度条组件
 * 
 * 功能：显示进度条
 */

export default function ProgressBar({
  value = 0,
  max = 100,
  showLabel = true,
  label,
  variant = 'default', // default, success, warning, danger, info
  size = 'md', // sm, md, lg
  animated = false,
  className = '',
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const variantStyles = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600',
    info: 'bg-cyan-600',
  };

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label || `${Math.round(percentage)}%`}
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {value} / {max}
          </span>
        </div>
      )}
      <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`${variantStyles[variant]} ${sizeStyles[size]} rounded-full transition-all duration-300 ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

