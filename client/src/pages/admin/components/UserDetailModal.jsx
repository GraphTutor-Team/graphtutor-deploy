/**
 * GraphTutor V3.0 - 用户详情模态框组件
 * 
 * 作用：显示用户详细信息，包括基本信息、学习统计、活跃度图表和权限详情
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户管理页面，使用此组件)
 *   - components/UserPermissions.jsx (权限详情组件)
 *   - api/users.js (获取用户信息、统计、活跃度、权限)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - Recharts (活跃度图表)
 *   - 模态框组件
 *   - 标签页组件
 */

import { useState, useEffect } from 'react';
import { getUser, getUserStats, getUserActivity, getUserPermissions } from '../../../api/users';
import { toast } from '../../../utils/toast';
import Skeleton from '../../../components/Skeleton';
import UserPermissions from './UserPermissions';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function UserDetailModal({ userId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, statsData, activityData, permissionsData] = await Promise.all([
        getUser(userId),
        getUserStats(userId, 30),
        getUserActivity(userId, 30),
        getUserPermissions(userId).catch(() => null), // 权限获取失败不影响其他数据
      ]);
      setUser(userData);
      setStats(statsData);
      setActivity(activityData);
      setPermissions(permissionsData);
    } catch (err) {
      console.error('加载用户详情失败:', err);
      toast.error(err.message || '加载用户详情失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">用户详情</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {user && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="card">
              <h3 className="font-semibold mb-4">基本信息</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">邮箱：</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div>
                  <span className="text-slate-600">姓名：</span>
                  <span className="font-medium">{user.name || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600">角色：</span>
                  <span className={`font-medium ${
                    user.role === 'admin' 
                      ? 'text-red-700' 
                      : user.role === 'question_manager'
                      ? 'text-blue-700'
                      : 'text-slate-700'
                  }`}>
                    {user.role === 'admin' 
                      ? '管理员' 
                      : user.role === 'question_manager'
                      ? '出题负责人'
                      : '学生'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">创建时间：</span>
                  <span className="font-medium">
                    {new Date(user.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            {/* 学习统计 */}
            {stats && (
              <div className="card">
                <h3 className="font-semibold mb-4">学习统计（最近30天）</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {stats.totalAnswered || 0}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">答题总数</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {stats.accuracy ? `${(stats.accuracy * 100).toFixed(1)}%` : '0%'}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">正确率</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">
                      {stats.studyDuration ? `${Math.round(stats.studyDuration / 60)}分钟` : '0分钟'}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">学习时长</div>
                  </div>
                </div>
              </div>
            )}

            {/* 权限详情 */}
            {permissions && (
              <UserPermissions 
                permissions={permissions.permissions} 
                stats={permissions.stats}
              />
            )}

            {/* 活跃度图表 */}
            {activity.length > 0 && (
              <div className="card">
                <h3 className="font-semibold mb-4">活跃度趋势（最近30天）</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="answered" 
                      stroke="#3b82f6" 
                      name="答题数"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="correct" 
                      stroke="#10b981" 
                      name="正确数"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

