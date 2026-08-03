/**
 * GraphTutor V3.0 - 学习概览组件
 *
 * 功能：综合展示关键学习指标和快速信息
 * 会随 LearningDataContext 的失效版本刷新，与首页/练习/考试数据一致
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTodayReviewQuestions } from '../api/v3/smartReview';
import { getComprehensiveAnalysis } from '../api/v3/enhancedAnalytics';
import { listSessions } from '../api/quizzes';
import { useApiData } from '../hooks';
import { useLearningData } from '../context/LearningDataContext';

export default function LearningOverview({ userId }) {
  const { learningDataVersion } = useLearningData();
  const [ongoingSession, setOngoingSession] = useState(null);

  const { data: reviewData, loading: reviewLoading, error: reviewError, refetch: refetchReview } = useApiData(
    userId ? getTodayReviewQuestions : null,
    { limit: 100 },
    { immediate: !!userId, dependencies: [learningDataVersion] }
  );

  const { data: analysisData, loading: analysisLoading, error: analysisError, refetch: refetchAnalysis } = useApiData(
    userId ? getComprehensiveAnalysis : null,
    { days: 7 },
    { immediate: !!userId, dependencies: [learningDataVersion] }
  );

  useEffect(() => {
    if (!userId) {
      setOngoingSession(null);
      return;
    }
    let cancelled = false;
    listSessions({ userId, status: 'ongoing' })
      .then((list) => {
        if (cancelled) return;
        const items = Array.isArray(list) ? list : [];
        setOngoingSession(items[0] || null);
      })
      .catch(() => {
        if (!cancelled) setOngoingSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, learningDataVersion]);

  const loading = reviewLoading || analysisLoading;
  const loadError = reviewError || analysisError;
  const todayReviewCount = reviewData?.questions?.length || 0;
  const efficiencyScore = analysisData?.efficiency?.score || null;
  const quickInsights = analysisData?.suggestions?.suggestions?.slice(0, 3).map(s => ({
    title: s.title,
    priority: s.priority,
  })) || [];

  if (loading) {
    return (
      <div className="surface">
        <div className="text-center py-8 text-slate-500 text-sm">加载中...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="surface">
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">学习概览加载失败</p>
          <button
            type="button"
            onClick={() => {
              refetchReview?.();
              refetchAnalysis?.();
            }}
            className="btn btn-primary"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    {
      key: 'review',
      to: '/review',
      value: todayReviewCount,
      label: '今日需要复习',
      hint: todayReviewCount > 0 ? '点击开始复习' : null,
    },
    {
      key: 'efficiency',
      to: '/analytics',
      value: efficiencyScore !== null ? `${efficiencyScore}` : '—',
      suffix: efficiencyScore !== null ? '分' : null,
      label: '学习效率评分',
      hint: efficiencyScore !== null ? '查看详细分析' : null,
    },
    {
      key: 'insights',
      to: null,
      value: quickInsights.length,
      label: '学习建议',
      hint: quickInsights[0]?.title
        ? `${quickInsights[0].title.substring(0, 24)}${quickInsights[0].title.length > 24 ? '…' : ''}`
        : null,
    },
  ];

  if (ongoingSession) {
    const done = Number(ongoingSession.correct) || 0;
    const total = Number(ongoingSession.total) || 0;
    cards.unshift({
      key: 'resume',
      to: `/quiz2?resume=1${ongoingSession.id ? `&sessionId=${ongoingSession.id}` : ''}`,
      value: total > 0 ? `${done}/${total}` : '进行中',
      label: '继续未完成练习',
      hint: '恢复测验会话 →',
    });
  }

  return (
    <div className={`grid grid-cols-1 gap-3 ${cards.length >= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'}`}>
      {cards.map((card) => {
        const className =
          'surface !p-4 transition-colors hover:border-slate-300 dark:hover:border-slate-600';
        const body = (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-50">
                {card.value}
              </span>
              {card.suffix && (
                <span className="text-sm font-medium text-slate-500">{card.suffix}</span>
              )}
            </div>
            <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              {card.label}
            </div>
            {card.hint && (
              <div className="mt-2 text-xs text-slate-500">
                {card.hint}
                {card.to && !card.hint.includes('→') ? ' →' : ''}
              </div>
            )}
          </>
        );
        if (card.to) {
          return (
            <Link key={card.key} to={card.to} className={className}>
              {body}
            </Link>
          );
        }
        return (
          <div key={card.key} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
