/**
 * GraphTutor V3.0 - 通知中心组件
 * 
 * 功能：显示和管理用户通知
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '../api/v3/notifications';
import { toast } from '../utils/toast';
import Icon from './common/Icon';

const TYPE_ICONS = {
  achievement: 'award',
  reply: 'message',
  like: 'thumbUp',
  reminder: 'clock',
  goal: 'target',
  system: 'bell',
  discussion: 'messageCircle',
};

const TYPE_COLORS = {
  achievement: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  reply: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  like: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  reminder: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  goal: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  system: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  discussion: 'bg-sky-50 text-sky-800 dark:bg-slate-800 dark:text-slate-300',
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // 点击外部关闭下拉菜单
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 定期刷新未读数量
  useEffect(() => {
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await getNotifications({ page, limit: 10 });
      if (page === 1) {
        setNotifications(result.data.items || []);
      } else {
        setNotifications(prev => [...prev, ...(result.data.items || [])]);
      }
      setHasMore(result.data.totalPages > page);
    } catch (err) {
      console.error('加载通知失败:', err);
      toast.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('加载未读数量失败:', err);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('已标记全部为已读');
    } catch (err) {
      console.error('标记全部已读失败:', err);
      toast.error('标记失败');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      toast.success('已删除');
    } catch (err) {
      console.error('删除通知失败:', err);
      toast.error('删除失败');
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const time = new Date(date);
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return time.toLocaleDateString('zh-CN');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) {
            loadNotifications();
          }
        }}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-md border dark:border-slate-700 z-50 max-h-[600px] flex flex-col">
          {/* 头部 */}
          <div className="p-4 border-b dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">通知中心</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  全部已读
                </button>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 通知列表 */}
          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">加载中...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="text-4xl mb-2">📭</div>
                <div>暂无通知</div>
              </div>
            ) : (
              <div className="divide-y dark:divide-slate-700">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                      !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          TYPE_COLORS[notification.type] || TYPE_COLORS.system
                        }`}
                      >
                        <Icon 
                          name={notification.icon || TYPE_ICONS[notification.type] || 'bell'} 
                          size={20}
                          color="currentColor"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {notification.content}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                              <span>{formatTime(notification.createdAt)}</span>
                              {notification.link && (
                                <Link
                                  to={notification.link}
                                  onClick={() => {
                                    handleMarkAsRead(notification._id);
                                    setShowDropdown(false);
                                  }}
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  查看详情 →
                                </Link>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification._id)}
                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                                title="标记为已读"
                              >
                                <span className="text-xs">✓</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification._id)}
                              className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                              title="删除"
                            >
                              <span className="text-xs">×</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部 */}
          {notifications.length > 0 && (
            <div className="p-3 border-t dark:border-slate-700 text-center">
              <Link
                to="/notifications"
                onClick={() => setShowDropdown(false)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                查看全部通知 →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

