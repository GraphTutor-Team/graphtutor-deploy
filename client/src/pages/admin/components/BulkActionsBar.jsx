/**
 * GraphTutor V3.0 - 批量操作栏组件
 * 
 * 作用：显示已选择用户数量，提供批量修改角色和批量删除功能
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户管理页面，使用此组件)
 *   - hooks/useUserManagement.js (批量操作业务逻辑)
 * 技术栈：
 *   - React Hooks (useState)
 *   - 确认对话框 (confirm)
 *   - 下拉菜单组件
 */

import { useState } from 'react';
import { toast } from '../../../utils/toast';

export default function BulkActionsBar({
  count,
  onBatchUpdateRole,
  onBatchDelete,
  onClearSelection,
}) {
  const [updating, setUpdating] = useState(false);

  const handleRoleUpdate = async (role) => {
    setUpdating(true);
    try {
      await onBatchUpdateRole(role);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="card bg-blue-50 border-blue-200">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm font-medium text-blue-900">
          已选择 <span className="font-bold">{count}</span> 个用户
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-600">批量操作：</span>
          
          <select
            className="border rounded-lg px-3 py-1.5 text-sm"
            disabled={updating}
            onChange={(e) => {
              if (e.target.value) {
                handleRoleUpdate(e.target.value);
                e.target.value = '';
              }
            }}
          >
            <option value="">批量修改角色</option>
            <option value="student">设为学生</option>
            <option value="question_manager">设为出题负责人</option>
            <option value="admin">设为管理员</option>
          </select>
          
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={updating}
            onClick={onBatchDelete}
          >
            批量删除
          </button>
          
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={onClearSelection}
          >
            取消选择
          </button>
        </div>
      </div>
    </div>
  );
}

