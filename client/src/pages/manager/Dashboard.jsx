/**
 * GraphTutor V3.0 - 出题负责人工作台
 * 
 * 功能：出题负责人的工作概览、待办任务、数据统计
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getBanks } from '../../api/v3/questionBanks';
import { getQuestions } from '../../api/v3/questions';
import { getAIStats } from '../../api/v3/ai';
import { getSubjectTree } from '../../api/v3/subjects';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/PageHeader';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    myBanks: 0,
    myQuestions: 0,
    recentActivity: 0,
    aiUsage: 0,
    totalSubjects: 0,
  });

  const [myBanks, setMyBanks] = useState([]);
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [aiStats, setAiStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [subjectStats, setSubjectStats] = useState([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const userId = user?._id || user?.id;

      // 并行加载所有数据
      const [banksResult, questionsResult, subjectsData, aiData] = await Promise.all([
        getBanks({
          managerId: userId,
          limit: 10,
        }).catch(() => ({ data: [], meta: { total: 0 } })),
        getQuestions({
          managerId: userId,
          limit: 10,
          sort: '-createdAt',
        }).catch(() => ({ data: [], meta: { total: 0 } })),
        getSubjectTree().catch(() => []),
        getAIStats().catch(() => null),
      ]);

      setMyBanks(banksResult.data || []);
      setRecentQuestions(questionsResult.data || []);
      setSubjects(subjectsData || []);
      setAiStats(aiData);

      // 计算学科总数（递归统计）
      const countSubjects = (subjects) => {
        let count = 0;
        for (const subject of subjects) {
          count++;
          if (subject.children && subject.children.length > 0) {
            count += countSubjects(subject.children);
          }
        }
        return count;
      };

      // 计算统计
      setStats({
        myBanks: banksResult.meta?.total || 0,
        myQuestions: questionsResult.meta?.total || 0,
        recentActivity: questionsResult.data?.length || 0,
        aiUsage: aiData?.total?.totalCount || 0,
        totalSubjects: countSubjects(subjectsData || []),
      });

      // 构建最近活动列表
      const activities = [];
      if (banksResult.data && banksResult.data.length > 0) {
        banksResult.data.slice(0, 3).forEach(bank => {
          activities.push({
            type: 'bank',
            title: `创建题库：${bank.name}`,
            time: bank.createdAt,
            link: `/banks/${bank._id}`,
          });
        });
      }
      if (questionsResult.data && questionsResult.data.length > 0) {
        questionsResult.data.slice(0, 3).forEach(question => {
          activities.push({
            type: 'question',
            title: `创建题目：${question.content?.substring(0, 30)}...`,
            time: question.createdAt,
            link: `/questions/${question._id}/detail`,
          });
        });
      }
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivity(activities.slice(0, 5));
    } catch (err) {
      console.error('加载工作台数据失败:', err);
      setError(err.message || '加载数据失败');
      toast.error('加载工作台数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="出题负责人工作台" subtitle="加载中..." />
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="出题负责人工作台" subtitle="加载失败" />
        <div className="card bg-red-50 border-red-200 text-red-700 p-4">
          {error}
          <button
            onClick={loadData}
            className="mt-2 btn btn-sm btn-outline"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="出题负责人工作台"
        subtitle={`欢迎回来，${user?.name || user?.email}`}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm text-slate-600 mb-1">我的题库</div>
          <div className="text-3xl font-bold text-blue-600">{stats.myBanks}</div>
          <button
            onClick={() => navigate('/banks')}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            查看全部 →
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm text-slate-600 mb-1">我的题目</div>
          <div className="text-3xl font-bold text-green-600">
            {stats.myQuestions}
          </div>
          <button
            onClick={() => navigate('/questions')}
            className="mt-2 text-sm text-green-600 hover:underline"
          >
            查看全部 →
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm text-slate-600 mb-1">学科总数</div>
          <div className="text-3xl font-bold text-blue-600">
            {stats.totalSubjects}
          </div>
          <button
            onClick={() => navigate('/subjects')}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            学科管理 →
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm text-slate-600 mb-1">AI使用次数</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.aiUsage}
          </div>
          <button
            onClick={() => navigate('/ai')}
            className="mt-2 text-sm text-orange-600 hover:underline"
          >
            AI控制台 →
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm text-slate-600 mb-1">最近活动</div>
          <div className="text-3xl font-bold text-indigo-600">
            {stats.recentActivity}
          </div>
          <div className="mt-2 text-xs text-slate-500">最近创建的项目</div>
        </div>
      </div>

      {/* 智能出题（知识点+难度）Phase 1.3 */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">智能出题（知识点+难度）</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          输入知识点与难度，一键生成题目（含答案与解析），审核后可批量入库。
        </p>
        <button
          onClick={() => navigate('/ai')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          去出题
        </button>
      </div>

      {/* 学科统计 */}
      {subjectStats.length > 0 && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">我的题目学科分布</h2>
          <div className="space-y-2">
            {subjectStats.map((stat, index) => (
              <div key={stat.name} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm font-medium">{stat.name}</span>
                <span className="text-sm text-slate-600">{stat.count} 道题</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 快捷操作 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-bold mb-1">快捷操作</h2>
        <p className="text-sm text-slate-500 mb-4">创建、导入和 AI 出题都从这里进入，不必再在侧栏单独找。</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <button
            onClick={() => navigate('/banks/create')}
            className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
          >
            <div className="text-sm font-semibold text-slate-700 mb-1">创建题库</div>
            <div className="text-xs text-slate-500">新建一个题库</div>
          </button>
          <button
            onClick={() => navigate('/questions/create')}
            className="p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 text-left transition-colors"
          >
            <div className="text-sm font-semibold text-slate-700 mb-1">创建题目</div>
            <div className="text-xs text-slate-500">手动创建新题目</div>
          </button>
          <button
            onClick={() => navigate('/questions/import')}
            className="p-4 border rounded-lg hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors"
          >
            <div className="text-sm font-semibold text-slate-700 mb-1">题目导入</div>
            <div className="text-xs text-slate-500">批量导入题目</div>
          </button>
          <button
            onClick={() => navigate('/banks/import')}
            className="p-4 border rounded-lg hover:bg-teal-50 hover:border-teal-300 text-left transition-colors"
          >
            <div className="text-sm font-semibold text-slate-700 mb-1">题库导入</div>
            <div className="text-xs text-slate-500">批量导入题库</div>
          </button>
          <button
            onClick={() => navigate('/ai')}
            className="p-4 border rounded-lg hover:bg-slate-50 hover:border-slate-300 text-left transition-colors"
          >
            <div className="text-sm font-semibold text-slate-700 mb-1">AI生成</div>
            <div className="text-xs text-slate-500">使用AI生成题目</div>
          </button>
          <button
            onClick={() => navigate('/subjects')}
            className="p-4 border rounded-lg hover:bg-slate-50 hover:border-slate-300 text-left transition-colors"
          >
            <div className="text-sm font-semibold text-slate-700 mb-1">学科管理</div>
            <div className="text-xs text-slate-500">管理学科分类</div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 我的题库 */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">我的题库</h2>
            <button
              onClick={() => navigate('/banks')}
              className="text-sm text-blue-600 hover:underline"
            >
              查看全部 →
            </button>
          </div>
          {myBanks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="mb-2">暂无题库</div>
              <button
                onClick={() => navigate('/banks/create')}
                className="text-blue-600 hover:underline text-sm"
              >
                立即创建
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myBanks.slice(0, 5).map((bank) => (
                <div
                  key={bank._id}
                  className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/banks/${bank._id}`)}
                >
                  <div className="font-medium">{bank.name}</div>
                  <div className="text-sm text-slate-600 mt-1 flex items-center gap-3">
                    <span>{bank.questionCount || 0} 道题目</span>
                    {bank.subjectCode && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {bank.subjectCode}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最近题目 */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">最近题目</h2>
            <button
              onClick={() => navigate('/questions')}
              className="text-sm text-blue-600 hover:underline"
            >
              查看全部 →
            </button>
          </div>
          {recentQuestions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="mb-2">暂无题目</div>
              <button
                onClick={() => navigate('/questions/create')}
                className="text-blue-600 hover:underline text-sm"
              >
                立即创建
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentQuestions.slice(0, 5).map((question) => (
                <div
                  key={question._id}
                  className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/questions/${question._id}/detail`)}
                >
                  <div className="font-medium text-sm line-clamp-2">
                    {question.content}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>难度 {question.difficulty}</span>
                    <span>·</span>
                    <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                    {question.type && (
                      <>
                        <span>·</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          {question.type}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 最近活动 */}
      {recentActivity.length > 0 && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">最近活动</h2>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => activity.link && navigate(activity.link)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{activity.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(activity.time).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    activity.type === 'bank' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {activity.type === 'bank' ? '题库' : '题目'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI使用统计 */}
      {aiStats && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">AI使用统计（最近30天）</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-slate-600 mb-1">总调用次数</div>
              <div className="text-2xl font-bold text-blue-600">
                {aiStats.total?.totalCount || 0}
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-slate-600 mb-1">总成本</div>
              <div className="text-2xl font-bold text-green-600">
                ${(aiStats.total?.totalCost || 0).toFixed(2)}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-600 mb-1">平均响应时间</div>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(aiStats.total?.avgDuration || 0)}ms
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
