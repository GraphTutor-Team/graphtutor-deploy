/**
 * GraphTutor V3.0 - 系统统计仪表板组件
 * 
 * 作用：显示系统整体统计数据，包括用户统计、题目统计、题库统计等，使用图表可视化展示
 * 关联页面：
 *   - pages/Admin.jsx (管理后台首页，使用此组件)
 *   - api/api.js (系统统计API)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - Recharts (图表库：BarChart, PieChart)
 *   - 数据可视化
 *   - 响应式布局
 */

import { useState, useEffect } from 'react';
import api from '../../../api/api';
import { toast } from '../../../utils/toast';
import Skeleton from '../../../components/Skeleton';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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

const COLORS = ['#1d4ed8', '#047857', '#0f766e', '#6366f1', '#0ea5e9', '#ec4899', '#f59e0b'];

export default function SystemStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadStats();
    // 每5分钟自动刷新一次
    const interval = setInterval(() => {
      loadStats();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data?.data || res.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('加载系统统计失败:', err);
      setError(err.message || '加载系统统计失败');
      toast.error('加载系统统计失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card">
        <div className="text-sm text-slate-600">暂无统计数据</div>
      </div>
    );
  }

  // 准备图表数据
  const difficultyData = stats.questions?.byDifficulty
    ? Object.entries(stats.questions.byDifficulty).map(([key, value]) => ({
        name: DIFFICULTY_LABELS[key] || `难度${key}`,
        value,
      }))
    : [];

  const typeData = stats.questions?.byType
    ? Object.entries(stats.questions.byType).map(([key, value]) => ({
        name: TYPE_LABELS[key] || key,
        value,
      }))
    : [];

  const roleData = stats.users?.byRole
    ? Object.entries(stats.users.byRole).map(([key, value]) => ({
        name: key === 'admin' ? '管理员' : key === 'question_manager' ? '出题负责人' : '学生',
        value,
      }))
    : [];

  return (
    <div className="space-y-4">
      {/* 标题和刷新按钮 */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">系统统计</h2>
            {lastUpdate && (
              <p className="text-xs text-slate-500 mt-1">
                最后更新：{lastUpdate.toLocaleTimeString('zh-CN')}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={loadStats}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-600 mb-1">题目总数</div>
          <div className="text-3xl font-bold text-blue-700">
            {stats.questions?.total || stats.questionCount || 0}
          </div>
        </div>
        <div className="card bg-green-50 border-green-200">
          <div className="text-sm text-green-600 mb-1">用户总数</div>
          <div className="text-3xl font-bold text-green-700">
            {stats.users?.total || stats.userCount || 0}
          </div>
        </div>
        <div className="card bg-purple-50 border-purple-200">
          <div className="text-sm text-purple-600 mb-1">7天新增用户</div>
          <div className="text-3xl font-bold text-purple-700">
            {stats.users?.newUsers?.last7Days || 0}
          </div>
        </div>
        <div className="card bg-orange-50 border-orange-200">
          <div className="text-sm text-orange-600 mb-1">7天活跃用户</div>
          <div className="text-3xl font-bold text-orange-700">
            {stats.users?.activeUsers?.last7Days || 0}
          </div>
        </div>
      </div>

      {/* 用户统计 */}
      <div className="card">
        <h3 className="font-semibold mb-4">用户统计</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 用户角色分布 */}
          {roleData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-3">用户角色分布</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 用户增长趋势 */}
          <div>
            <h4 className="text-sm font-medium text-slate-600 mb-3">用户增长</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">今日新增</span>
                <span className="text-lg font-bold text-slate-900">
                  {stats.users?.newUsers?.today || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">近7天新增</span>
                <span className="text-lg font-bold text-slate-900">
                  {stats.users?.newUsers?.last7Days || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">近30天新增</span>
                <span className="text-lg font-bold text-slate-900">
                  {stats.users?.newUsers?.last30Days || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-600">近30天活跃</span>
                <span className="text-lg font-bold text-blue-700">
                  {stats.users?.activeUsers?.last30Days || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 题目统计 */}
      <div className="card">
        <h3 className="font-semibold mb-4">题目统计</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 难度分布 */}
          {difficultyData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-3">难度分布</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={difficultyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 题型分布 */}
          {typeData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-3">题型分布</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
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
        </div>
      </div>
    </div>
  );
}

