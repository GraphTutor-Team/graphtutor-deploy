/**
 * GraphTutor V3.0 - 学习统计对比组件
 * 
 * 功能：对比不同时间段的学习数据
 */

import { useState, useEffect } from 'react';
import { compareStudyData, compareKnowledgeNodes } from '../utils/studyComparison';

export default function StudyComparison({ currentData, previousData, periodType = 'week' }) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentData && previousData) {
      try {
        const result = compareStudyData({
          currentPeriod: currentData,
          previousPeriod: previousData,
          periodType,
        });
        setComparison(result);
      } catch (err) {
        console.error('对比分析失败:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [currentData, previousData, periodType]);

  if (loading || !comparison) {
    return (
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="text-center text-slate-500">分析中...</div>
      </div>
    );
  }

  const formatChange = (change) => {
    const sign = change.percentage >= 0 ? '+' : '';
    const color = change.percentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    return (
      <span className={color}>
        {sign}{change.value > 0 ? '+' : ''}{change.value.toFixed(0)} ({sign}{change.percentage.toFixed(1)}%)
      </span>
    );
  };

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return '📈';
    if (trend === 'decreasing') return '📉';
    return '➡️';
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">📊 学习统计对比</h2>
        <p className="text-slate-600 dark:text-slate-400">
          {periodType === 'week' ? '本周 vs 上周' : '本月 vs 上月'}
        </p>
      </div>

      {/* 对比卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">总题数</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            {comparison.current.totalQuestions}
          </div>
          <div className="text-sm">
            {formatChange(comparison.changes.totalQuestions)} {getTrendIcon(comparison.trends.totalQuestions)}
          </div>
        </div>

        <div className="card p-4 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">正确率</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            {comparison.current.accuracy.toFixed(1)}%
          </div>
          <div className="text-sm">
            {formatChange(comparison.changes.accuracy)} {getTrendIcon(comparison.trends.accuracy)}
          </div>
        </div>

        <div className="card p-4 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">学习时长</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            {formatDuration(comparison.current.totalDuration)}
          </div>
          <div className="text-sm">
            {formatChange(comparison.changes.totalDuration)} {getTrendIcon(comparison.trends.totalDuration)}
          </div>
        </div>

        <div className="card p-4 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">学习天数</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            {comparison.current.studyDays}
          </div>
          <div className="text-sm">
            {formatChange(comparison.changes.studyDays)} {getTrendIcon(comparison.trends.studyDays)}
          </div>
        </div>

        <div className="card p-4 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">平均每日</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            {comparison.current.avgDaily.toFixed(1)}
          </div>
          <div className="text-sm">
            {formatChange(comparison.changes.avgDaily)} {getTrendIcon(comparison.trends.avgDaily)}
          </div>
        </div>

        <div className="card p-4 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">学习频率</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            {comparison.current.frequency.toFixed(1)}%
          </div>
          <div className="text-sm">
            {formatChange(comparison.changes.frequency)} {getTrendIcon(comparison.trends.frequency)}
          </div>
        </div>
      </div>

      {/* 洞察 */}
      {comparison.insights.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">💡 对比洞察</h3>
          <div className="space-y-3">
            {comparison.insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  insight.type === 'positive'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="font-semibold mb-1">{insight.title}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{insight.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}小时${mins}分钟`;
}

