/**
 * GraphTutor V3.0 - 收藏按钮组件
 * 
 * 功能：用于收藏/取消收藏学习资源
 */

import { useState, useEffect } from 'react';
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
} from '../utils/resourceBookmark';

export default function BookmarkButton({
  type,
  resourceId,
  resourceData = {},
  onToggle,
  className = '',
}) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setBookmarked(isBookmarked(type, resourceId));
  }, [type, resourceId]);

  const handleToggle = () => {
    if (bookmarked) {
      removeBookmark(type, resourceId);
      setBookmarked(false);
    } else {
      addBookmark(type, resourceId, resourceData);
      setBookmarked(true);
    }
    
    if (onToggle) {
      onToggle(!bookmarked);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
        bookmarked
          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/30'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
      } ${className}`}
      title={bookmarked ? '取消收藏' : '收藏'}
    >
      <span>{bookmarked ? '★' : '☆'}</span>
      <span className="text-xs">{bookmarked ? '已收藏' : '收藏'}</span>
    </button>
  );
}

