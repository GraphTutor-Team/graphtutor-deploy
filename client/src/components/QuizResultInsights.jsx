/**
 * GraphTutor V3.0 - 练习结果洞察组件
 * 
 * 功能：在练习/考试完成后显示学习建议和洞察
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAILearningSuggestions } from '../api/v3/enhancedAnalytics';

export default function QuizResultInsights({ stats, questions, answers }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stats && questions && answers) {
      loadInsights();
    }
  }, [stats, questions, answers]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      // 分析错题
      const wrongQuestions = questions.filter((q, idx) => {
        const userAnswer = answers[idx];
        const correctAnswer = q.answerIndex ?? q.answer ?? 0;
        return userAnswer !== correctAnswer;
      });

      if (wrongQuestions.length > 0) {
        // 获取AI建议
        const result = await getAILearningSuggestions({ days: 7 });
        if (result.data?.suggestions) {
          setInsights(result.data.suggestions.slice(0, 3));
        }
      }
    } catch (err) {
      console.error('加载学习洞察失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!stats || !questions || questions.length === 0) {
    return null;
  }

  const accuracy = stats.accuracy || (stats.correct / stats.total) * 100;
  const wrongCount = stats.wrong || stats.total - stats.correct;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6 mt-6">
      <h3 className="text-xl font-bold mb-4">💡 学习建议</h3>

      {/* 快速统计 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">总题数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.correct || 0}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">正确</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{wrongCount}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">错误</div>
        </div>
      </div>

      {/* 准确率 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">正确率</span>
          <span className="text-lg font-bold">{accuracy.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              accuracy >= 80
                ? 'bg-green-500'
                : accuracy >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${accuracy}%` }}
          />
        </div>
      </div>

      {/* 建议 */}
      {wrongCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
          <div className="font-medium mb-2 text-blue-900 dark:text-blue-100">
            建议复习错题
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 mb-3">
            你有 {wrongCount} 道题目需要复习，建议前往错题本查看详情。
          </div>
          <Link
            to="/review"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            前往错题本 →
          </Link>
        </div>
      )}

      {/* AI建议 */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <div className="font-medium text-slate-900 dark:text-slate-100">
            AI学习建议
          </div>
          {insights.map((insight, index) => (
            <div
              key={index}
              className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border-l-4 border-blue-500"
            >
              <div className="font-medium text-sm mb-1">{insight.title}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {insight.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 快速操作 */}
      <div className="mt-6 flex gap-2">
        <Link
          to="/analytics"
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center text-sm"
        >
          查看学习分析
        </Link>
        {wrongCount > 0 && (
          <Link
            to="/review"
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-center text-sm"
          >
            复习错题
          </Link>
        )}
      </div>
    </div>
  );
}

