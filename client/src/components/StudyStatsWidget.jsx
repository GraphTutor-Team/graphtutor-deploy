/**
 * GraphTutor V3.0 - 学习统计小工具
 * 
 * 功能：显示简洁的学习统计信息
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function StudyStatsWidget({ data, compact = false }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (data) {
      try {
        const calculated = calculateStats(data);
        setStats(calculated);
      } catch (err) {
        console.error('计算统计失败:', err);
      }
    }
  }, [data]);

  if (!stats) {
    return (
      <div className="card p-4 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="text-center text-slate-500 text-sm">加载中...</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <div className="font-bold text-slate-900 dark:text-slate-100">{stats.todayQuestions}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">今日</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-slate-900 dark:text-slate-100">{stats.weekQuestions}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">本周</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-slate-900 dark:text-slate-100">{stats.accuracy}%</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">正确率</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-slate-900 dark:text-slate-100">{stats.streak}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">连续</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">📊 学习统计</h3>
        <Link
          to="/analytics"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          查看详情 →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {stats.todayQuestions}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">今日题数</div>
        </div>

        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
            {stats.weekQuestions}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">本周题数</div>
        </div>

        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-purple-400 mb-1">
            {stats.accuracy}%
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">正确率</div>
        </div>

        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
            {stats.streak}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">连续天数</div>
        </div>
      </div>

      {/* 本周进度 */}
      <div className="mt-4 pt-4 border-t dark:border-slate-700">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-600 dark:text-slate-400">本周进度</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {stats.weekProgress}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${stats.weekProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 计算统计数据
 */
function calculateStats(data) {
  const {
    progress7d = [],
    stats = {},
    checkIns = [],
  } = data;

  // 今日题数
  const today = new Date().toISOString().split('T')[0];
  const todayData = progress7d.find(d => d.date === today) || progress7d[progress7d.length - 1];
  const todayQuestions = todayData?.total || 0;

  // 本周题数
  const weekQuestions = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);

  // 正确率
  const total = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const correct = progress7d.reduce((sum, d) => sum + (d.correct || 0), 0);
  const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : '0.0';

  // 连续天数
  let streak = 0;
  if (checkIns && checkIns.length > 0) {
    const sorted = [...checkIns].sort((a, b) => 
      new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );
    
    let lastDate = new Date(sorted[0]?.date || sorted[0]?.createdAt);
    lastDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sorted.length; i++) {
      const checkInDate = new Date(sorted[i].date || sorted[i].createdAt);
      checkInDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((lastDate - checkInDate) / (1000 * 60 * 60 * 24));
      
      if (i === 0 || daysDiff === 0) {
        streak++;
      } else if (daysDiff === 1) {
        streak++;
        lastDate = checkInDate;
      } else {
        break;
      }
    }
  } else {
    // 基于学习记录计算连续天数
    const studyDays = progress7d.filter(d => (d.total || 0) > 0);
    streak = studyDays.length;
  }

  // 本周进度（基于学习天数）
  const studyDays = progress7d.filter(d => (d.total || 0) > 0).length;
  const weekProgress = (studyDays / 7) * 100;

  return {
    todayQuestions,
    weekQuestions,
    accuracy,
    streak,
    weekProgress: weekProgress.toFixed(1),
  };
}

