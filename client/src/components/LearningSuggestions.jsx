/**
 * GraphTutor V3.0 - 学习建议组件
 * 
 * 功能：显示个性化学习建议
 */

import { useState, useEffect } from 'react';
import { generateLearningSuggestions } from '../utils/learningSuggestions';

export default function LearningSuggestions({ data }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data) {
      try {
        const generated = generateLearningSuggestions(data);
        setSuggestions(generated);
      } catch (err) {
        console.error('生成学习建议失败:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [data]);

  if (loading) {
    return (
      <div className="card p-4 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="text-center text-slate-500 text-sm">加载中...</div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">💡 学习建议</h3>
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">
          暂无建议，继续加油！
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'low':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high':
        return '高优先级';
      case 'medium':
        return '中优先级';
      case 'low':
        return '低优先级';
      default:
        return '';
    }
  };

  return (
    <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
      <h3 className="text-lg font-bold mb-4">💡 个性化学习建议</h3>
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getPriorityColor(suggestion.priority)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {suggestion.title}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs">
                    {getPriorityLabel(suggestion.priority)}
                  </span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {suggestion.content}
                </div>
              </div>
            </div>
            {suggestion.action && (
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                {suggestion.action} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

