/**
 * GraphTutor V3.0 - 批量操作组件
 * 
 * 功能：提供统一的批量操作界面
 */

import { useState } from 'react';

export default function BatchActions({
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  onDeselectAll,
  actions = [],
  className = '',
}) {
  const [showMenu, setShowMenu] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-blue-900">
            已选择 <strong>{selectedCount}</strong> 项
            {totalCount > 0 && ` / ${totalCount}`}
          </span>
          <div className="flex gap-2">
            {onSelectAll && (
              <button
                onClick={onSelectAll}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                全选
              </button>
            )}
            {onDeselectAll && (
              <button
                onClick={onDeselectAll}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                取消选择
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions.map((action, index) => {
            if (action.type === 'dropdown') {
              return (
                <div key={index} className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {action.label} ▼
                  </button>
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[150px]">
                        {action.items.map((item, itemIndex) => (
                          <button
                            key={itemIndex}
                            onClick={() => {
                              item.onClick();
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            }

            return (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`px-3 py-1.5 text-sm rounded ${
                  action.variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : action.variant === 'secondary'
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

