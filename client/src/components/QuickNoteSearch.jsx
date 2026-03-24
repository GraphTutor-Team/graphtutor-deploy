/**
 * GraphTutor V3.0 - 快速笔记搜索组件
 * 
 * 功能：快速搜索笔记内容
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { extractTags } from '../utils/noteTags';

export default function QuickNoteSearch({ notes = [], onSelect }) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      const filtered = notes
        .filter(note => {
          const title = (note.title || '').toLowerCase();
          const content = (note.content || '').toLowerCase();
          const tags = (note.tags || []).join(' ').toLowerCase();
          return (
            title.includes(keyword) ||
            content.includes(keyword) ||
            tags.includes(keyword)
          );
        })
        .slice(0, 10); // 最多显示10个结果
      setResults(filtered);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [searchKeyword, notes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (note) => {
    if (onSelect) {
      onSelect(note);
    }
    setSearchKeyword('');
    setShowResults(false);
  };

  const highlightText = (text, keyword) => {
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/30">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onFocus={() => searchKeyword && setShowResults(true)}
          placeholder="快速搜索笔记..."
          className="w-full px-4 py-2 pl-10 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
      </div>

      {/* 搜索结果 */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map(note => (
            <div
              key={note._id || note.id}
              onClick={() => handleSelect(note)}
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-slate-700 last:border-b-0"
            >
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {highlightText(note.title || '无标题', searchKeyword)}
              </div>
              {note.content && (
                <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {highlightText(note.content.substring(0, 100), searchKeyword)}
                </div>
              )}
              {note.tags && note.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {note.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 无结果提示 */}
      {showResults && searchKeyword && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg p-4 text-center text-slate-500 dark:text-slate-400">
          没有找到匹配的笔记
        </div>
      )}
    </div>
  );
}

