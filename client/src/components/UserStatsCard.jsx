/**
 * GraphTutor V3.0 - 用户学习统计卡片组件
 * 
 * 功能：在个人中心等页面展示用户学习统计
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getComprehensiveAnalysis } from '../api/v3/enhancedAnalytics';
import { getTodayReviewQuestions } from '../api/v3/smartReview';

export default function UserStatsCard({ userId }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    efficiencyScore: null,
    todayReviewCount: 0,
    studyDays: 0,
    totalQuestions: 0,
    accuracy: null,
  });

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // 加载综合分析
      const analysisResult = await getComprehensiveAnalysis({ days: 30 });
      const efficiency = analysisResult.data?.efficiency;
      
      // 加载今日复习
      const reviewResult = await getTodayReviewQuestions({ limit: 100 });
      
      setStats({
        efficiencyScore: efficiency?.score || null,
        todayReviewCount: reviewResult.data?.questions?.length || 0,
        studyDays: efficiency?.metrics?.studyDays || 0,
        totalQuestions: efficiency?.metrics?.totalQuestions || 0,
        accuracy: efficiency?.metrics?.accuracy 
          ? Math.round(efficiency.metrics.accuracy * 100) 
          : null,
      });
    } catch (err) {
      console.error('加载用户统计失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
        <div className="text-center py-4 text-slate-500">加载统计中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
      <h3 className="text-xl font-bold mb-4">📊 学习统计</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">学习效率</div>
          <div className="text-2xl font-bold text-blue-600">
            {stats.efficiencyScore !== null ? `${stats.efficiencyScore}分` : '—'}
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">今日复习</div>
          <div className="text-2xl font-bold text-red-600">{stats.todayReviewCount}题</div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">学习天数</div>
          <div className="text-2xl font-bold text-green-600">{stats.studyDays}天</div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">正确率</div>
          <div className="text-2xl font-bold text-purple-600">
            {stats.accuracy !== null ? `${stats.accuracy}%` : '—'}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          to="/analytics"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center text-sm"
        >
          查看详细分析
        </Link>
        {stats.todayReviewCount > 0 && (
          <Link
            to="/review"
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-center text-sm"
          >
            开始复习 ({stats.todayReviewCount})
          </Link>
        )}
      </div>
    </div>
  );
}

