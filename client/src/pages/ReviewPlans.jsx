/**
 * GraphTutor V3.0 - 复习计划页面
 * 
 * 功能：创建和管理错题复习计划
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { toast } from '../utils/toast';
import {
  getReviewPlans,
  getReviewPlan,
  createReviewPlan,
  updateReviewPlan,
  deleteReviewPlan,
  executeReviewPlan,
  getReviewPlanStats,
} from '../api/v3/reviewPlans';
import { getSubjectTree } from '../api/v3/subjects';
import { getCategories, getTags } from '../api/v3/wrongQuestions';

export default function ReviewPlans() {
  const { user } = useAuth() || {};
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'daily',
    strategy: 'due',
    dailyCount: 10,
    reviewTime: '09:00',
    reminder: {
      enabled: true,
      time: '08:00',
      days: [1, 2, 3, 4, 5],
    },
    filters: {
      subjectCodes: [],
      categories: [],
      tags: [],
      masteryStatus: [],
      difficultyRange: { min: 1, max: 5 },
    },
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  // 加载数据
  useEffect(() => {
    loadPlans();
    loadOptions();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await getReviewPlans();
      setPlans(data || []);
    } catch (err) {
      console.error('加载复习计划失败:', err);
      toast.error('加载复习计划失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [subjectsData, cats, tagList] = await Promise.all([
        getSubjectTree(),
        getCategories(),
        getTags(),
      ]);
      setSubjects(subjectsData || []);
      setCategories(cats || []);
      setTags(tagList || []);
    } catch (err) {
      console.error('加载选项失败:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await updateReviewPlan(editingPlan._id, formData);
        toast.success('复习计划已更新');
      } else {
        await createReviewPlan(formData);
        toast.success('复习计划已创建');
      }
      setShowForm(false);
      setEditingPlan(null);
      resetForm();
      loadPlans();
    } catch (err) {
      toast.error(editingPlan ? '更新失败' : '创建失败');
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      type: plan.type,
      strategy: plan.strategy,
      dailyCount: plan.dailyCount,
      reviewTime: plan.reviewTime,
      reminder: plan.reminder,
      filters: plan.filters,
      startDate: plan.startDate ? new Date(plan.startDate).toISOString().split('T')[0] : '',
      endDate: plan.endDate ? new Date(plan.endDate).toISOString().split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个复习计划吗？')) return;
    try {
      await deleteReviewPlan(id);
      toast.success('已删除');
      loadPlans();
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleExecute = async (id) => {
    try {
      const result = await executeReviewPlan(id);
      if (result.questions && result.questions.length > 0) {
        toast.success(`获取到 ${result.questions.length} 道复习题目`);
        // 可以跳转到练习页面
      } else {
        toast.info('今日没有需要复习的题目');
      }
    } catch (err) {
      toast.error('执行失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'daily',
      strategy: 'due',
      dailyCount: 10,
      reviewTime: '09:00',
      reminder: {
        enabled: true,
        time: '08:00',
        days: [1, 2, 3, 4, 5],
      },
      filters: {
        subjectCodes: [],
        categories: [],
        tags: [],
        masteryStatus: [],
        difficultyRange: { min: 1, max: 5 },
      },
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
  };

  const flattenSubjects = (subjects, result = []) => {
    subjects.forEach((subject) => {
      result.push(subject);
      if (subject.children && subject.children.length > 0) {
        flattenSubjects(subject.children, result);
      }
    });
    return result;
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="复习计划"
        subtitle="创建和管理错题复习计划，系统化复习薄弱知识点"
      />

      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-600">
          共 {plans.length} 个复习计划
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingPlan(null);
            setShowForm(true);
          }}
          className="btn btn-primary"
        >
          + 创建复习计划
        </button>
      </div>

      {/* 创建/编辑表单 */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingPlan ? '编辑复习计划' : '创建复习计划'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  计划名称 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="例如：每日复习10道错题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  计划类型
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="select w-full"
                >
                  <option value="daily">每日</option>
                  <option value="weekly">每周</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  复习策略
                </label>
                <select
                  value={formData.strategy}
                  onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                  className="select w-full"
                >
                  <option value="due">到期复习</option>
                  <option value="unmastered">未掌握优先</option>
                  <option value="all">全部错题</option>
                  <option value="random">随机</option>
                  <option value="by_category">按分类</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  每日复习数量
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.dailyCount}
                  onChange={(e) => setFormData({ ...formData, dailyCount: parseInt(e.target.value) })}
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="textarea w-full"
                rows={3}
                placeholder="计划描述（可选）"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  开始日期
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  结束日期（可选）
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingPlan ? '更新' : '创建'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                className="btn btn-outline"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 复习计划列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 rounded-lg border shadow-sm text-center">
            <div className="text-slate-500">正在加载...</div>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white p-12 rounded-lg border shadow-sm text-center space-y-4">
            <div className="text-4xl mb-4">📅</div>
            <div className="text-lg font-semibold text-slate-900">暂无复习计划</div>
            <div className="text-sm text-slate-600">
              创建复习计划，系统化复习错题
            </div>
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan._id}
              className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p className="text-sm text-slate-600 mb-3">{plan.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">
                      {plan.type === 'daily' ? '每日' :
                       plan.type === 'weekly' ? '每周' : '自定义'}
                    </span>
                    <span className="px-2 py-1 rounded bg-purple-100 text-purple-700">
                      {plan.strategy === 'due' ? '到期复习' :
                       plan.strategy === 'unmastered' ? '未掌握优先' :
                       plan.strategy === 'all' ? '全部错题' :
                       plan.strategy === 'random' ? '随机' : '按分类'}
                    </span>
                    <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                      每日 {plan.dailyCount} 道
                    </span>
                    <span className={`px-2 py-1 rounded ${
                      plan.status === 'active' ? 'bg-green-100 text-green-700' :
                      plan.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      plan.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {plan.status === 'active' ? '进行中' :
                       plan.status === 'paused' ? '已暂停' :
                       plan.status === 'completed' ? '已完成' : '已取消'}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(plan.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-xs text-slate-600">总复习次数</div>
                  <div className="text-lg font-bold">{plan.stats?.totalReviews || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">已完成</div>
                  <div className="text-lg font-bold">{plan.stats?.completedReviews || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">已掌握</div>
                  <div className="text-lg font-bold text-green-600">
                    {plan.stats?.masteredCount || 0}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {plan.status === 'active' && (
                  <button
                    onClick={() => handleExecute(plan._id)}
                    className="btn btn-sm btn-primary"
                  >
                    开始今日复习
                  </button>
                )}
                <button
                  onClick={() => handleEdit(plan)}
                  className="btn btn-sm btn-outline"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(plan._id)}
                  className="btn btn-sm btn-ghost text-red-600"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

