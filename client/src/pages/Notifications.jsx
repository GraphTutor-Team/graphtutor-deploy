/**
 * GraphTutor V3.0 - 通知页面
 * 
 * 功能：查看和管理所有通知
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteNotifications } from '../api/v3/notifications';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';

const TYPE_ICONS = {
  achievement: '🎉',
  reply: '💬',
  like: '👍',
  reminder: '⏰',
  goal: '🎯',
  system: '🔔',
  discussion: '💭',
};

const TYPE_COLORS = {
  achievement: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  reply: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  like: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  reminder: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  goal: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  system: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  discussion: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    loadNotifications();
  }, [page, filter, typeFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await getNotifications({
        page,
        limit: 20,
        isRead: filter === 'unread' ? false : filter === 'read' ? true : null,
        type: typeFilter || null,
      });
      if (page === 1) {
        setNotifications(result.data.items || []);
      } else {
        setNotifications(prev => [...prev, ...(result.data.items || [])]);
      }
      setTotalPages(result.data.totalPages || 1);
    } catch (err) {
      console.error('加载通知失败:', err);
      toast.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      toast.success('已标记为已读');
    } catch (err) {
      console.error('标记已读失败:', err);
      toast.error('标记失败');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(typeFilter || null);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要删除的通知');
      return;
    }
    try {
      await deleteNotifications(Array.from(selectedIds));
      setNotifications(prev => prev.filter(n => !selectedIds.has(n._id)));
      setSelectedIds(new Set());
      toast.success(`已删除 ${selectedIds.size} 条通知`);
    } catch (err) {
      console.error('批量删除失败:', err);
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
    <div className="p-6 space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen">
      <PageHeader title="通知中心" subtitle="查看和管理你的所有通知" />

      {/* 筛选和操作 */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="all">全部</option>
              <option value="unread">未读</option>
              <option value="read">已读</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="">全部类型</option>
              <option value="achievement">成就</option>
              <option value="reply">回复</option>
              <option value="like">点赞</option>
              <option value="reminder">提醒</option>
              <option value="goal">目标</option>
              <option value="system">系统</option>
              <option value="discussion">讨论</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                删除选中 ({selectedIds.size})
              </button>
            )}
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              全部已读
            </button>
          </div>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-12 rounded-lg border dark:border-slate-700 text-center">
            <div className="text-slate-500">加载中...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-12 rounded-lg border dark:border-slate-700 text-center">
            <div className="text-4xl mb-2">📭</div>
            <div className="text-slate-500">暂无通知</div>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700 hover:shadow-md transition-shadow ${
                !notification.isRead ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(notification._id)}
                  onChange={(e) => {
                    const newSet = new Set(selectedIds);
                    if (e.target.checked) {
                      newSet.add(notification._id);
                    } else {
                      newSet.delete(notification._id);
                    }
                    setSelectedIds(newSet);
                  }}
                  className="mt-1"
                />
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${
                    TYPE_COLORS[notification.type] || TYPE_COLORS.system
                  }`}
                >
                  {notification.icon || TYPE_ICONS[notification.type] || '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base text-slate-900 dark:text-slate-100 mb-1">
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
                            onClick={() => handleMarkAsRead(notification._id)}
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
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="标记为已读"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification._id)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        title="删除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="px-4 py-2 border dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            上一页
          </button>
          <span className="px-4 py-2 text-slate-600 dark:text-slate-400">
            第 {page} / {totalPages} 页
          </span>
          <button
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

