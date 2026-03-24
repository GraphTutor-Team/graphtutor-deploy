/**
 * GraphTutor V3.0 - 空状态组件
 * 
 * 功能：统一显示空状态（无数据、无结果等）
 */

import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function EmptyState({
  icon = 'inbox',
  iconType = 'name', // 'name' | 'emoji' | 'element'
  title,
  description = '这里还没有内容',
  action,
  actionLabel,
  actionLink,
  className = '',
  // 兼容旧用法
  message,
  onAction,
}) {
  const resolvedTitle = title ?? message ?? '暂无数据';
  const resolvedAction = action ?? onAction;
  // 图标映射（向后兼容emoji）
  const emojiMap = {
    '📭': 'inbox',
    '📋': 'fileText',
    '🔍': 'search',
    '📚': 'book',
    '📝': 'notes',
    '📊': 'chartBar',
    '🎯': 'target',
    '⭐': 'star',
    '❤️': 'heart',
  };

  const renderIcon = () => {
    if (iconType === 'element' && typeof icon !== 'string') {
      // 如果传入的是React元素，直接渲染
      return icon;
    }
    
    if (iconType === 'emoji' || (typeof icon === 'string' && icon.length <= 2)) {
      // emoji模式（向后兼容）
      return <div className="text-6xl mb-4">{icon}</div>;
    }
    
    // 图标名称模式
    const iconName = emojiMap[icon] || icon;
    return (
      <div className="mb-4 flex justify-center">
        <Icon name={iconName} size={64} color="#6366f1" />
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {renderIcon()}
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {resolvedTitle}
      </h3>
      {description && (
        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
          {description}
        </p>
      )}
      {resolvedAction && (
        <button
          onClick={resolvedAction}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Icon name="plus" size={18} color="white" />
          {actionLabel || '立即开始'}
        </button>
      )}
      {actionLink && (
        <Link
          to={actionLink}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Icon name="plus" size={18} color="white" />
          {actionLabel || '立即开始'}
        </Link>
      )}
    </div>
  );
}
