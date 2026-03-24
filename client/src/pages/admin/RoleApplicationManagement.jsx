/**
 * GraphTutor V3.0 - 角色申请管理页面
 * 
 * 作用：管理员可以查看、批准或拒绝用户的角色申请（如申请成为出题负责人）
 * 关联页面：
 *   - pages/Admin.jsx (管理后台首页，链接到此页面)
 *   - api/api.js (角色申请管理API)
 *   - utils/role.js (角色工具函数)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - 列表展示
 *   - 操作按钮（批准/拒绝）
 *   - 状态筛选
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRoleName } from '../../utils/role';
import Loading from '../../components/common/Loading';
import Empty from '../../components/common/Empty';
import api from '../../api/api';
import { toast } from '../../utils/toast';

export default function RoleApplicationManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState({ status: '', requestedRole: '' });
  const [processingId, setProcessingId] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    loadApplications();
    loadStats();
  }, [filter]);

  async function loadApplications() {
    setLoading(true);
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.requestedRole) params.requestedRole = filter.requestedRole;
      params.limit = 50;

      const res = await api.get('/v3/role-applications', { params });
      const data = res.data;
      if (data.success) {
        setApplications(data.data || []);
      }
    } catch (err) {
      console.error('加载申请列表失败:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const res = await api.get('/v3/role-applications/stats/overview');
      const data = res.data;
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  }

  async function handleApprove(id) {
    if (!confirm('确定批准该申请吗？批准后用户角色将立即更新。')) {
      return;
    }

    setProcessingId(id);
    try {
      const res = await api.post(`/v3/role-applications/${id}/approve`, {
        comment: reviewComment.trim(),
      });

      const data = res.data;
      if (data.success) {
        toast.success('申请已批准');
        setReviewComment('');
        await loadApplications();
        await loadStats();
      } else {
        toast.error(data.message || '批准失败');
      }
    } catch (err) {
      console.error('批准申请失败:', err);
      const errorMessage = err.response?.data?.message || '网络错误，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id) {
    if (!reviewComment.trim()) {
      toast.error('请填写拒绝理由');
      return;
    }

    if (!confirm('确定拒绝该申请吗？')) {
      return;
    }

    setProcessingId(id);
    try {
      const res = await api.post(`/v3/role-applications/${id}/reject`, {
        comment: reviewComment.trim(),
      });

      const data = res.data;
      if (data.success) {
        toast.success('申请已拒绝');
        setReviewComment('');
        await loadApplications();
        await loadStats();
      } else {
        toast.error(data.message || '拒绝失败');
      }
    } catch (err) {
      console.error('拒绝申请失败:', err);
      const errorMessage = err.response?.data?.message || '网络错误，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setProcessingId(null);
    }
  }

  function getStatusBadge(status) {
    const statusMap = {
      pending: { text: '待审核', class: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      approved: { text: '已批准', class: 'bg-green-100 text-green-800 border-green-300' },
      rejected: { text: '已拒绝', class: 'bg-red-100 text-red-800 border-red-300' },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  }

  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">角色申请管理</h1>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="text-sm text-slate-600">待审核</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-600">已批准</div>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-600">已拒绝</div>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-600">总计</div>
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="label text-xs">状态</label>
              <select
                className="input text-sm"
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              >
                <option value="">全部</option>
                <option value="pending">待审核</option>
                <option value="approved">已批准</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">申请角色</label>
              <select
                className="input text-sm"
                value={filter.requestedRole}
                onChange={(e) => setFilter({ ...filter, requestedRole: e.target.value })}
              >
                <option value="">全部</option>
                <option value="question_manager">出题负责人</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          </div>
        </div>

        {/* 申请列表 */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">
            申请列表 {pendingApplications.length > 0 && `(${pendingApplications.length} 待审核)`}
          </h2>

          {loading ? (
            <Loading />
          ) : applications.length === 0 ? (
            <Empty message="暂无申请记录" />
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app._id}
                  className="border border-slate-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {app.userId?.name || app.userId?.email || '未知用户'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {app.userId?.email}
                        </div>
                      </div>
                      <span className="text-slate-400">→</span>
                      <span className="font-semibold text-blue-600">
                        {getRoleName(app.requestedRole)}
                      </span>
                      {getStatusBadge(app.status)}
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(app.createdAt)}
                    </span>
                  </div>

                  <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded">
                    <p className="font-medium mb-1">申请理由：</p>
                    <p className="text-slate-600 whitespace-pre-wrap">{app.reason}</p>
                  </div>

                  {app.status === 'pending' && (
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <div>
                        <label className="label text-xs">审核意见（可选）</label>
                        <textarea
                          className="input text-sm min-h-[80px]"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="填写审核意见..."
                          maxLength={500}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(app._id)}
                          disabled={processingId === app._id}
                          className="btn btn-success btn-sm"
                        >
                          {processingId === app._id ? '处理中...' : '批准'}
                        </button>
                        <button
                          onClick={() => handleReject(app._id)}
                          disabled={processingId === app._id}
                          className="btn btn-error btn-sm"
                        >
                          {processingId === app._id ? '处理中...' : '拒绝'}
                        </button>
                      </div>
                    </div>
                  )}

                  {app.status !== 'pending' && (
                    <div className="pt-3 border-t border-slate-200 text-sm text-slate-600">
                      <p>
                        {app.status === 'approved' ? '批准' : '拒绝'}时间：
                        <span className="ml-2">{formatDate(app.reviewedAt)}</span>
                      </p>
                      {app.reviewComment && (
                        <p className="mt-1">
                          审核意见：<span className="text-slate-700">{app.reviewComment}</span>
                        </p>
                      )}
                      {app.reviewerId && (
                        <p className="mt-1 text-xs">
                          审核人：{app.reviewerId?.name || app.reviewerId?.email}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

