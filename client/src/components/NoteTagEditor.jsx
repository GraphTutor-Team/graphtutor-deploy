/**
 * GraphTutor V3.0 - 笔记标签编辑器组件
 * 
 * 功能：编辑和管理笔记标签
 */

import { useState, useEffect } from 'react';
import { extractTags, validateTag, getPopularTags } from '../utils/noteTags';

export default function NoteTagEditor({ 
  content, 
  tags = [], 
  onChange, 
  popularTags = [],
  maxTags = 10 
}) {
  const [inputValue, setInputValue] = useState('');
  const [currentTags, setCurrentTags] = useState(tags);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    setCurrentTags(tags);
  }, [tags]);

  useEffect(() => {
    // 从内容中提取标签
    const extractedTags = extractTags(content || '');
    if (extractedTags.length > 0) {
      setCurrentTags(prev => [...new Set([...prev, ...extractedTags])]);
    }
  }, [content]);

  const handleAddTag = (tag) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    
    if (!validateTag(trimmedTag)) {
      alert('标签格式不正确，只能包含字母、数字、中文和下划线，最多20个字符');
      return;
    }
    
    if (currentTags.length >= maxTags) {
      alert(`最多只能添加${maxTags}个标签`);
      return;
    }
    
    if (currentTags.includes(trimmedTag)) {
      return;
    }
    
    const newTags = [...currentTags, trimmedTag];
    setCurrentTags(newTags);
    setInputValue('');
    setSuggestions([]);
    
    if (onChange) {
      onChange(newTags);
    }
  };

  const handleRemoveTag = (tag) => {
    const newTags = currentTags.filter(t => t !== tag);
    setCurrentTags(newTags);
    
    if (onChange) {
      onChange(newTags);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // 显示建议
    if (value.trim()) {
      const filtered = popularTags
        .filter(item => 
          item.tag.toLowerCase().includes(value.toLowerCase()) &&
          !currentTags.includes(item.tag)
        )
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAddTag(inputValue);
      }
    } else if (e.key === 'Backspace' && inputValue === '' && currentTags.length > 0) {
      handleRemoveTag(currentTags[currentTags.length - 1]);
    }
  };

  const handleSuggestionClick = (tag) => {
    handleAddTag(tag);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        标签
      </label>
      
      {/* 标签显示 */}
      <div className="flex flex-wrap gap-2 p-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 min-h-[40px]">
        {currentTags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm"
          >
            #{tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
              type="button"
            >
              ×
            </button>
          </span>
        ))}
        
        {/* 输入框 */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={currentTags.length === 0 ? "添加标签（按Enter或逗号确认）" : ""}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-slate-900 dark:text-slate-100"
        />
      </div>

      {/* 建议标签 */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">建议：</span>
          {suggestions.map(item => (
            <button
              key={item.tag}
              onClick={() => handleSuggestionClick(item.tag)}
              className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
              type="button"
            >
              #{item.tag} ({item.count})
            </button>
          ))}
        </div>
      )}

      {/* 提示 */}
      <div className="text-xs text-slate-500 dark:text-slate-400">
        提示：在笔记内容中使用 #标签 格式也会自动添加标签
      </div>
    </div>
  );
}

