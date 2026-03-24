/**
 * GraphTutor V3.0 - 空状态组件
 * 
 * 功能：显示空数据状态的友好界面
 */

import Icon from './Icon';

export default function Empty({
  title = '暂无数据',
  description = '',
  icon = 'inbox',
  iconType = 'name', // 'name' | 'emoji' | 'element'
  action = null,
  actionLabel = '',
  className = '',
}) {
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
      return icon;
    }
    
    if (iconType === 'emoji' || (typeof icon === 'string' && icon.length <= 2)) {
      return <div className="text-6xl mb-4">{icon}</div>;
    }
    
    const iconName = emojiMap[icon] || icon;
    return (
      <div className="mb-4 flex justify-center">
        <Icon name={iconName} size={64} color="#6366f1" />
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {renderIcon()}
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Icon name="plus" size={18} color="white" />
          {actionLabel || '立即创建'}
        </button>
      )}
    </div>
  );
}

/**
 * 空列表状态
 */
export function EmptyList({ 
  message = '暂无数据',
  onCreate = null,
  createLabel = '创建第一个',
  className = '' 
}) {
  return (
    <Empty
      title={message}
      description="还没有任何数据，点击下方按钮开始创建吧"
      icon="fileText"
      action={onCreate}
      actionLabel={createLabel}
      className={className}
    />
  );
}

/**
 * 空搜索结果
 */
export function EmptySearch({ 
  keyword = '',
  onClear = null,
  className = '' 
}) {
  return (
    <Empty
      title="未找到相关结果"
      description={keyword ? `没有找到与"${keyword}"相关的内容` : '没有找到相关内容'}
      icon="search"
      action={onClear}
      actionLabel="清除筛选"
      className={className}
    />
  );
}

/**
 * 无权限状态
 */
export function EmptyPermission({ 
  message = '您没有权限访问此内容',
  className = '' 
}) {
  return (
    <Empty
      title="访问受限"
      description={message}
      icon="lock"
      className={className}
    />
  );
}

