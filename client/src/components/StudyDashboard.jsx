/**
 * GraphTutor V3.0 - 学习仪表板组件
 * 
 * 功能：综合展示学习数据的关键指标
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function StudyDashboard({ data }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data) {
      try {
        const dashboardData = generateDashboard(data);
        setDashboard(dashboardData);
      } catch (err) {
        console.error('生成仪表板失败:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [data]);

  if (loading || !dashboard) {
    return (
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="text-center text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">📊 学习仪表板</h2>
        <p className="text-slate-600 dark:text-slate-400">
          快速了解你的学习概况
        </p>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6 bg-blue-600 text-white">
          <div className="text-sm opacity-90 mb-2">总题数</div>
          <div className="text-3xl font-bold mb-1">{dashboard.totalQuestions}</div>
          <div className="text-sm opacity-75">累计完成</div>
        </div>

        <div className="card p-6 bg-emerald-600 text-white">
          <div className="text-sm opacity-90 mb-2">正确率</div>
          <div className="text-3xl font-bold mb-1">{dashboard.accuracy}%</div>
          <div className="text-sm opacity-75">平均正确率</div>
        </div>

        <div className="card p-6 bg-slate-800 text-white">
          <div className="text-sm opacity-90 mb-2">学习天数</div>
          <div className="text-3xl font-bold mb-1">{dashboard.studyDays}</div>
          <div className="text-sm opacity-75">累计学习</div>
        </div>

        <div className="card p-6 bg-amber-600 text-white">
          <div className="text-sm opacity-90 mb-2">连续打卡</div>
          <div className="text-3xl font-bold mb-1">{dashboard.checkInStreak}</div>
          <div className="text-sm opacity-75">天</div>
        </div>
      </div>

      {/* 本周概览 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">本周概览</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">本周题数</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {dashboard.weekStats.totalQuestions}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">本周时长</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatDuration(dashboard.weekStats.totalDuration)}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">学习频率</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {dashboard.weekStats.frequency}%
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">快速操作</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/quiz"
            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-center border border-slate-200 dark:border-slate-700"
          >
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">开始练习</div>
          </Link>
          <Link
            to="/review"
            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-center border border-slate-200 dark:border-slate-700"
          >
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">错题复习</div>
          </Link>
          <Link
            to="/check-in"
            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-center border border-slate-200 dark:border-slate-700"
          >
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">每日打卡</div>
          </Link>
          <Link
            to="/analytics"
            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-center border border-slate-200 dark:border-slate-700"
          >
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">学习分析</div>
          </Link>
        </div>
      </div>

      {/* 学习进度 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">学习进度</h3>
        <div className="space-y-4">
          {dashboard.goals.map((goal, index) => (
            <div key={index}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">{goal.name}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {goal.progress}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          ))}
          {dashboard.goals.length === 0 && (
            <div className="text-center text-slate-500 py-4">
              暂无学习目标，<Link to="/goals" className="text-blue-600 dark:text-blue-400 hover:underline">去创建一个</Link>
            </div>
          )}
        </div>
      </div>

      {/* 最近成就 */}
      {dashboard.recentAchievements.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">最近成就</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dashboard.recentAchievements.map((achievement, index) => (
              <div
                key={index}
                className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {achievement.name}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {achievement.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 生成仪表板数据
 */
function generateDashboard(data) {
  const {
    stats = {},
    progress7d = [],
    goals = [],
    achievements = [],
    checkIns = [],
  } = data;

  // 计算总题数
  const totalQuestions = stats.totalQuestions || progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  
  // 计算正确率
  const totalCorrect = stats.totalCorrect || progress7d.reduce((sum, d) => sum + (d.correct || 0), 0);
  const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  // 计算学习天数
  const studyDays = progress7d.filter(d => (d.total || 0) > 0).length;

  // 计算连续打卡天数
  let checkInStreak = 0;
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
        checkInStreak++;
      } else if (daysDiff === 1) {
        checkInStreak++;
        lastDate = checkInDate;
      } else {
        break;
      }
    }
  }

  // 本周统计
  const weekStats = {
    totalQuestions: progress7d.reduce((sum, d) => sum + (d.total || 0), 0),
    totalDuration: progress7d.reduce((sum, d) => sum + (d.duration || 0), 0),
    frequency: progress7d.length > 0 
      ? (progress7d.filter(d => (d.total || 0) > 0).length / progress7d.length) * 100 
      : 0,
  };

  // 学习目标进度
  const goalsProgress = (goals || []).map(goal => ({
    name: goal.title || goal.name,
    progress: goal.target > 0 ? Math.min((goal.progress / goal.target) * 100, 100) : 0,
  }));

  // 最近成就
  const recentAchievements = (achievements || [])
    .filter(a => a.unlocked)
    .sort((a, b) => new Date(b.unlockedAt || b.createdAt) - new Date(a.unlockedAt || a.createdAt))
    .slice(0, 3)
    .map(a => ({
      name: a.name || a.title,
      icon: a.icon || '🏆',
      date: new Date(a.unlockedAt || a.createdAt).toLocaleDateString('zh-CN'),
    }));

  return {
    totalQuestions,
    accuracy: accuracy.toFixed(1),
    studyDays,
    checkInStreak,
    weekStats: {
      ...weekStats,
      frequency: weekStats.frequency.toFixed(1),
    },
    goals: goalsProgress,
    recentAchievements,
  };
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}小时${mins}分钟`;
}

