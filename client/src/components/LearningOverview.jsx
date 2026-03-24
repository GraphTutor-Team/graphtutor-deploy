/**
 * GraphTutor V3.0 - 学习概览组件
 *
 * 功能：综合展示关键学习指标和快速信息
 * 会随 LearningDataContext 的失效版本刷新，与首页/练习/考试数据一致
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTodayReviewQuestions } from '../api/v3/smartReview';
import { getComprehensiveAnalysis } from '../api/v3/enhancedAnalytics';
import { useApiData } from '../hooks';
import { useLearningData } from '../context/LearningDataContext';

export default function LearningOverview({ userId }) {
  const { learningDataVersion } = useLearningData();

  // 依赖 learningDataVersion：练习/考试提交后首页概览会重新拉取
  const { data: reviewData, loading: reviewLoading } = useApiData(
    userId ? getTodayReviewQuestions : null,
    { limit: 100 },
    { immediate: !!userId, dependencies: [learningDataVersion] }
  );

  const { data: analysisData, loading: analysisLoading } = useApiData(
    userId ? getComprehensiveAnalysis : null,
    { days: 7 },
    { immediate: !!userId, dependencies: [learningDataVersion] }
  );

  const loading = reviewLoading || analysisLoading;
  const todayReviewCount = reviewData?.questions?.length || 0;
  const efficiencyScore = analysisData?.efficiency?.score || null;
  const quickInsights = analysisData?.suggestions?.suggestions?.slice(0, 3).map(s => ({
    title: s.title,
    priority: s.priority,
  })) || [];

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
        <div className="text-center py-8 text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 今日复习 */}
      <Link
        to="/review"
        className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold">{todayReviewCount}</div>
          <div className="text-3xl">📚</div>
        </div>
        <div className="text-sm opacity-90">今日需要复习</div>
        {todayReviewCount > 0 && (
          <div className="text-xs mt-2 opacity-75">点击开始复习 →</div>
        )}
      </Link>

      {/* 学习效率 */}
      <Link
        to="/analytics"
        className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold">
            {efficiencyScore !== null ? `${efficiencyScore}分` : '—'}
          </div>
          <div className="text-3xl">📊</div>
        </div>
        <div className="text-sm opacity-90">学习效率评分</div>
        {efficiencyScore !== null && (
          <div className="text-xs mt-2 opacity-75">查看详细分析 →</div>
        )}
      </Link>

      {/* 快速建议 */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold">{quickInsights.length}</div>
          <div className="text-3xl">💡</div>
        </div>
        <div className="text-sm opacity-90">学习建议</div>
        {quickInsights.length > 0 && (
          <div className="text-xs mt-2 opacity-75">
            {quickInsights[0]?.title?.substring(0, 20)}...
          </div>
        )}
      </div>
    </div>
  );
}

