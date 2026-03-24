/**
 * GraphTutor V3.0 - 会话列表组件
 * 
 * 作用：显示消息会话列表
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';

export default function ConversationList({ 
  conversations, 
  selectedUserId, 
  onSelectUser,
  loading,
  searchResults,
  showSearch,
  user,
}) {
  const navigate = useNavigate();

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

  if (showSearch) {
    return (
      <div className="flex-1 overflow-y-auto">
        {searchResults.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="search" className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">未找到相关消息</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {searchResults.map(msg => (
              <button
                key={msg._id}
                onClick={() => {
                  onSelectUser(msg.senderId === user.id ? msg.receiverId : msg.senderId);
                }}
                className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  {(msg.senderId === user.id ? msg.receiver : msg.sender).avatarUrl ? (
                    <img
                      src={(msg.senderId === user.id ? msg.receiver : msg.sender).avatarUrl}
                      alt={(msg.senderId === user.id ? msg.receiver : msg.sender).name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {(msg.senderId === user.id ? msg.receiver : msg.sender).name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {msg.senderId === user.id ? msg.receiver.name : msg.sender.name}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading && conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <Icon name="message-circle" className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="font-medium text-slate-900 dark:text-slate-100">暂无会话</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          当前没有聊天会话。添加好友后即可在这里收发消息。下一步：去添加好友。
        </p>
        <button
          onClick={() => navigate('/friends')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          去添加好友
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map(conv => (
        <button
          key={conv.userId}
          onClick={() => onSelectUser(conv.userId)}
          className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
            selectedUserId === conv.userId
              ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
              : ''
          }`}
        >
          <div className="flex items-center space-x-3">
            {conv.avatarUrl ? (
              <img
                src={conv.avatarUrl}
                alt={conv.name}
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {conv.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {conv.name}
                </h3>
                {conv.unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              {conv.lastMessage && (
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
                  {conv.lastMessage.content}
                </p>
              )}
              {conv.lastMessageAt && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {formatTime(conv.lastMessageAt)}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

