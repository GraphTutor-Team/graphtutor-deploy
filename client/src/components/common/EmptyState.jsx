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
  secondaryLabel,
  secondaryLink,
  className = '',
  // 兼容旧用法
  message,
  onAction,
}) {
  const resolvedTitle = title ?? message ?? '暂无数据';
  const resolvedAction = action ?? onAction;
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
      return icon;
    }

    if (iconType === 'emoji' || (typeof icon === 'string' && icon.length <= 2)) {
      return <div className="text-6xl mb-4">{icon}</div>;
    }

    const iconName = emojiMap[icon] || icon;
    return (
      <div className="mb-4 flex justify-center">
        <Icon name={iconName} size={64} color="#2563eb" />
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
      <div className="flex flex-wrap items-center justify-center gap-2">
        {resolvedAction && (
          <button
            type="button"
            onClick={resolvedAction}
            className="btn btn-primary"
          >
            {actionLabel || '立即开始'}
          </button>
        )}
        {actionLink && (
          <Link to={actionLink} className="btn btn-primary">
            {actionLabel || '立即开始'}
          </Link>
        )}
        {secondaryLink && (
          <Link to={secondaryLink} className="btn btn-outline">
            {secondaryLabel || '了解用法'}
          </Link>
        )}
      </div>
      {!secondaryLink && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <Link to="/home?guide=1" className="text-blue-600 dark:text-blue-400 hover:underline">
            使用教程
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/quiz" className="text-blue-600 dark:text-blue-400 hover:underline">
            开始练习
          </Link>
        </div>
      )}
    </div>
  );
}
