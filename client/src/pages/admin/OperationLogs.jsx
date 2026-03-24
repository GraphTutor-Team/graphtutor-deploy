/**
 * GraphTutor V3.0 - 用户操作日志页面
 * 
 * 作用：查看和管理系统中所有用户操作日志，包括角色修改、用户删除、批量操作等
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户管理页面，触发操作日志)
 *   - api/users.js (操作日志API)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - useDebounce (防抖搜索)
 *   - 分页加载
 *   - 日期筛选
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import BackBar from '../../components/BackBar';
import { getUserOperationLogs, getOperationLogStats } from '../../api/users';
import { toast } from '../../utils/toast';
import Skeleton from '../../components/Skeleton';
import Empty from '../../components/Empty';
import { useDebounce } from '../../hooks/useDebounce';

const ACTION_NAMES = {
  role_update: '修改角色',
  role_batch_update: '批量修改角色',
  user_delete: '删除用户',
  user_batch_delete: '批量删除用户',
  user_import: '导入用户',
  user_view: '查看用户详情',
  user_export: '导出用户',
  user_create: '创建用户',
};

const RESULT_COLORS = {
  success: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  partial: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const RESULT_NAMES = {
  success: '成功',
  failed: '失败',
  partial: '部分成功',
};

export default function OperationLogs() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // 筛选条件
  const [operatorId, setOperatorId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const debouncedOperatorId = useDebounce(operatorId, 500);
  const debouncedTargetUserId = useDebounce(targetUserId, 500);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    loadLogs();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, page, debouncedOperatorId, debouncedTargetUserId, action, result, startDate, endDate]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, meta } = await getUserOperationLogs({
        operatorId: debouncedOperatorId || undefined,
        targetUserId: debouncedTargetUserId || undefined,
        action: action || undefined,
        result: result || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      });
      setLogs(data);
      setTotal(meta.total);
    } catch (err) {
      console.error('加载操作日志失败:', err);
      toast.error(err.message || '加载操作日志失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getOperationLogStats({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setStats(statsData);
    } catch (err) {
      console.error('加载操作统计失败:', err);
    }
  };

  const formatTime = (time) => {
    if (!time) return '—';
    try {
      return new Date(time).toLocaleString('zh-CN');
    } catch {
      return String(time);
    }
  };

  const handleReset = () => {
    setOperatorId('');
    setTargetUserId('');
    setAction('');
    setResult('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <BackBar title="用户操作日志" />

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="text-2xl font-bold text-blue-700">{stats.total || 0}</div>
            <div className="text-sm text-slate-600 mt-1">总操作数</div>
          </div>
          {stats.byAction && stats.byAction.slice(0, 3).map((item, index) => (
            <div key={index} className="card">
              <div className="text-2xl font-bold text-slate-700">{item.count || 0}</div>
              <div className="text-sm text-slate-600 mt-1">{ACTION_NAMES[item._id] || item._id}</div>
              <div className="text-xs text-slate-500 mt-1">
                成功: {item.success || 0} | 失败: {item.failed || 0}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 筛选栏 */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1">操作人ID</label>
            <input
              type="text"
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
              placeholder="操作人ID"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">目标用户ID</label>
            <input
              type="text"
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
              placeholder="目标用户ID"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">操作类型</label>
            <select
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="">全部</option>
              {Object.entries(ACTION_NAMES).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">操作结果</label>
            <select
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            >
              <option value="">全部</option>
              {Object.entries(RESULT_NAMES).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">开始日期</label>
            <input
              type="date"
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">结束日期</label>
            <input
              type="date"
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleReset}
          >
            清除筛选
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="card">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <Empty message="暂无操作日志" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">时间</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">操作人</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">操作类型</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">目标用户</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">操作详情</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">结果</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {formatTime(log.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div>
                          <div className="font-medium">{log.operatorInfo?.name || log.operatorInfo?.email || '—'}</div>
                          <div className="text-slate-500 text-[10px]">{log.operatorInfo?.role || '—'}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {ACTION_NAMES[log.action] || log.action}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {log.targetUserInfo ? (
                          <div>
                            <div className="font-medium">{log.targetUserInfo.name || log.targetUserInfo.email || '—'}</div>
                            <div className="text-slate-500 text-[10px]">
                              {log.targetUserInfo.role || '—'}
                              {log.targetUserIds && log.targetUserIds.length > 0 && (
                                <span className="ml-1">(批量: {log.targetUserIds.length})</span>
                              )}
                            </div>
                          </div>
                        ) : log.targetUserIds && log.targetUserIds.length > 0 ? (
                          <span className="text-slate-500">批量操作 ({log.targetUserIds.length}个用户)</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <div className="max-w-xs">
                            {Object.entries(log.details).map(([key, value]) => (
                              <div key={key} className="text-[10px]">
                                <span className="text-slate-500">{key}:</span>{' '}
                                <span className="text-slate-700">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                        {log.error && (
                          <div className="text-red-600 text-[10px] mt-1">错误: {log.error}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border ${RESULT_COLORS[log.result] || RESULT_COLORS.success}`}>
                          {RESULT_NAMES[log.result] || log.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {total > limit && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-slate-600">
                  共 {total} 条记录，第 {page} / {Math.ceil(total / limit)} 页
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    disabled={page >= Math.ceil(total / limit)}
                    onClick={() => setPage(page + 1)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

