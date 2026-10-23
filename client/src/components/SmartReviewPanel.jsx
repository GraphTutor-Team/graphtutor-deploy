/**
 * GraphTutor V3.0 - 智能复习面板组件
 * 
 * 功能：展示今日复习题目、复习计划、复习提醒
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../utils/toast';
import {
  getTodayReviewQuestions,
  generateReviewPlan,
  initializeReviewPlans,
  updateReviewPlan,
} from '../api/v3/smartReview';
// 注意：此组件主要用于展示，导出功能在父组件中处理

export default function SmartReviewPanel() {
  const [loading, setLoading] = useState(false);
  const [todayQuestions, setTodayQuestions] = useState([]);
  const [reviewPlan, setReviewPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    loadTodayQuestions();
  }, []);

  const loadTodayQuestions = async () => {
    setLoading(true);
    try {
      const result = await getTodayReviewQuestions({ limit: 20 });
      setTodayQuestions(result.data?.questions || []);
    } catch (err) {
      console.error('加载今日复习题目失败:', err);
      toast.error('加载今日复习题目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const result = await generateReviewPlan({ days: 7, questionsPerDay: 10 });
      setReviewPlan(result.data);
      setShowPlanModal(true);
      toast.success('复习计划已生成');
    } catch (err) {
      console.error('生成复习计划失败:', err);
      toast.error('生成复习计划失败');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializePlans = async () => {
    setLoading(true);
    try {
      const result = await initializeReviewPlans();
      toast.success(result.data?.message || '复习计划初始化成功');
      loadTodayQuestions();
    } catch (err) {
      console.error('初始化复习计划失败:', err);
      toast.error('初始化复习计划失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuality = async (wrongQuestionId, quality) => {
    try {
      await updateReviewPlan(wrongQuestionId, quality);
      toast.success('复习计划已更新');
      loadTodayQuestions();
    } catch (err) {
      console.error('更新复习计划失败:', err);
      toast.error('更新复习计划失败');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold">智能复习</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            先排本周刚错过的题，再排到了复习时间的旧错题。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInitializePlans}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            disabled={loading}
          >
            🔄 初始化计划
          </button>
          <button
            onClick={handleGeneratePlan}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            disabled={loading}
          >
            📅 生成计划
          </button>
        </div>
      </div>

      {/* 今日复习题目 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold">今日需要复习</h4>
          <Link
            to="/review"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            查看全部 →
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">加载中...</div>
        ) : todayQuestions.length > 0 ? (
          <div className="space-y-3">
            {todayQuestions.slice(0, 5).map((item, index) => (
              <div
                key={item._id || index}
                className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg border dark:border-slate-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">
                      {item.questionContent || item.questionId?.content || item.question?.content || '题目'}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                      {item.justWrong && <span>本周刚错过</span>}
                      <span>错误次数: {item.errorCount || 0}</span>
                      <span>掌握度: {(item.mastery || 0).toFixed(0)}%</span>
                      {item.reviewPlan?.nextReviewDate && (
                        <span>
                          下次复习: {new Date(item.reviewPlan.nextReviewDate).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleUpdateQuality(item._id, 5)}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                      title="完全掌握"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleUpdateQuality(item._id, 3)}
                      className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200"
                      title="一般"
                    >
                      ○
                    </button>
                    <button
                      onClick={() => handleUpdateQuality(item._id, 1)}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                      title="未掌握"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {todayQuestions.length > 5 && (
              <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                还有 {todayQuestions.length - 5} 道题目需要复习
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            今日暂无需要复习的题目
          </div>
        )}
      </div>

      {/* 复习计划模态框 */}
      {showPlanModal && reviewPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">智能复习计划</h3>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              <div>计划时间: {reviewPlan.startDate} 至 {reviewPlan.endDate}</div>
              <div>总题目数: {reviewPlan.totalQuestions}道</div>
            </div>

            <div className="space-y-4">
              {reviewPlan.plan.map((day, index) => (
                <div key={index} className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                  <div className="font-medium mb-2">
                    第{day.day}天 ({day.date}) - {day.count}道题目
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {day.questions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {day.questions.map((q, qIndex) => (
                          <span key={qIndex} className="px-2 py-1 bg-white dark:bg-slate-600 rounded text-xs">
                            {q.justWrong ? '本周刚错过 · ' : ''}{q.questionContent || `题目 ${qIndex + 1}`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '暂无题目'
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

