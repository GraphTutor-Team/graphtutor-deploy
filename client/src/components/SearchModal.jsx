/**
 * GraphTutor V3.0 - 全局搜索模态框
 * 
 * 功能：快速搜索题目、笔记、讨论等
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from '../utils/performance';
import api from '../api/api';

export default function SearchModal({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const search = debounce(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // 搜索多个资源
      const [questionsRes, notesRes, discussionsRes] = await Promise.all([
        api.get(`/v3/questions?search=${encodeURIComponent(searchQuery)}&limit=5`).catch(() => ({ data: { items: [] } })),
        api.get(`/v3/notes?search=${encodeURIComponent(searchQuery)}&limit=5`).catch(() => ({ data: { items: [] } })),
        api.get(`/v3/discussions?search=${encodeURIComponent(searchQuery)}&limit=5`).catch(() => ({ data: { items: [] } })),
      ]);

      const allResults = [
        ...(questionsRes.data?.items || []).map(item => ({ ...item, type: 'question' })),
        ...(notesRes.data?.items || []).map(item => ({ ...item, type: 'note' })),
        ...(discussionsRes.data?.items || []).map(item => ({ ...item, type: 'discussion' })),
      ];

      setResults(allResults);
    } catch (err) {
      console.error('搜索失败:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    search(query);
  }, [query]);

  const handleResultClick = (result) => {
    let path = '';
    switch (result.type) {
      case 'question':
        path = `/questions/${result._id}/detail`;
        break;
      case 'note':
        path = `/notes`;
        break;
      case 'discussion':
        path = `/discussions/${result._id}`;
        break;
      default:
        return;
    }
    
    navigate(path);
    onClose();
  };

  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(r => r.type === activeTab);

  const tabs = [
    { id: 'all', label: '全部', count: results.length },
    { id: 'question', label: '题目', count: results.filter(r => r.type === 'question').length },
    { id: 'note', label: '笔记', count: results.filter(r => r.type === 'note').length },
    { id: 'discussion', label: '讨论', count: results.filter(r => r.type === 'discussion').length },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={onClose}>
      <div 
        className="w-full max-w-2xl mx-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索框 */}
        <div className="p-4 border-b dark:border-slate-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索题目、笔记、讨论..."
            className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onClose();
              }
            }}
          />
        </div>

        {/* 标签页 */}
        {query && (
          <div className="flex border-b dark:border-slate-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>
        )}

        {/* 搜索结果 */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">搜索中...</div>
          ) : query && filteredResults.length === 0 ? (
            <div className="p-8 text-center text-slate-500">未找到相关结果</div>
          ) : !query ? (
            <div className="p-8 text-center text-slate-500">
              <div className="text-2xl mb-2">🔍</div>
              <div>输入关键词开始搜索</div>
              <div className="text-xs mt-2 text-slate-400">
                快捷键：Ctrl/Cmd + K
              </div>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-700">
              {filteredResults.map((result, index) => (
                <div
                  key={`${result.type}-${result._id}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl">
                      {result.type === 'question' && '📝'}
                      {result.type === 'note' && '📄'}
                      {result.type === 'discussion' && '💬'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                        {result.title || result.content?.substring(0, 50) || '无标题'}
                      </div>
                      {result.content && (
                        <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {result.content.substring(0, 100)}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {result.type === 'question' && '题目'}
                        {result.type === 'note' && '笔记'}
                        {result.type === 'discussion' && '讨论'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="p-2 border-t dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center">
          <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">Esc</kbd> 关闭
        </div>
      </div>
    </div>
  );
}

