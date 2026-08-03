/**
 * GraphTutor V3.0 - 笔记统计面板组件
 * 
 * 功能：显示笔记的统计信息和分析
 */

import { useMemo } from 'react';
import { Badge, ProgressBar } from './common';

export default function NoteStatsPanel({ stats, notes = [] }) {
  const analysis = useMemo(() => {
    if (!stats || !notes.length) return null;

    // 计算平均字数
    const totalWords = notes.reduce((sum, note) => {
      return sum + (note.content?.length || 0);
    }, 0);
    const avgWords = Math.round(totalWords / notes.length);

    // 计算标签使用情况
    const tagCounts = {};
    notes.forEach(note => {
      note.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    // 计算公开笔记比例
    const publicCount = notes.filter(n => n.isPublic).length;
    const publicRatio = notes.length > 0 ? (publicCount / notes.length) * 100 : 0;

    // 计算最近7天的笔记数量
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentNotes = notes.filter(note => {
      const createdAt = new Date(note.createdAt);
      return createdAt >= sevenDaysAgo;
    }).length;

    return {
      avgWords,
      topTags,
      publicRatio,
      publicCount,
      recentNotes,
    };
  }, [stats, notes]);

  if (!stats && !analysis) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6 mb-6">
      <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-slate-100">
        📊 笔记统计
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats?.total || 0}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            总笔记数
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats?.byType?.question || 0}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            题目笔记
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-purple-400">
            {stats?.byType?.knowledge || 0}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            知识点笔记
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {analysis?.recentNotes || 0}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            最近7天
          </div>
        </div>
      </div>

      {analysis && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                公开笔记比例
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {analysis.publicCount} / {notes.length}
              </span>
            </div>
            <ProgressBar 
              value={analysis.publicRatio} 
              variant="success"
              showLabel={false}
            />
          </div>

          {analysis.topTags.length > 0 && (
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                常用标签
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.topTags.map(({ tag, count }) => (
                  <Badge key={tag} variant="secondary">
                    {tag} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {analysis.avgWords > 0 && (
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              平均字数：<strong className="text-slate-900 dark:text-slate-100">{analysis.avgWords}</strong> 字/篇
            </div>
          )}
        </>
      )}
    </div>
  );
}

