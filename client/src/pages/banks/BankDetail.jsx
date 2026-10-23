/**
 * GraphTutor V3.0 - 题库详情页面
 * 
 * 功能：显示题库详细信息、统计、题目列表
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getBank,
  getBankStats,
  getBankActivity,
  getBankDistribution,
  purchaseBank,
} from '../../api/v3/questionBanks';
import { toast } from '../../utils/toast';
import { getQuestions } from '../../api/v3/questions';
import BatchQuestionGenerator from '../../components/BatchQuestionGenerator';

export default function BankDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bank, setBank] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('overview'); // overview, questions, stats

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [bankData, statsData, activityData, distributionData, questionsData] =
        await Promise.all([
          getBank(id),
          getBankStats(id).catch(() => null),
          getBankActivity(id, 30).catch(() => []),
          getBankDistribution(id).catch(() => null),
          getQuestions({ bankId: id, limit: 20 }).catch(() => ({ data: [] })),
        ]);

      setBank(bankData);
      setStats(statsData);
      setActivity(activityData);
      setDistribution(distributionData);
      setQuestions(questionsData.data);
    } catch (err) {
      console.error('加载题库详情失败:', err);
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const canEdit =
    user?.role === 'admin' ||
    bank?.ownerId?._id === user?.id ||
    bank?.managers?.some((m) => m._id === user?.id);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error || !bank) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error || '题库不存在'}
        </div>
        <button
          onClick={() => navigate('/banks')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">{bank.name}</h1>
            {bank.description && (
              <p className="text-slate-600">{bank.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => navigate(`/banks/${id}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                编辑
              </button>
            )}
            <button
              onClick={() => navigate('/banks')}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50"
            >
              返回
            </button>
          </div>
        </div>

        {/* 基本信息卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-slate-600">题目数量</div>
            <div className="text-2xl font-bold mt-1">
              {bank.questionCount || 0}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-slate-600">学科</div>
            <div className="text-lg font-medium mt-1">
              {bank.subjectCode?.name || bank.subjectCode || '未分类'}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-slate-600">解锁积分</div>
            <div className="text-lg font-medium mt-1">
              {bank.pricePoints > 0 ? `${bank.pricePoints} 积分` : '免费'}
            </div>
            {bank.pricePoints > 0 && bank.unlocked === false && (
              <button
                type="button"
                className="mt-2 text-sm text-blue-600 hover:underline"
                onClick={async () => {
                  try {
                    await purchaseBank(id);
                    toast.success('题库已解锁');
                    loadData();
                  } catch (err) {
                    toast.error(err.response?.data?.message || err.message || '解锁失败');
                  }
                }}
              >
                用积分解锁
              </button>
            )}
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-slate-600">状态</div>
            <div className="mt-1">
              <span
                className={`px-2 py-1 text-xs rounded ${
                  bank.isPublic
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {bank.isPublic ? '公开' : '私有'}
              </span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-slate-600">创建者</div>
            <div className="text-lg font-medium mt-1">
              {bank.ownerId?.name || bank.ownerId?.email || '-'}
            </div>
          </div>
          {bank.groupId && (
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-slate-600">关联群组</div>
              <div className="text-lg font-medium mt-1">
                {bank.groupId?.name || '-'}
                {bank.groupId?.code && (
                  <span className="text-xs text-slate-500 ml-2">
                    ({bank.groupId.code})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b mb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600'
            }`}
          >
            概览
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'questions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600'
            }`}
          >
            题目 ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'stats'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600'
            }`}
          >
            统计
          </button>
          <button
            onClick={() => navigate(`/banks/${id}/stats`)}
            className="px-4 py-2 border-b-2 border-transparent text-slate-600 hover:text-blue-600"
          >
            详细统计
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {stats && (
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-bold mb-4">统计信息</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-600">总题目数</div>
                  <div className="text-2xl font-bold">{stats.totalQuestions}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">平均正确率</div>
                  <div className="text-2xl font-bold">
                    {stats.accuracy?.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">30天活跃度</div>
                  <div className="text-2xl font-bold">
                    {stats.recentActivity?.recordsCount || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-bold mb-4">快捷操作</h2>
            <div className="flex flex-wrap gap-4">
              {/* 所有用户都可以使用的操作 */}
              <button
                onClick={() => navigate(`/exam?bankId=${id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                📝 去考试
              </button>
              <button
                onClick={() => navigate(`/quiz?bankId=${id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ✏️ 去练习
              </button>
              
              {/* 只有编辑权限的用户才能使用的操作 */}
              {canEdit && (
                <>
                  <button
                    onClick={() => navigate(`/questions/create?bankId=${id}`)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    + 添加题目
                  </button>
                  <button
                    onClick={() => navigate(`/ai?bankId=${id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    🤖 AI生成题目
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 批量题目生成器 */}
          {canEdit && (
            <div className="mt-6">
              <BatchQuestionGenerator
                defaultBankId={id}
                defaultSubjectCode={bank.subjectCode}
                onSuccess={() => {
                  loadData(); // 重新加载数据
                }}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          {questions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              该题库暂无题目
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    题目
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    难度
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {questions.map((q) => (
                  <tr key={q._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{q.content}</div>
                      {q.qid && (
                        <div className="text-xs text-slate-500 mt-1">
                          {q.qid}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 rounded text-sm">
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/questions/${q._id}`)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* 难度分布图表 */}
          {stats.difficultyDistribution && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-bold mb-4">难度分布</h3>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((level) => {
                  const count = stats.difficultyDistribution[level] || 0;
                  const percentage = stats.totalQuestions > 0
                    ? ((count / stats.totalQuestions) * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">难度 {level}</span>
                        <span className="text-slate-600">
                          {count} 题 ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 题型分布 */}
          {stats.typeDistribution && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-bold mb-4">题型分布</h3>
              <div className="space-y-3">
                {[
                  { key: 'single', label: '单选题', color: 'bg-blue-600' },
                  { key: 'multiple', label: '多选题', color: 'bg-green-600' },
                  { key: 'judge', label: '判断题', color: 'bg-yellow-600' },
                  { key: 'fill', label: '填空题', color: 'bg-blue-600' },
                  { key: 'short', label: '简答题', color: 'bg-pink-600' },
                ].map(({ key, label, color }) => {
                  const count = stats.typeDistribution[key] || 0;
                  const percentage = stats.totalQuestions > 0
                    ? ((count / stats.totalQuestions) * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{label}</span>
                        <span className="text-slate-600">
                          {count} 题 ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`${color} h-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 学科分布 */}
          {distribution?.bySubject && Object.keys(distribution.bySubject).length > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-bold mb-4">学科分布</h3>
              <div className="space-y-2">
                {Object.entries(distribution.bySubject).map(([subject, count]) => (
                  <div key={subject} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm font-medium">{subject || '未分类'}</span>
                    <span className="text-sm text-slate-600">{count} 题</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 活跃度趋势 */}
          {activity && activity.length > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-bold mb-4">30天活跃度趋势</h3>
              <div className="space-y-2">
                {activity.slice(-7).map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-20 text-xs text-slate-600">
                      {new Date(item.date).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-green-600 h-full"
                        style={{
                          width: `${Math.min((item.count / Math.max(...activity.map(a => a.count))) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="w-12 text-xs text-right text-slate-600">
                      {item.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 标签分布 */}
          {distribution?.byTags && Object.keys(distribution.byTags).length > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-bold mb-4">标签分布</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(distribution.byTags)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([tag, count]) => (
                    <div
                      key={tag}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag} ({count})
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

