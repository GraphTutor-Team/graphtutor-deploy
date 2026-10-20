/**
 * GraphTutor V3.0 - 每日学习打卡页面
 * 
 * 功能：独立的每日学习打卡功能，记录学习情况
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllCheckIns, getCheckIns, checkIn } from '../api/v3/studyPlans';
import { getStudyPlans } from '../api/v3/studyPlans';
import { getEquipment } from '../api/v3/equipment';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import PlanHubNav from '../components/PlanHubNav';
import LoginPrompt from '../components/common/LoginPrompt';

const MOOD_OPTIONS = [
  { value: 'great', label: '很好', emoji: '😊', color: 'bg-green-100 text-green-700' },
  { value: 'good', label: '不错', emoji: '🙂', color: 'bg-blue-100 text-blue-700' },
  { value: 'normal', label: '一般', emoji: '😐', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'bad', label: '不好', emoji: '😔', color: 'bg-red-100 text-red-700' },
];

export default function CheckIn() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkInHistory, setCheckInHistory] = useState([]);
  const [stats, setStats] = useState({
    totalDays: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalQuestions: 0,
    totalDuration: 0,
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    studyDuration: 0,
    completedQuestions: 0,
    correctQuestions: 0,
    mood: 'normal',
    summary: '',
  });

  const [todayCheckIn, setTodayCheckIn] = useState(null);
  const [equipmentData, setEquipmentData] = useState(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      getEquipment()
        .then((res) => setEquipmentData(res?.data ?? null))
        .catch(() => setEquipmentData(null));
    }
  }, [user]);

  useEffect(() => {
    if (selectedPlanId) {
      loadCheckInHistory();
      checkTodayCheckIn();
    }
  }, [selectedPlanId, formData.date]);

  const loadData = async () => {
    try {
      setLoading(true);
      const plansResult = await getStudyPlans({ status: 'active' });
      const plansList = plansResult.data.items || [];
      setPlans(plansList);
      
      if (plansList.length > 0) {
        setSelectedPlanId(plansList[0]._id);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      toast('加载数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkTodayCheckIn = async () => {
    if (!selectedPlanId) return;
    try {
      const today = new Date(formData.date);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await getCheckIns(selectedPlanId, {
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString(),
        limit: 1,
      });

      if (result.data.items && result.data.items.length > 0) {
        const checkIn = result.data.items[0];
        setTodayCheckIn(checkIn);
        setFormData({
          date: formData.date,
          studyDuration: checkIn.studyDuration || 0,
          completedQuestions: checkIn.completedQuestions || 0,
          correctQuestions: checkIn.correctQuestions || 0,
          mood: checkIn.mood || 'normal',
          summary: checkIn.summary || '',
        });
      } else {
        setTodayCheckIn(null);
      }
    } catch (err) {
      console.error('检查今日打卡失败:', err);
    }
  };

  const loadCheckInHistory = async () => {
    if (!selectedPlanId) return;
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29); // 最近30天

      const result = await getCheckIns(selectedPlanId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 100,
      });

      const history = result.data.items || [];
      setCheckInHistory(history);

      // 计算统计信息
      const totalDays = history.length;
      const totalQuestions = history.reduce((sum, item) => sum + (item.completedQuestions || 0), 0);
      const totalDuration = history.reduce((sum, item) => sum + (item.studyDuration || 0), 0);

      // 计算连续打卡天数
      const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < sortedHistory.length; i++) {
        const checkInDate = new Date(sortedHistory[i].date);
        checkInDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - checkInDate) / (1000 * 60 * 60 * 24));

        if (i === 0 && daysDiff === 0) {
          currentStreak = 1;
          tempStreak = 1;
        } else if (i === 0 && daysDiff === 1) {
          currentStreak = 1;
          tempStreak = 1;
        } else if (i > 0) {
          const prevDate = new Date(sortedHistory[i - 1].date);
          prevDate.setHours(0, 0, 0, 0);
          const daysBetween = Math.floor((prevDate - checkInDate) / (1000 * 60 * 60 * 24));
          
          if (daysBetween === 1) {
            tempStreak++;
            if (i === 0 || (i > 0 && Math.floor((today - checkInDate) / (1000 * 60 * 60 * 24)) <= 1)) {
              currentStreak = tempStreak;
            }
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      setStats({
        totalDays,
        currentStreak,
        longestStreak,
        totalQuestions,
        totalDuration,
      });
    } catch (err) {
      console.error('加载打卡历史失败:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast('请先选择学习计划', 'warning');
      return;
    }

    if (formData.completedQuestions < formData.correctQuestions) {
      toast('正确题数不能大于完成题数', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await checkIn(selectedPlanId, {
        date: formData.date,
        studyDuration: formData.studyDuration,
        completedQuestions: formData.completedQuestions,
        correctQuestions: formData.correctQuestions,
        mood: formData.mood,
        summary: formData.summary,
      });

      toast(todayCheckIn ? '打卡更新成功' : '打卡成功', 'success');
      await loadCheckInHistory();
      await checkTodayCheckIn();
      getEquipment().then((res) => setEquipmentData(res?.data ?? null)).catch(() => {});
    } catch (err) {
      console.error('打卡失败:', err);
      toast(err.message || '打卡失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <LoginPrompt
        title="登录后打卡"
        description="登录后可记录每日学习打卡。也可先看教程，或直接开始练习。"
      />
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="p-6">
        <PageHeader title="每日打卡" subtitle="先有学习计划，才能记录今天的学习。" backTo="/study-plans" />
        <PlanHubNav />
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="text-4xl mb-4">📅</div>
          <div className="text-lg font-semibold text-slate-900 mb-2">暂无学习计划</div>
          <div className="text-sm text-slate-600 mb-4">
            请先创建学习计划，然后才能进行打卡
          </div>
          <Link to="/study-plans" className="btn btn-primary">
            去创建学习计划
          </Link>
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find(p => p._id === selectedPlanId);
  const accuracy = formData.completedQuestions > 0
    ? ((formData.correctQuestions / formData.completedQuestions) * 100).toFixed(1)
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="每日打卡"
        subtitle="记录今天学了多久、做了多少题。"
        backTo="/study-plans"
      />
      <PlanHubNav />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-slate-600 mb-1">连续打卡</div>
          <div className="text-2xl font-bold text-blue-600">{stats.currentStreak} 天</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-slate-600 mb-1">最长连续</div>
          <div className="text-2xl font-bold text-green-600">{stats.longestStreak} 天</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-slate-600 mb-1">总打卡天数</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalDays} 天</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-slate-600 mb-1">总学习时长</div>
          <div className="text-2xl font-bold text-orange-600">{stats.totalDuration} 分钟</div>
        </div>
      </div>

      {/* 我的装备 */}
      {equipmentData?.items?.length > 0 && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h3 className="font-semibold mb-3">我的装备</h3>
          <p className="text-sm text-slate-600 mb-3">连续打卡、累计打卡、参与多计划即可解锁虚拟装备</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {equipmentData.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  item.unlocked ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-slate-600 truncate">{item.description}</div>
                  {item.progress && !item.unlocked && (
                    <div className="text-xs text-slate-500 mt-1">
                      进度：{item.progress.current} / {item.progress.required}
                    </div>
                  )}
                </div>
                {item.unlocked ? (
                  <span className="text-xs px-2 py-1 bg-amber-200 text-amber-900 rounded">已解锁</span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded">未解锁</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 打卡表单 */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">选择学习计划</label>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {plans.map(plan => (
              <option key={plan._id} value={plan._id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>

        {selectedPlan && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">打卡日期</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">学习时长（分钟）</label>
                <input
                  type="number"
                  min="0"
                  value={formData.studyDuration}
                  onChange={(e) => setFormData({ ...formData, studyDuration: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">完成题数</label>
                <input
                  type="number"
                  min="0"
                  value={formData.completedQuestions}
                  onChange={(e) => setFormData({ ...formData, completedQuestions: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">正确题数</label>
                <input
                  type="number"
                  min="0"
                  max={formData.completedQuestions}
                  value={formData.correctQuestions}
                  onChange={(e) => setFormData({ ...formData, correctQuestions: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {formData.completedQuestions > 0 && (
                  <div className="text-xs text-slate-600 mt-1">
                    正确率: {accuracy}%
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">今日心情</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MOOD_OPTIONS.map(mood => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, mood: mood.value })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.mood === mood.value
                        ? `${mood.color} border-current`
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{mood.emoji}</div>
                    <div className="text-xs font-medium">{mood.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">学习总结（可选）</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows="3"
                placeholder="记录今天的学习心得、收获或需要改进的地方..."
                maxLength={500}
              />
              <div className="text-xs text-slate-500 mt-1">
                {formData.summary.length}/500
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              {todayCheckIn && (
                <div className="text-sm text-green-600">
                  ✓ 今日已打卡，提交将更新记录
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] touch-manipulation px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '提交中...' : (todayCheckIn ? '更新打卡' : '提交打卡')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 打卡历史 */}
      {checkInHistory.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-bold mb-4">最近打卡记录</h3>
          <div className="space-y-2">
            {checkInHistory.slice(0, 10).map((item, idx) => (
              <div
                key={item._id || idx}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {MOOD_OPTIONS.find(m => m.value === item.mood)?.emoji || '😐'}
                  </div>
                  <div>
                    <div className="font-medium">
                      {new Date(item.date).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </div>
                    <div className="text-sm text-slate-600">
                      {item.completedQuestions} 题 · {item.studyDuration} 分钟
                      {item.completedQuestions > 0 && (
                        <span className="ml-2">
                          (正确率: {((item.correctQuestions / item.completedQuestions) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {item.summary && (
                  <div className="text-sm text-slate-600 max-w-xs truncate">
                    {item.summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

