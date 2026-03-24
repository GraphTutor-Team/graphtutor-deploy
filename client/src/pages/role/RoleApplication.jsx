/**
 * 角色申请页面
 * 用户可以申请成为出题负责人或管理员
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleName } from '../../utils/role';
import Loading from '../../components/common/Loading';
import Empty from '../../components/common/Empty';
import api, { getStoredToken } from '../../api/api';

export default function RoleApplication() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 表单数据
  const [requestedRole, setRequestedRole] = useState('question_manager');
  const [reason, setReason] = useState('');
  
  // 申请历史
  const [applications, setApplications] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 检查当前角色
  const currentRole = user?.role || 'student';
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'question_manager';

  // 加载申请历史
  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoadingHistory(true);
    try {
      const res = await api.get('/v3/role-applications');
      const data = res.data;
      if (data.success) {
        setApplications(data.data || []);
      }
    } catch (err) {
      console.error('加载申请历史失败:', err);
      if (err.response?.status === 401) {
        setError('登录已过期，请重新登录');
      }
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!reason.trim() || reason.trim().length < 10) {
      setError('申请理由至少需要 10 个字符');
      return;
    }

    if (reason.trim().length > 1000) {
      setError('申请理由不能超过 1000 个字符');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/v3/role-applications', {
        requestedRole,
        reason: reason.trim(),
      });

      const data = res.data;
      if (data.success) {
        setSuccess('申请已提交，等待管理员审核');
        setReason('');
        await loadApplications();
      } else {
        setError(data.message || '提交申请失败');
      }
    } catch (err) {
      console.error('提交申请失败:', err);
      const errorMessage = err.response?.data?.message || err.message || '网络错误，请稍后重试';
      setError(errorMessage);
      if (err.response?.status === 401) {
        setError('登录已过期，请重新登录');
      }
    } finally {
      setSubmitting(false);
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

  // 如果已经是管理员，显示提示
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">角色申请</h1>
          <div className="card p-6">
            <p className="text-slate-700">您已经是管理员，无需申请其他角色。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">角色申请</h1>
          <button
            onClick={() => nav(-1)}
            className="btn btn-ghost"
          >
            返回
          </button>
        </div>

        {/* 当前角色提示 */}
        <div className="card p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-slate-700">
            当前角色：<span className="font-semibold">{getRoleName(currentRole)}</span>
            {isManager && <span className="ml-2 text-slate-600">（您已经是出题负责人）</span>}
          </p>
        </div>

        {/* 申请表单 */}
        {!isManager && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">提交角色申请</h2>
            
            {error && (
              <div className="alert alert-error mb-4 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="alert alert-success mb-4 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">申请角色</label>
                <select
                  className="input"
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value)}
                  disabled={submitting}
                >
                  <option value="question_manager">出题负责人</option>
                  <option value="admin">管理员</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {requestedRole === 'question_manager' 
                    ? '出题负责人可以创建和管理题目、题库，使用AI功能'
                    : '管理员拥有系统所有权限，包括用户管理、系统设置等'}
                </p>
              </div>

              <div>
                <label className="label">
                  申请理由 <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    （至少 10 个字符，最多 1000 个字符）
                  </span>
                </label>
                <textarea
                  className="input min-h-[120px]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="请详细说明您申请该角色的原因、相关经验或能力..."
                  disabled={submitting}
                  maxLength={1000}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-slate-500">
                    请说明您的申请理由，例如：教学经验、专业背景、使用目的等
                  </p>
                  <p className="text-xs text-slate-500">
                    {reason.length} / 1000
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={submitting || !reason.trim() || reason.trim().length < 10}
              >
                {submitting ? '提交中...' : '提交申请'}
              </button>
            </form>
          </div>
        )}

        {/* 申请历史 */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">申请历史</h2>
          
          {loadingHistory ? (
            <Loading />
          ) : applications.length === 0 ? (
            <Empty message="暂无申请记录" />
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app._id}
                  className="border border-slate-200 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">
                        {getRoleName(app.requestedRole)}
                      </span>
                      {getStatusBadge(app.status)}
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(app.createdAt)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-slate-700">
                    <p className="font-medium mb-1">申请理由：</p>
                    <p className="text-slate-600 whitespace-pre-wrap">{app.reason}</p>
                  </div>

                  {app.status !== 'pending' && (
                    <div className="text-sm text-slate-700 pt-2 border-t border-slate-200">
                      <p className="font-medium mb-1">
                        {app.status === 'approved' ? '批准' : '拒绝'}时间：
                        <span className="font-normal ml-2">{formatDate(app.reviewedAt)}</span>
                      </p>
                      {app.reviewComment && (
                        <p className="text-slate-600">
                          <span className="font-medium">审核意见：</span>
                          {app.reviewComment}
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

