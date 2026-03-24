/**
 * GraphTutor V3.0 - 用户表格组件
 * 
 * 作用：显示用户列表，支持排序、多选、快速修改角色、查看详情等功能
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户管理页面，使用此组件)
 *   - components/UserDetailModal.jsx (用户详情模态框)
 *   - api/users.js (用户API，更新角色)
 * 技术栈：
 *   - React Hooks (useState)
 *   - 表格排序功能
 *   - 多选功能
 *   - 下拉菜单组件
 */

import { useState } from 'react';
import { updateUserRole } from '../../../api/users';
import { toast } from '../../../utils/toast';

export default function UserTable({
  users,
  currentUserId,
  selectedIds,
  sort,
  order,
  onSelect,
  onSelectAll,
  onSort,
  onViewDetail,
  onRefresh,
}) {
  const [updatingId, setUpdatingId] = useState('');

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await updateUserRole(userId, newRole);
      toast.success('角色更新成功');
      onRefresh();
    } catch (err) {
      console.error('更新角色失败:', err);
      toast.error(err.message || '更新角色失败');
    } finally {
      setUpdatingId('');
    }
  };

  const isSelf = (user) => {
    const uid = user._id || user.id;
    return uid === currentUserId;
  };

  const formatTime = (t) => {
    if (!t) return '—';
    try {
      return new Date(t).toLocaleString('zh-CN');
    } catch {
      return String(t);
    }
  };

  const SortIcon = ({ field }) => {
    if (sort !== field) return null;
    return order === 'asc' ? '↑' : '↓';
  };

  const allSelected = users.length > 0 && users.every(u => selectedIds.includes(u._id || u.id));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-white border-b-2 border-slate-300">
          <tr>
            <th className="px-3 py-2 whitespace-nowrap">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="cursor-pointer"
              />
            </th>
            <th 
              className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50"
              onClick={() => onSort('email')}
            >
              邮箱 <SortIcon field="email" />
            </th>
            <th 
              className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50"
              onClick={() => onSort('name')}
            >
              姓名 <SortIcon field="name" />
            </th>
            <th 
              className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50"
              onClick={() => onSort('role')}
            >
              角色 <SortIcon field="role" />
            </th>
            <th 
              className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50"
              onClick={() => onSort('createdAt')}
            >
              创建时间 <SortIcon field="createdAt" />
            </th>
            <th className="px-3 py-2 whitespace-nowrap text-sm font-bold text-slate-900">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const uid = user._id || user.id;
            const self = isSelf(user);
            const selected = selectedIds.includes(uid);
            
            return (
              <tr
                key={uid}
                className={`border-t border-slate-100 ${
                  self ? 'bg-amber-50/60' : selected ? 'bg-blue-50/60' : 'hover:bg-slate-50/60'
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onSelect(uid)}
                    className="cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {user.email}
                  {self && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                      当前账号
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {user.name || '—'}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border ${
                        user.role === 'admin'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : user.role === 'question_manager'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {user.role === 'admin' 
                        ? '管理员' 
                        : user.role === 'question_manager'
                        ? '出题负责人'
                        : '学生'}
                    </span>
                    {user.role === 'admin' && (
                      <span className="text-[10px] text-slate-400" title="拥有所有权限">
                        ⭐
                      </span>
                    )}
                    {user.role === 'question_manager' && (
                      <span className="text-[10px] text-slate-400" title="可以管理题库和题目">
                        📝
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                  {formatTime(user.createdAt)}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={user.role || 'student'}
                      disabled={updatingId === uid}
                      onChange={(e) => handleRoleChange(uid, e.target.value)}
                    >
                      <option value="student">学生</option>
                      <option value="question_manager">出题负责人</option>
                      <option value="admin">管理员</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onViewDetail(uid)}
                    >
                      详情
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

