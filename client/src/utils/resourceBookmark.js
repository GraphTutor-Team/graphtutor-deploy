/**
 * GraphTutor V3.0 - 学习资源收藏工具
 * 
 * 功能：管理学习资源的收藏
 */

/**
 * 收藏类型
 */
export const BOOKMARK_TYPES = {
  QUESTION: 'question',
  NOTE: 'note',
  DISCUSSION: 'discussion',
  KNOWLEDGE_NODE: 'knowledge_node',
};

/**
 * 获取所有收藏
 */
export function getBookmarks() {
  try {
    const bookmarks = localStorage.getItem('bookmarks');
    return bookmarks ? JSON.parse(bookmarks) : [];
  } catch (err) {
    console.error('获取收藏失败:', err);
    return [];
  }
}

/**
 * 添加收藏
 */
export function addBookmark(type, resourceId, resourceData = {}) {
  const bookmarks = getBookmarks();
  
  // 检查是否已收藏
  const exists = bookmarks.find(
    b => b.type === type && b.resourceId === resourceId
  );
  
  if (exists) {
    return false; // 已收藏
  }
  
  const bookmark = {
    id: `${type}_${resourceId}_${Date.now()}`,
    type,
    resourceId,
    resourceData,
    createdAt: new Date().toISOString(),
  };
  
  bookmarks.push(bookmark);
  saveBookmarks(bookmarks);
  return true;
}

/**
 * 移除收藏
 */
export function removeBookmark(type, resourceId) {
  const bookmarks = getBookmarks();
  const filtered = bookmarks.filter(
    b => !(b.type === type && b.resourceId === resourceId)
  );
  saveBookmarks(filtered);
  return true;
}

/**
 * 检查是否已收藏
 */
export function isBookmarked(type, resourceId) {
  const bookmarks = getBookmarks();
  return bookmarks.some(
    b => b.type === type && b.resourceId === resourceId
  );
}

/**
 * 获取指定类型的收藏
 */
export function getBookmarksByType(type) {
  const bookmarks = getBookmarks();
  return bookmarks.filter(b => b.type === type);
}

/**
 * 保存收藏到本地存储
 */
function saveBookmarks(bookmarks) {
  try {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  } catch (err) {
    console.error('保存收藏失败:', err);
  }
}

/**
 * 清空所有收藏
 */
export function clearAllBookmarks() {
  localStorage.removeItem('bookmarks');
}

/**
 * 导出收藏
 */
export function exportBookmarks() {
  const bookmarks = getBookmarks();
  const data = {
    bookmarks,
    exportDate: new Date().toISOString(),
    version: '1.0',
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bookmarks_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导入收藏
 */
export function importBookmarks(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          const existing = getBookmarks();
          const merged = [...existing, ...data.bookmarks];
          // 去重
          const unique = merged.filter((bookmark, index, self) =>
            index === self.findIndex(b =>
              b.type === bookmark.type && b.resourceId === bookmark.resourceId
            )
          );
          saveBookmarks(unique);
          resolve(unique);
        } else {
          reject(new Error('无效的收藏文件格式'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * 获取收藏统计
 */
export function getBookmarkStats() {
  const bookmarks = getBookmarks();
  const stats = {
    total: bookmarks.length,
    byType: {},
  };
  
  bookmarks.forEach(bookmark => {
    stats.byType[bookmark.type] = (stats.byType[bookmark.type] || 0) + 1;
  });
  
  return stats;
}

