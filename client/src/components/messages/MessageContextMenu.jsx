/**
 * GraphTutor V3.0 - 消息右键菜单组件
 * 
 * 作用：消息右键菜单（复制、转发、撤回、删除）
 */

import Icon from '../common/Icon';

export default function MessageContextMenu({ 
  contextMenu, 
  user,
  onCopy,
  onForward,
  onRecall,
  onDelete,
  onClose,
}) {
  if (!contextMenu) return null;

  const message = contextMenu.message;
  const canRecall = message.senderId === user.id && !message.isRecalled && (() => {
    const now = new Date();
    const msgTime = new Date(message.createdAt);
    const diffMinutes = (now - msgTime) / 60000;
    return diffMinutes <= 2;
  })();

  return (
    <div
      className="fixed bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg z-50 py-1 min-w-[120px]"
      style={{
        left: `${contextMenu.x}px`,
        top: `${contextMenu.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onCopy(message.content);
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
      >
        <Icon name="copy" className="h-4 w-4" />
        <span>复制</span>
      </button>
      <button
        onClick={() => {
          onForward(message);
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
      >
        <Icon name="forward" className="h-4 w-4" />
        <span>转发</span>
      </button>
      {canRecall && (
        <button
          onClick={() => {
            onRecall(message);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
        >
          <Icon name="undo" className="h-4 w-4" />
          <span>撤回</span>
        </button>
      )}
      <button
        onClick={() => {
          onDelete(message);
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
      >
        <Icon name="trash" className="h-4 w-4" />
        <span>删除</span>
      </button>
    </div>
  );
}

