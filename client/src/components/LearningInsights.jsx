/**
 * GraphTutor V3.0 - 学习洞察组件
 * 
 * 功能：显示AI生成的学习洞察和建议
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateLearningInsights, generatePersonalizedSuggestions } from '../utils/learningInsights';

const INSIGHT_ICONS = {
  warning: '⚠️',
  success: '✅',
  info: 'ℹ️',
};

const INSIGHT_COLORS = {
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

const PRIORITY_LABELS = {
  high: '高',
  medium: '中',
  low: '低',
};

export default function LearningInsights({ data }) {
  const [insights, setInsights] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data) {
      try {
        const insightResult = generateLearningInsights(data);
        const suggestionList = generatePersonalizedSuggestions(data);
        setInsights(insightResult);
        setSuggestions(suggestionList);
      } catch (err) {
        console.error('生成学习洞察失败:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [data]);

  if (loading || !insights) {
    return (
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="text-center text-slate-500">分析中...</div>
      </div>
    );
  }

  if (insights.insights.length === 0) {
    return (
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          🤖 AI学习洞察
        </h3>
        <div className="text-center text-slate-500 dark:text-slate-400">
          暂无洞察数据，请先完成一些学习活动。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 洞察摘要 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          🤖 AI学习洞察
        </h3>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {insights.summary.total}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">总洞察</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {insights.summary.warnings}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">需注意</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {insights.summary.successes}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">表现好</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {insights.summary.info}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">信息</div>
          </div>
        </div>
      </div>

      {/* 洞察列表 */}
      <div className="space-y-3">
        {insights.insights.map((insight, index) => (
          <div
            key={index}
            className={`card p-4 border ${INSIGHT_COLORS[insight.type] || INSIGHT_COLORS.info}`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">
                {INSIGHT_ICONS[insight.type] || 'ℹ️'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    {insight.title}
                  </h4>
                  <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
                    {PRIORITY_LABELS[insight.priority]}优先级
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                  {insight.content}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                  💡 {insight.suggestion}
                </p>
                {insight.relatedNodes && insight.relatedNodes.length > 0 && (
                  <div className="mt-2">
                    <Link
                      to={`/learning-path?highlight=${insight.relatedNodes.join(',')}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      查看相关知识点 →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 个性化建议 */}
      {suggestions.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
            💡 个性化建议
          </h3>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border dark:border-slate-600"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      {suggestion.category}
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {suggestion.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {suggestion.description}
                    </p>
                  </div>
                  {suggestion.link && (
                    <Link
                      to={suggestion.link}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm whitespace-nowrap"
                    >
                      {suggestion.action}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

