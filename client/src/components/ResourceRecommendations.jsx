/**
 * GraphTutor V3.0 - 学习资源推荐组件
 * 
 * 功能：显示个性化学习资源推荐
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recommendResources } from '../utils/resourceRecommendation';

export default function ResourceRecommendations({ data }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data) {
      try {
        const recommended = recommendResources(data);
        setRecommendations(recommended);
      } catch (err) {
        console.error('生成推荐失败:', err);
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

  if (recommendations.length === 0) {
    return (
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">🎯 学习资源推荐</h3>
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">
          暂无推荐，继续加油！
        </div>
      </div>
    );
  }

  const getTypeIcon = (type) => {
    const icons = {
      knowledge: '📚',
      wrong_question: '❌',
      goal: '🎯',
      progress: '📈',
    };
    return icons[type] || '📖';
  };

  const getTypeColor = (type) => {
    const colors = {
      knowledge: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      wrong_question: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      goal: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      progress: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    };
    return colors[type] || 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600';
  };

  const getResourceLink = (recommendation) => {
    switch (recommendation.resourceType) {
      case 'practice':
        return `/practice?nodeId=${recommendation.resourceId}`;
      case 'review':
        return `/review?nodeId=${recommendation.resourceId}`;
      case 'knowledge':
        return `/knowledge/${recommendation.resourceId}`;
      case 'plan':
        return '/plans';
      case 'challenge':
        return '/practice?difficulty=hard';
      default:
        return '#';
    }
  };

  return (
    <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
      <h3 className="text-lg font-bold mb-4">🎯 个性化学习资源推荐</h3>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getTypeColor(rec.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getTypeIcon(rec.type)}</div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {rec.title}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {rec.description}
                </div>
                <Link
                  to={getResourceLink(rec)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {rec.action} →
                </Link>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                优先级: {rec.priority}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

