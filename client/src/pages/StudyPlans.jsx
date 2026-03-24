/**
 * GraphTutor V3.0 - 学习计划管理页面
 * 
 * 功能：管理学习计划、查看日历、打卡
 */

import { useState, useEffect } from 'react';
import StudyPlanGenerator from '../components/StudyPlanGenerator';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getStudyPlans,
  getStudyPlanDetail,
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
  getStudyStats,
  checkIn,
  getCheckIns,
  getCalendarView,
} from '../api/v3/studyPlans';
import { toast } from '../utils/toast';

export default function StudyPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans'); // plans, calendar, checkin
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    type: 'daily',
    startDate: '',
    endDate: '',
    dailyTarget: 10,
    subjectCodes: [],
    reminders: { enabled: false, times: [] },
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [checkInData, setCheckInData] = useState({
    studyDuration: 0,
    completedQuestions: 0,
    correctQuestions: 0,
    mood: 'normal',
    summary: '',
  });
  const [todayCheckIn, setTodayCheckIn] = useState(null);

  useEffect(() => {
    if (user) {
      loadPlans();
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPlan && activeTab === 'calendar') {
      loadCalendarData();
    }
  }, [selectedPlan, activeTab, currentDate]);

  useEffect(() => {
    if (selectedPlan && activeTab === 'checkin') {
      loadTodayCheckIn();
    }
  }, [selectedPlan, activeTab]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const result = await getStudyPlans({ status: 'active' });
      setPlans(result.data.items || []);
      if (result.data.items && result.data.items.length > 0 && !selectedPlan) {
        setSelectedPlan(result.data.items[0]);
      }
    } catch (err) {
      console.error('加载学习计划失败:', err);
      toast('加载学习计划失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getStudyStats();
      setStats(result.data);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  };

  const loadCalendarData = async () => {
    if (!selectedPlan) return;
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const result = await getCalendarView(selectedPlan._id, year, month);
      setCalendarData(result.data || {});
    } catch (err) {
      console.error('加载日历数据失败:', err);
    }
  };

  const loadTodayCheckIn = async () => {
    if (!selectedPlan) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await getCheckIns(selectedPlan._id, {
        startDate: today,
        endDate: today,
        limit: 1,
      });
      if (result.data.items && result.data.items.length > 0) {
        setTodayCheckIn(result.data.items[0]);
        setCheckInData({
          studyDuration: result.data.items[0].studyDuration || 0,
          completedQuestions: result.data.items[0].completedQuestions || 0,
          correctQuestions: result.data.items[0].correctQuestions || 0,
          mood: result.data.items[0].mood || 'normal',
          summary: result.data.items[0].summary || '',
        });
      } else {
        setTodayCheckIn(null);
        setCheckInData({
          studyDuration: 0,
          completedQuestions: 0,
          correctQuestions: 0,
          mood: 'normal',
          summary: '',
        });
      }
    } catch (err) {
      console.error('加载打卡记录失败:', err);
    }
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setPlanForm({
      name: '',
      description: '',
      type: 'daily',
      startDate: today.toISOString().split('T')[0],
      endDate: nextWeek.toISOString().split('T')[0],
      dailyTarget: 10,
      subjectCodes: [],
      reminders: { enabled: false, times: [] },
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name.trim()) {
      toast('请输入计划名称', 'warning');
      return;
    }
    if (!planForm.startDate || !planForm.endDate) {
      toast('请选择开始和结束日期', 'warning');
      return;
    }
    try {
      if (editingPlan) {
        await updateStudyPlan(editingPlan._id, planForm);
        toast('更新成功', 'success');
      } else {
        const result = await createStudyPlan(planForm);
        toast('创建成功', 'success');
        setSelectedPlan(result.data);
      }
      setShowPlanModal(false);
      loadPlans();
      loadStats();
    } catch (err) {
      console.error('保存计划失败:', err);
      toast(err.message || '保存计划失败', 'error');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('确定要删除此学习计划吗？')) {
      return;
    }
    try {
      await deleteStudyPlan(planId);
      toast('删除成功', 'success');
      if (selectedPlan && selectedPlan._id === planId) {
        setSelectedPlan(null);
      }
      loadPlans();
      loadStats();
    } catch (err) {
      console.error('删除计划失败:', err);
      toast(err.message || '删除计划失败', 'error');
    }
  };

  const handleCheckIn = async () => {
    if (!selectedPlan) {
      toast('请先选择学习计划', 'warning');
      return;
    }
    try {
      await checkIn(selectedPlan._id, {
        date: new Date(),
        ...checkInData,
      });
      toast('打卡成功', 'success');
      loadTodayCheckIn();
      loadStats();
      if (selectedPlan) {
        const updated = await getStudyPlanDetail(selectedPlan._id);
        setSelectedPlan(updated.data);
      }
    } catch (err) {
      console.error('打卡失败:', err);
      toast(err.message || '打卡失败', 'error');
    }
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // 空白天数
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // 实际天数
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];
      const dayData = calendarData[dateKey] || {};
      days.push({ day, date, dateKey, ...dayData });
    }

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {year}年{month + 1}月
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const prev = new Date(currentDate);
                prev.setMonth(prev.getMonth() - 1);
                setCurrentDate(prev);
              }}
              className="px-3 py-1 border rounded-lg hover:bg-slate-50"
            >
              上月
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 border rounded-lg hover:bg-slate-50"
            >
              今天
            </button>
            <button
              onClick={() => {
                const next = new Date(currentDate);
                next.setMonth(next.getMonth() + 1);
                setCurrentDate(next);
              }}
              className="px-3 py-1 border rounded-lg hover:bg-slate-50"
            >
              下月
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <div key={day} className="text-center font-semibold text-slate-600 py-2">
              {day}
            </div>
          ))}
          {days.map((dayData, idx) => {
            if (!dayData) {
              return <div key={idx} className="aspect-square" />;
            }
            const { day, dateKey, task, checkIn } = dayData;
            const isToday = dateKey === new Date().toISOString().split('T')[0];
            const isCompleted = task && task.status === 'completed';
            const hasCheckIn = !!checkIn;

            return (
              <div
                key={idx}
                className={`aspect-square border rounded-lg p-2 flex flex-col items-center justify-center text-sm ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                } ${isCompleted ? 'bg-green-50' : ''} ${hasCheckIn ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <div className="font-medium">{day}</div>
                {task && (
                  <div className="text-xs text-slate-600 mt-1">
                    {task.completedCount}/{task.targetCount}
                  </div>
                )}
                {hasCheckIn && <div className="text-xs">✓</div>}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border border-green-500 rounded" />
            <span>已完成</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 ring-2 ring-yellow-400 rounded" />
            <span>已打卡</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 bg-blue-50 rounded" />
            <span>今天</span>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <div className="text-slate-500">请先登录</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">学习计划</h1>
          <button
            onClick={handleCreatePlan}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 新建计划
          </button>
        </div>
        {stats && (
          <div className="flex gap-4 text-sm text-slate-600">
            <span>连续打卡：{stats.currentStreak || 0} 天</span>
            <span>总学习时长：{Math.round((stats.totalDuration || 0) / 60)} 小时</span>
            <span>总完成题数：{stats.totalQuestions || 0} 题</span>
            <span>正确率：{stats.accuracy || 0}%</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：计划列表 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border p-4">
            <h2 className="font-bold mb-4">我的计划</h2>
            {loading ? (
              <div className="text-center py-4 text-slate-500">加载中...</div>
            ) : plans.length === 0 ? (
              <div className="text-center py-4 text-slate-500">
                <div className="mb-2">暂无计划</div>
                <button
                  onClick={handleCreatePlan}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  创建第一个计划
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {plans.map(plan => (
                  <div
                    key={plan._id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedPlan && selectedPlan._id === plan._id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium truncate">{plan.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {plan.stats?.completedDays || 0}/{plan.stats?.totalDays || 0} 天
                    </div>
                    <div className="text-xs text-slate-500">
                      连续 {plan.stats?.currentStreak || 0} 天
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：主要内容 */}
        <div className="lg:col-span-3">
          {selectedPlan ? (
            <>
              {/* 标签页 */}
              <div className="bg-white rounded-lg border mb-4">
                <div className="flex border-b">
                  <button
                    onClick={() => setActiveTab('plans')}
                    className={`px-4 py-2 border-b-2 ${
                      activeTab === 'plans'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600'
                    }`}
                  >
                    计划详情
                  </button>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-4 py-2 border-b-2 ${
                      activeTab === 'calendar'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600'
                    }`}
                  >
                    日历视图
                  </button>
                  <button
                    onClick={() => setActiveTab('checkin')}
                    className={`px-4 py-2 border-b-2 ${
                      activeTab === 'checkin'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600'
                    }`}
                  >
                    今日打卡
                  </button>
                </div>
              </div>

              {/* 计划详情 */}
              {activeTab === 'plans' && (
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">{selectedPlan.name}</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPlan(selectedPlan);
                          setPlanForm({
                            name: selectedPlan.name,
                            description: selectedPlan.description || '',
                            type: selectedPlan.type,
                            startDate: new Date(selectedPlan.startDate).toISOString().split('T')[0],
                            endDate: new Date(selectedPlan.endDate).toISOString().split('T')[0],
                            dailyTarget: selectedPlan.dailyTarget,
                            subjectCodes: selectedPlan.subjectCodes || [],
                            reminders: selectedPlan.reminders || { enabled: false, times: [] },
                          });
                          setShowPlanModal(true);
                        }}
                        className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeletePlan(selectedPlan._id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  {selectedPlan.description && (
                    <div className="text-slate-600 mb-4">{selectedPlan.description}</div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-slate-600">开始日期</div>
                      <div className="font-medium">
                        {new Date(selectedPlan.startDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">结束日期</div>
                      <div className="font-medium">
                        {new Date(selectedPlan.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">每日目标</div>
                      <div className="font-medium">{selectedPlan.dailyTarget} 题</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600">状态</div>
                      <div className="font-medium">
                        {selectedPlan.status === 'active' ? '进行中' : selectedPlan.status}
                      </div>
                    </div>
                  </div>
                  {selectedPlan.stats && (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-sm text-slate-600">总天数</div>
                        <div className="text-2xl font-bold">{selectedPlan.stats.totalDays || 0}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">已完成</div>
                        <div className="text-2xl font-bold">
                          {selectedPlan.stats.completedDays || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">完成题数</div>
                        <div className="text-2xl font-bold">
                          {selectedPlan.stats.completedQuestions || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">连续打卡</div>
                        <div className="text-2xl font-bold">
                          {selectedPlan.stats.currentStreak || 0} 天
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-600">最长连续</div>
                        <div className="text-2xl font-bold">
                          {selectedPlan.stats.longestStreak || 0} 天
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 日历视图 */}
              {activeTab === 'calendar' && renderCalendar()}

              {/* 打卡 */}
              {activeTab === 'checkin' && (
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-bold mb-4">今日打卡</h3>
                  {todayCheckIn && (
                    <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg">
                      今日已打卡 ✓
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">学习时长（分钟）</label>
                      <input
                        type="number"
                        value={checkInData.studyDuration}
                        onChange={(e) =>
                          setCheckInData({ ...checkInData, studyDuration: parseInt(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">完成题数</label>
                      <input
                        type="number"
                        value={checkInData.completedQuestions}
                        onChange={(e) =>
                          setCheckInData({
                            ...checkInData,
                            completedQuestions: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">正确题数</label>
                      <input
                        type="number"
                        value={checkInData.correctQuestions}
                        onChange={(e) =>
                          setCheckInData({
                            ...checkInData,
                            correctQuestions: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">今日心情</label>
                      <div className="flex gap-2">
                        {['great', 'good', 'normal', 'bad'].map(mood => (
                          <button
                            key={mood}
                            onClick={() => setCheckInData({ ...checkInData, mood })}
                            className={`px-4 py-2 rounded-lg ${
                              checkInData.mood === mood
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {mood === 'great' ? '很好' : mood === 'good' ? '不错' : mood === 'normal' ? '一般' : '不好'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">学习总结</label>
                      <textarea
                        value={checkInData.summary}
                        onChange={(e) => setCheckInData({ ...checkInData, summary: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows="3"
                        placeholder="记录今天的学习心得..."
                      />
                    </div>
                    <button
                      onClick={handleCheckIn}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {todayCheckIn ? '更新打卡' : '打卡'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg border p-12 text-center">
              <div className="text-4xl mb-4">📅</div>
              <div className="text-lg font-semibold text-slate-900 mb-2">选择一个学习计划</div>
              <div className="text-sm text-slate-600 mb-4">
                或创建一个新的学习计划开始你的学习之旅
              </div>
              <button
                onClick={handleCreatePlan}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建计划
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 计划编辑弹窗 */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              {editingPlan ? '编辑计划' : '新建计划'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">计划名称 *</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="请输入计划名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">计划描述</label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="请输入计划描述"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">开始日期 *</label>
                  <input
                    type="date"
                    value={planForm.startDate}
                    onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">结束日期 *</label>
                  <input
                    type="date"
                    value={planForm.endDate}
                    onChange={(e) => setPlanForm({ ...planForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">每日目标题数 *</label>
                <input
                  type="number"
                  value={planForm.dailyTarget}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, dailyTarget: parseInt(e.target.value) || 10 })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowPlanModal(false);
                  setEditingPlan(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSavePlan}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingPlan ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

