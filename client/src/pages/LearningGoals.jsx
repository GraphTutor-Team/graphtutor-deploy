/**
 * GraphTutor V3.0 - 学习目标管理页面
 * 
 * 功能：创建、查看和管理学习目标
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getLearningGoals,
  createLearningGoal,
  updateLearningGoal,
  deleteLearningGoal,
  getLearningGoalStats,
} from '../api/v3/learningGoals';
import { getBanks } from '../api/v3/questionBanks';
import { getSubjectTree } from '../api/v3/subjects';
import { toast } from '../utils/toast';
import { getTodaySet } from '../api/v3/ai';
import { usePageAI } from '../hooks/usePageAI';
import PageHeader from '../components/PageHeader';
import PlanHubNav from '../components/PlanHubNav';

export default function LearningGoals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);

  const goalsBrief = useMemo(() => {
    const titles = (Array.isArray(goals) ? goals : [])
      .slice(0, 5)
      .map((goal) => goal.title || goal.name)
      .filter(Boolean);
    return `页面：学习目标。进行中的目标：${titles.join('、') || '暂无'}。统计：${stats ? JSON.stringify(stats).slice(0, 180) : '暂无'}`;
  }, [goals, stats]);

  usePageAI({ pageType: 'goals', brief: goalsBrief });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [banks, setBanks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, completed, expired

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'custom',
    targetType: 'questions',
    targetValue: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    subjectCode: '',
    bankId: '',
    reminder: {
      enabled: false,
      time: '09:00',
      days: [],
    },
  });

  useEffect(() => {
    loadData();
    loadOptions();
  }, [filterStatus]);

  function todayLimit(goal) {
    if (goal?.type === 'daily' && goal?.targetType === 'questions') {
      return Math.min(20, Math.max(1, Number(goal.targetValue) || 10));
    }
    return 8;
  }

  async function startGoalPractice(goal) {
    const limit = todayLimit(goal);
    try {
      const data = await getTodaySet(limit);
      const questionIds = data?.practiceQuestionIds || [];
      if (questionIds.length) {
        navigate('/quiz', { state: { practiceQuestionIds: questionIds, practiceSource: 'plan' } });
        return;
      }
    } catch (err) {
      toast.error(err.message || '先按题量开练');
    }
    navigate('/quiz', { state: { practiceCount: limit, practiceSource: 'plan' } });
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const [goalsData, statsData] = await Promise.all([
        getLearningGoals({ status: filterStatus === 'all' ? undefined : filterStatus }),
        getLearningGoalStats(),
      ]);
      setGoals(goalsData);
      setStats(statsData);
    } catch (err) {
      console.error('加载学习目标失败:', err);
      toast.error('加载学习目标失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [banksData, subjectsData] = await Promise.all([
        getBanks({ limit: 100 }).catch(() => ({ data: [] })),
        getSubjectTree().catch(() => []),
      ]);
      setBanks(banksData.data || []);
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error('加载选项数据失败:', err);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.title || !formData.targetValue || !formData.endDate) {
        toast.error('请填写必填项');
        return;
      }

      await createLearningGoal(formData);
      toast.success('学习目标创建成功');
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        type: 'custom',
        targetType: 'questions',
        targetValue: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        subjectCode: '',
        bankId: '',
        reminder: {
          enabled: false,
          time: '09:00',
          days: [],
        },
      });
      loadData();
    } catch (err) {
      toast.error(err.message || '创建失败');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个学习目标吗？')) {
      return;
    }

    try {
      await deleteLearningGoal(id);
      toast.success('删除成功');
      loadData();
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  const handleComplete = async (id) => {
    try {
      await updateLearningGoal(id, { status: 'completed' });
      toast.success('目标已标记为完成');
      loadData();
    } catch (err) {
      toast.error(err.message || '更新失败');
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-600';
    if (progress >= 70) return 'bg-blue-600';
    if (progress >= 40) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getTargetTypeLabel = (type) => {
    const labels = {
      questions: '答题数',
      accuracy: '正确率(%)',
      knowledge_nodes: '掌握知识点数',
      time: '学习时间(分钟)',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="学习目标"
        subtitle="设定目标并跟踪进度。"
        backTo="/study-plans"
        actions={[
          { label: '创建目标', onClick: () => setShowCreateModal(true) },
          { label: '快速模板', onClick: () => setShowTemplateModal(true), variant: 'btn-outline' },
        ]}
      />
      <PlanHubNav />

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">总目标数</div>
            <div className="text-3xl font-bold text-blue-600">{stats.total || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">进行中</div>
            <div className="text-3xl font-bold text-green-600">{stats.active || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">已完成</div>
            <div className="text-3xl font-bold text-blue-600">{stats.completed || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">平均进度</div>
            <div className="text-3xl font-bold text-orange-600">
              {stats.avgProgress?.toFixed(1) || 0}%
            </div>
          </div>
        </div>
      )}

      {/* 筛选 */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">状态筛选：</span>
          {['all', 'active', 'completed', 'expired'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? '全部' :
               status === 'active' ? '进行中' :
               status === 'completed' ? '已完成' : '已过期'}
            </button>
          ))}
        </div>
      </div>

      {/* 目标列表 */}
      {goals.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border text-center">
          <div className="text-4xl mb-4">🎯</div>
          <div className="text-lg font-semibold text-slate-900 mb-2">暂无学习目标</div>
          <div className="text-sm text-slate-600 mb-4">
            创建你的第一个学习目标，开始规划学习计划吧！
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            创建目标
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const progress = goal.targetValue > 0
              ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
              : 0;
            const isCompleted = goal.status === 'completed' || progress >= 100;
            const isExpired = goal.status === 'expired' || (new Date(goal.endDate) < new Date() && goal.status === 'active');

            return (
              <div
                key={goal._id}
                className={`bg-white p-6 rounded-lg border ${
                  isCompleted ? 'border-green-300 bg-green-50' :
                  isExpired ? 'border-red-300 bg-red-50' :
                  'border-slate-200'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 min-w-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold mb-1 break-words">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">{goal.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span>目标：{getTargetTypeLabel(goal.targetType)} {goal.targetValue}</span>
                      <span>当前：{goal.currentValue}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {goal.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => handleComplete(goal._id)}
                        className="flex-1 sm:flex-none px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        完成
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(goal._id)}
                      className="flex-1 sm:flex-none px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">进度</span>
                    <span className="font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`${getProgressColor(progress)} h-full transition-all duration-300`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* 时间信息 */}
                <div className="text-xs text-slate-500">
                  <div>开始：{new Date(goal.startDate).toLocaleDateString('zh-CN')}</div>
                  <div>截止：{new Date(goal.endDate).toLocaleDateString('zh-CN')}</div>
                  {goal.status === 'active' && !isCompleted && !isExpired && (
                    <button
                      type="button"
                      className="mt-2 text-sm text-blue-600 hover:underline"
                      onClick={() => startGoalPractice(goal)}
                    >
                      去做今天的 {todayLimit(goal)} 题
                    </button>
                  )}
                  {goal.subjectCode && (
                    <div>学科：{goal.subjectCode?.name || goal.subjectCode}</div>
                  )}
                  {goal.bankId && (
                    <div>题库：{goal.bankId?.name || goal.bankId}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 创建目标对话框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">创建学习目标</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  目标标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：完成100道数据结构题目"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  目标描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="描述你的学习目标..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    目标类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="questions">答题数</option>
                    <option value="accuracy">正确率(%)</option>
                    <option value="knowledge_nodes">掌握知识点数</option>
                    <option value="time">学习时间(分钟)</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    {formData.targetType === 'accuracy'
                      ? '当前值是目标日期内的正确率百分比。'
                      : formData.targetType === 'knowledge_nodes'
                        ? '当前值是这段时间内答对过的不同知识点。'
                        : formData.targetType === 'questions'
                          ? '每交一道已作答的题加 1，未作答不加。'
                          : '按答题用时累计分钟。'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    目标值 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    开始日期
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    结束日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    学科（可选）
                  </label>
                  <select
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">不限学科</option>
                    {(() => {
                      const flattenSubjects = (subjects, result = []) => {
                        subjects.forEach((subject) => {
                          result.push(subject);
                          if (subject.children && subject.children.length > 0) {
                            flattenSubjects(subject.children, result);
                          }
                        });
                        return result;
                      };
                      return flattenSubjects(subjects).map((subject) => (
                        <option key={subject.code} value={subject.code}>
                          {subject.icon || '📚'} {subject.name}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    题库（可选）
                  </label>
                  <select
                    value={formData.bankId}
                    onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">不限题库</option>
                    {banks.map((bank) => (
                      <option key={bank._id} value={bank._id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    title: '',
                    description: '',
                    type: 'custom',
                    targetType: 'questions',
                    targetValue: '',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: '',
                    subjectCode: '',
                    bankId: '',
                    reminder: {
                      enabled: false,
                      time: '09:00',
                      days: [],
                    },
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 快速模板对话框 */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">快速创建学习目标</h2>
            <p className="text-sm text-slate-600 mb-4">
              选择一个模板快速创建学习目标，你可以稍后修改细节
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 每日目标模板 */}
              <div
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-all"
                onClick={() => {
                  const today = new Date();
                  const tomorrow = new Date(today);
                  tomorrow.setDate(today.getDate() + 1);
                  
                  setFormData({
                    title: '每日学习目标',
                    description: '每天完成一定数量的题目练习',
                    type: 'daily',
                    targetType: 'questions',
                    targetValue: '10',
                    startDate: today.toISOString().split('T')[0],
                    endDate: tomorrow.toISOString().split('T')[0],
                    subjectCode: '',
                    bankId: '',
                    reminder: {
                      enabled: true,
                      time: '20:00',
                      days: [0, 1, 2, 3, 4, 5, 6],
                    },
                  });
                  setShowTemplateModal(false);
                  setShowCreateModal(true);
                }}
              >
                <div className="text-3xl mb-2">📅</div>
                <h3 className="font-bold mb-1">每日目标</h3>
                <p className="text-xs text-slate-600 mb-2">
                  每天完成10道题
                </p>
                <div className="text-xs text-slate-500">
                  适合：每日练习习惯养成
                </div>
              </div>

              {/* 每周目标模板 */}
              <div
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-all"
                onClick={() => {
                  const today = new Date();
                  const nextWeek = new Date(today);
                  nextWeek.setDate(today.getDate() + 7);
                  
                  setFormData({
                    title: '每周学习目标',
                    description: '本周完成一定数量的题目练习',
                    type: 'weekly',
                    targetType: 'questions',
                    targetValue: '70',
                    startDate: today.toISOString().split('T')[0],
                    endDate: nextWeek.toISOString().split('T')[0],
                    subjectCode: '',
                    bankId: '',
                    reminder: {
                      enabled: true,
                      time: '20:00',
                      days: [0, 1, 2, 3, 4, 5, 6],
                    },
                  });
                  setShowTemplateModal(false);
                  setShowCreateModal(true);
                }}
              >
                <div className="text-3xl mb-2">📆</div>
                <h3 className="font-bold mb-1">每周目标</h3>
                <p className="text-xs text-slate-600 mb-2">
                  本周完成70道题
                </p>
                <div className="text-xs text-slate-500">
                  适合：周度学习计划
                </div>
              </div>

              {/* 每月目标模板 */}
              <div
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-all"
                onClick={() => {
                  const today = new Date();
                  const nextMonth = new Date(today);
                  nextMonth.setMonth(today.getMonth() + 1);
                  
                  setFormData({
                    title: '每月学习目标',
                    description: '本月完成一定数量的题目练习',
                    type: 'monthly',
                    targetType: 'questions',
                    targetValue: '300',
                    startDate: today.toISOString().split('T')[0],
                    endDate: nextMonth.toISOString().split('T')[0],
                    subjectCode: '',
                    bankId: '',
                    reminder: {
                      enabled: true,
                      time: '20:00',
                      days: [0, 1, 2, 3, 4, 5, 6],
                    },
                  });
                  setShowTemplateModal(false);
                  setShowCreateModal(true);
                }}
              >
                <div className="text-3xl mb-2">🗓️</div>
                <h3 className="font-bold mb-1">每月目标</h3>
                <p className="text-xs text-slate-600 mb-2">
                  本月完成300道题
                </p>
                <div className="text-xs text-slate-500">
                  适合：月度学习规划
                </div>
              </div>

              {/* 正确率目标模板 */}
              <div
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-all"
                onClick={() => {
                  const today = new Date();
                  const nextWeek = new Date(today);
                  nextWeek.setDate(today.getDate() + 7);
                  
                  setFormData({
                    title: '正确率提升目标',
                    description: '提高答题正确率',
                    type: 'weekly',
                    targetType: 'accuracy',
                    targetValue: '80',
                    startDate: today.toISOString().split('T')[0],
                    endDate: nextWeek.toISOString().split('T')[0],
                    subjectCode: '',
                    bankId: '',
                    reminder: {
                      enabled: false,
                      time: '09:00',
                      days: [],
                    },
                  });
                  setShowTemplateModal(false);
                  setShowCreateModal(true);
                }}
              >
                <div className="text-3xl mb-2">⭐</div>
                <h3 className="font-bold mb-1">正确率目标</h3>
                <p className="text-xs text-slate-600 mb-2">
                  达到80%正确率
                </p>
                <div className="text-xs text-slate-500">
                  适合：提升答题质量
                </div>
              </div>

              {/* 知识点掌握目标模板 */}
              <div
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-all"
                onClick={() => {
                  const today = new Date();
                  const nextMonth = new Date(today);
                  nextMonth.setMonth(today.getMonth() + 1);
                  
                  setFormData({
                    title: '知识点掌握目标',
                    description: '掌握更多知识点',
                    type: 'monthly',
                    targetType: 'knowledge_nodes',
                    targetValue: '20',
                    startDate: today.toISOString().split('T')[0],
                    endDate: nextMonth.toISOString().split('T')[0],
                    subjectCode: '',
                    bankId: '',
                    reminder: {
                      enabled: false,
                      time: '09:00',
                      days: [],
                    },
                  });
                  setShowTemplateModal(false);
                  setShowCreateModal(true);
                }}
              >
                <div className="text-3xl mb-2">💡</div>
                <h3 className="font-bold mb-1">知识点目标</h3>
                <p className="text-xs text-slate-600 mb-2">
                  掌握20个知识点
                </p>
                <div className="text-xs text-slate-500">
                  适合：系统化学习
                </div>
              </div>

              {/* 学习时长目标模板 */}
              <div
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-all"
                onClick={() => {
                  const today = new Date();
                  const nextWeek = new Date(today);
                  nextWeek.setDate(today.getDate() + 7);
                  
                  setFormData({
                    title: '学习时长目标',
                    description: '保证每天的学习时间',
                    type: 'weekly',
                    targetType: 'time',
                    targetValue: '420', // 7天 * 60分钟 = 420分钟
                    startDate: today.toISOString().split('T')[0],
                    endDate: nextWeek.toISOString().split('T')[0],
                    subjectCode: '',
                    bankId: '',
                    reminder: {
                      enabled: true,
                      time: '19:00',
                      days: [0, 1, 2, 3, 4, 5, 6],
                    },
                  });
                  setShowTemplateModal(false);
                  setShowCreateModal(true);
                }}
              >
                <div className="text-3xl mb-2">⏰</div>
                <h3 className="font-bold mb-1">时长目标</h3>
                <p className="text-xs text-slate-600 mb-2">
                  本周学习420分钟
                </p>
                <div className="text-xs text-slate-500">
                  适合：时间管理
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

