/**
 * GraphTutor V3.0 - 收藏管理器组件
 * 
 * 功能：管理所有收藏的学习资源
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getBookmarks,
  removeBookmark,
  getBookmarkStats,
  exportBookmarks,
  importBookmarks,
  clearAllBookmarks,
  BOOKMARK_TYPES,
} from '../utils/resourceBookmark';
import BookmarkButton from './BookmarkButton';

export default function BookmarkManager() {
  const [bookmarks, setBookmarks] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = () => {
    const allBookmarks = getBookmarks();
    setBookmarks(allBookmarks);
    setStats(getBookmarkStats());
  };

  const handleRemove = (type, resourceId) => {
    removeBookmark(type, resourceId);
    loadBookmarks();
  };

  const handleExport = () => {
    exportBookmarks();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          await importBookmarks(file);
          loadBookmarks();
          alert('导入成功');
        } catch (err) {
          alert('导入失败：' + err.message);
        }
      }
    };
    input.click();
  };

  const handleClearAll = () => {
    if (window.confirm('确定要清空所有收藏吗？此操作不可恢复。')) {
      clearAllBookmarks();
      loadBookmarks();
    }
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    if (selectedType && bookmark.type !== selectedType) return false;
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const title = bookmark.resourceData?.title || '';
      const content = bookmark.resourceData?.content || '';
      return (
        title.toLowerCase().includes(keyword) ||
        content.toLowerCase().includes(keyword)
      );
    }
    return true;
  });

  const getTypeLabel = (type) => {
    const labels = {
      [BOOKMARK_TYPES.QUESTION]: '题目',
      [BOOKMARK_TYPES.NOTE]: '笔记',
      [BOOKMARK_TYPES.DISCUSSION]: '讨论',
      [BOOKMARK_TYPES.KNOWLEDGE_NODE]: '知识点',
    };
    return labels[type] || type;
  };

  const getResourceLink = (bookmark) => {
    switch (bookmark.type) {
      case BOOKMARK_TYPES.QUESTION:
        return `/questions/${bookmark.resourceId}`;
      case BOOKMARK_TYPES.NOTE:
        return `/notes/${bookmark.resourceId}`;
      case BOOKMARK_TYPES.DISCUSSION:
        return `/discussions/${bookmark.resourceId}`;
      case BOOKMARK_TYPES.KNOWLEDGE_NODE:
        return `/knowledge/${bookmark.resourceId}`;
      default:
        return '#';
    }
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">⭐ 我的收藏</h2>
        <p className="text-slate-600 dark:text-slate-400">
          管理你收藏的学习资源
        </p>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.total}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">总收藏</div>
          </div>
          {Object.entries(stats.byType).map(([type, count]) => (
            <div
              key={type}
              className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
            >
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {count}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {getTypeLabel(type)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索收藏..."
            className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">全部类型</option>
            {Object.values(BOOKMARK_TYPES).map(type => (
              <option key={type} value={type}>
                {getTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            📥 导出
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            📤 导入
          </button>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            🗑️ 清空
          </button>
        </div>
      </div>

      {/* 收藏列表 */}
      <div className="space-y-2">
        {filteredBookmarks.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            {bookmarks.length === 0 ? '暂无收藏' : '没有找到匹配的收藏'}
          </div>
        ) : (
          filteredBookmarks.map(bookmark => (
            <div
              key={bookmark.id}
              className="p-4 border dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {getTypeLabel(bookmark.type)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(bookmark.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Link
                    to={getResourceLink(bookmark)}
                    className="block font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 mb-1"
                  >
                    {bookmark.resourceData?.title || `资源 ${bookmark.resourceId}`}
                  </Link>
                  {bookmark.resourceData?.content && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {bookmark.resourceData.content.substring(0, 100)}...
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  <BookmarkButton
                    type={bookmark.type}
                    resourceId={bookmark.resourceId}
                    onToggle={() => loadBookmarks()}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

