/**
 * GraphTutor V3.0 - 消息列表组件
 * 
 * 作用：显示聊天消息列表
 */

import { useRef, useEffect } from 'react';
import Icon from '../common/Icon';

export default function MessageList({ 
  messages, 
  user, 
  selectedConversation,
  loading,
  loadingMore,
  onScroll,
  onContextMenu,
  onRecallMessage,
  messagesEndRef,
  messagesContainerRef,
}) {
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <Icon name="message-circle" className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">暂无消息</p>
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {loadingMore && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">加载更多...</p>
        </div>
      )}
      {messages.map((msg, index) => {
        // 判断是否需要显示时间分组
        const showTimeGroup = index === 0 || (() => {
          const prevMsg = messages[index - 1];
          const prevTime = new Date(prevMsg.createdAt);
          const currentTime = new Date(msg.createdAt);
          const diffMinutes = (currentTime - prevTime) / 60000;
          return diffMinutes > 30; // 超过30分钟显示时间分组
        })();

        return (
          <div key={msg._id}>
            {showTimeGroup && (
              <div className="text-center py-2">
                <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  {(() => {
                    const date = new Date(msg.createdAt);
                    const now = new Date();
                    const diffDays = Math.floor((now - date) / 86400000);
                    if (diffDays === 0) return '今天';
                    if (diffDays === 1) return '昨天';
                    if (diffDays < 7) return `${diffDays}天前`;
                    return date.toLocaleDateString('zh-CN');
                  })()}
                </span>
              </div>
            )}
            <div
              className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
                {msg.senderId !== user.id && (
                  <div className="flex-shrink-0">
                    {selectedConversation?.avatarUrl ? (
                      <img
                        src={selectedConversation.avatarUrl}
                        alt={selectedConversation.name}
                        className="h-6 w-6 rounded-full"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                        {selectedConversation?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                )}
                <div
                  onContextMenu={(e) => onContextMenu(e, msg)}
                  className={`px-4 py-2 rounded-lg relative group ${
                    msg.senderId === user.id
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className="flex items-center justify-end space-x-1 mt-1">
                    <p
                      className={`text-xs ${
                        msg.senderId === user.id
                          ? 'text-blue-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                    {msg.senderId === user.id && (
                      <>
                        <span className="text-xs">
                          {msg.isRead ? (
                            <Icon name="check-circle-2" className="h-3 w-3 text-blue-200" />
                          ) : (
                            <Icon name="check" className="h-3 w-3 text-blue-200" />
                          )}
                        </span>
                        {!msg.isRecalled && (() => {
                          const now = new Date();
                          const msgTime = new Date(msg.createdAt);
                          const diffMinutes = (now - msgTime) / 60000;
                          return diffMinutes <= 2 ? (
                            <button
                              onClick={() => onRecallMessage(msg)}
                              className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-200 hover:text-white"
                              title="撤回消息（2分钟内）"
                            >
                              <Icon name="undo" className="h-3 w-3" />
                            </button>
                          ) : null;
                        })()}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

