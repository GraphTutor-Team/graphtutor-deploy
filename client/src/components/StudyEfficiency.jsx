/**
 * GraphTutor V3.0 - 学习效率分析组件
 * 
 * 功能：显示学习效率和效果分析
 */

import { useState, useEffect } from 'react';
import { analyzeStudyEfficiency } from '../utils/studyEfficiency';

export default function StudyEfficiency({ data }) {
  const [efficiency, setEfficiency] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data) {
      try {
        const result = analyzeStudyEfficiency(data);
        setEfficiency(result);
      } catch (err) {
        console.error('效率分析失败:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [data]);

  if (loading || !efficiency) {
    return (
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="text-center text-slate-500">分析中...</div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getLevelLabel = (level) => {
    const labels = {
      excellent: '优秀',
      good: '良好',
      fair: '一般',
      low: '较低',
      high: '高',
      medium: '中',
      unknown: '未知',
    };
    return labels[level] || level;
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">⚡ 学习效率分析</h2>
        <p className="text-slate-600 dark:text-slate-400">
          综合分析你的学习效率和效果
        </p>
      </div>

      {/* 效率评分 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">📊 综合效率评分</h3>
        <div className="text-center">
          <div className={`text-6xl font-bold mb-2 ${getScoreColor(efficiency.efficiencyScore.total)}`}>
            {efficiency.efficiencyScore.total.toFixed(1)}
          </div>
          <div className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-4">
            {getLevelLabel(efficiency.efficiencyScore.level)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">正确率</div>
              <div className="text-lg font-bold">{efficiency.efficiencyScore.breakdown.accuracy.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">速度</div>
              <div className="text-lg font-bold">{efficiency.efficiencyScore.breakdown.speed.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">强度</div>
              <div className="text-lg font-bold">{efficiency.efficiencyScore.breakdown.intensity.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">效果</div>
              <div className="text-lg font-bold">{efficiency.efficiencyScore.breakdown.effectiveness.toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">知识点</div>
              <div className="text-lg font-bold">{efficiency.efficiencyScore.breakdown.knowledge.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 基础指标 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">📈 基础指标</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">总题数</div>
            <div className="text-xl font-bold">{efficiency.metrics.totalQuestions}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">正确率</div>
            <div className="text-xl font-bold">{efficiency.metrics.accuracy.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">每题用时</div>
            <div className="text-xl font-bold">{efficiency.metrics.avgTimePerQuestion.toFixed(1)}分钟</div>
          </div>
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">每小时题数</div>
            <div className="text-xl font-bold">{efficiency.metrics.questionsPerHour.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* 效率分析 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">💪 学习强度</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">等级</span>
              <span className="font-semibold">{getLevelLabel(efficiency.intensity.level)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">平均每日</span>
              <span className="font-semibold">{efficiency.intensity.avgDaily.toFixed(1)}题</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">一致性</span>
              <span className="font-semibold">{efficiency.intensity.consistency.toFixed(1)}%</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {efficiency.intensity.recommendation}
            </div>
          </div>
        </div>

        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">🎯 学习效果</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">等级</span>
              <span className="font-semibold">{getLevelLabel(efficiency.effectiveness.level)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">效果评分</span>
              <span className="font-semibold">{efficiency.effectiveness.score.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">正确率得分</span>
              <span className="font-semibold">{efficiency.effectiveness.accuracyScore.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">速度得分</span>
              <span className="font-semibold">{efficiency.effectiveness.speedScore.toFixed(1)}</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {efficiency.effectiveness.recommendation}
            </div>
          </div>
        </div>
      </div>

      {/* 知识点和错题效率 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">📚 知识点掌握效率</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">掌握率</span>
              <span className="font-semibold">{efficiency.knowledgeEfficiency.masteryRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">已掌握</span>
              <span className="font-semibold">{efficiency.knowledgeEfficiency.masteredCount}/{efficiency.knowledgeEfficiency.totalCount}</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {efficiency.knowledgeEfficiency.recommendation}
            </div>
          </div>
        </div>

        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">❌ 错题处理效率</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">复习率</span>
              <span className="font-semibold">{efficiency.wrongQuestionEfficiency.reviewRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">已复习</span>
              <span className="font-semibold">{efficiency.wrongQuestionEfficiency.reviewed}/{efficiency.wrongQuestionEfficiency.total}</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {efficiency.wrongQuestionEfficiency.recommendation}
            </div>
          </div>
        </div>
      </div>

      {/* 效率建议 */}
      {efficiency.recommendations.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">💡 效率提升建议</h3>
          <div className="space-y-3">
            {efficiency.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  rec.priority === 'high'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : rec.priority === 'medium'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="font-semibold mb-1">{rec.title}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{rec.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

