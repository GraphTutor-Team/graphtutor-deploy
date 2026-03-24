/**
 * GraphTutor V3.0 - 题库统计仪表板
 * 
 * 功能：显示题库的详细统计数据，包括题目分布、使用情况、活跃度等
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getBank,
  getBankStats,
  getBankActivity,
  getBankDistribution,
  getBankUsage,
} from '../../api/v3/questionBanks';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from '../../utils/toast';

const COLORS = ['#1d4ed8', '#047857', '#0f766e', '#6366f1', '#0ea5e9', '#ec4899', '#f59e0b'];
const DIFFICULTY_LABELS = {
  1: '非常简单',
  2: '简单',
  3: '中等',
  4: '困难',
  5: '非常困难',
};
const TYPE_LABELS = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
  fill: '填空题',
  short: '简答题',
};

export default function BankStats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bank, setBank] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [id, days]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [bankData, statsData, activityData, distributionData, usageData] =
        await Promise.all([
          getBank(id).catch(() => null),
          getBankStats(id).catch(() => null),
          getBankActivity(id, days).catch(() => []),
          getBankDistribution(id).catch(() => null),
          getBankUsage(id).catch(() => null),
        ]);

      setBank(bankData);
      setStats(statsData);
      setActivity(activityData);
      setDistribution(distributionData);
      setUsage(usageData);
    } catch (err) {
      console.error('加载统计数据失败:', err);
      setError(err.message || '加载失败');
      toast.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 准备难度分布数据
  const difficultyData = stats?.difficultyDistribution
    ? Object.entries(stats.difficultyDistribution)
        .map(([level, count]) => ({
          level: parseInt(level),
          label: DIFFICULTY_LABELS[level] || `难度${level}`,
          count,
        }))
        .filter(item => item.count > 0)
    : [];

  // 准备题型分布数据
  const typeData = stats?.typeDistribution
    ? Object.entries(stats.typeDistribution)
        .map(([type, count]) => ({
          type,
          label: TYPE_LABELS[type] || type,
          count,
        }))
        .filter(item => item.count > 0)
    : [];

  // 准备活跃度数据
  const activityChartData = activity.map(item => ({
    date: item.date,
    total: item.total,
    correct: item.correct,
    accuracy: Math.round(item.accuracy * 100) / 100,
  }));

  // 准备学科分布数据
  const subjectData = distribution?.bySubject
    ? distribution.bySubject
        .map(item => ({
          name: item._id || '未分类',
          value: item.count,
        }))
        .slice(0, 10)
    : [];

  // 准备标签分布数据
  const tagData = distribution?.byTag && Array.isArray(distribution.byTag)
    ? distribution.byTag
        .map(item => ({
          name: item.tag,
          value: item.count,
        }))
        .slice(0, 10)
    : [];

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
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error || '题库不存在'}
        </div>
        <button
          onClick={() => navigate('/banks')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">{bank.name} - 统计仪表板</h1>
          {bank.description && (
            <p className="text-slate-600 dark:text-slate-400">{bank.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
          >
            <option value={7}>最近7天</option>
            <option value={30}>最近30天</option>
            <option value={90}>最近90天</option>
          </select>
          <Link
            to={`/banks/${id}`}
            className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            返回详情
          </Link>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">总题目数</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats?.totalQuestions || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">平均正确率</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats?.accuracy ? `${stats.accuracy.toFixed(1)}%` : '0%'}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">使用用户数</div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {usage?.totalUsers || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">总答题次数</div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {usage?.totalRecords || 0}
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 难度分布 - 柱状图 */}
        {difficultyData.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4">难度分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1d4ed8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 题型分布 - 饼图 */}
        {typeData.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4">题型分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ label, count }) => `${label}: ${count}`}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 活跃度趋势 - 折线图 */}
        {activityChartData.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700 lg:col-span-2">
            <h3 className="text-lg font-bold mb-4">活跃度趋势</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total"
                  stroke="#1d4ed8"
                  name="答题次数"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="correct"
                  stroke="#047857"
                  name="正确次数"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#ec4899"
                  name="正确率 (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 学科分布 - 饼图 */}
        {subjectData.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4">学科分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subjectData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 标签分布 - 柱状图 */}
        {tagData.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4">热门标签</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tagData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 使用情况统计 */}
      {usage && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">使用情况统计</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">已练习题目数</div>
              <div className="text-2xl font-bold">
                {usage.uniqueQuestionsPracticed || 0} / {stats?.totalQuestions || 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                覆盖率:{' '}
                {stats?.totalQuestions > 0
                  ? `${((usage.uniqueQuestionsPracticed / stats.totalQuestions) * 100).toFixed(1)}%`
                  : '0%'}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">平均正确率</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {usage.averageAccuracy?.toFixed(1) || 0}%
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">总答题次数</div>
              <div className="text-2xl font-bold">{usage.totalRecords || 0}</div>
            </div>
          </div>

          {/* 活跃用户排行 */}
          {usage.topUsers && usage.topUsers.length > 0 && (
            <div>
              <h4 className="text-md font-semibold mb-3">活跃用户排行</h4>
              <div className="space-y-2">
                {usage.topUsers.map((userStat, index) => (
                  <div
                    key={userStat.userId}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">用户 {userStat.userId.slice(-8)}</div>
                        <div className="text-xs text-slate-500">
                          答题 {userStat.recordCount} 次
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        {userStat.accuracy?.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-500">正确率</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 难度分布详情 */}
      {difficultyData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">难度分布详情</h3>
          <div className="space-y-3">
            {difficultyData.map((item) => {
              const percentage =
                stats?.totalQuestions > 0
                  ? ((item.count / stats.totalQuestions) * 100).toFixed(1)
                  : 0;
              return (
                <div key={item.level} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {item.count} 题 ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
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
    </div>
  );
}

