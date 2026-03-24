/**
 * GraphTutor V3.0 - 用户搜索和筛选栏组件
 * 
 * 作用：提供用户搜索、角色筛选、批量导入和导出功能
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户管理页面，使用此组件)
 *   - components/UserImportModal.jsx (用户导入模态框)
 *   - components/ExportConfigModal.jsx (导出配置模态框)
 * 技术栈：
 *   - React Hooks (useState)
 *   - Tailwind CSS (样式)
 *   - 下拉菜单组件
 */

import { useState } from 'react';

export default function UserSearchBar({ 
  search, 
  roleFilter, 
  onSearch, 
  onFilter,
  onExport,
  onImport,
  userCount = 0,
  totalCount = 0,
}) {
  const [exporting, setExporting] = useState(false);

  return (
    <div className="card">
      <div className="flex flex-wrap items-end gap-4">
        {/* 搜索框 */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-600 mb-1">搜索</label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="按邮箱、姓名搜索..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* 角色筛选 */}
        <div className="min-w-[150px]">
          <label className="block text-xs text-slate-600 mb-1">角色</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={roleFilter}
            onChange={(e) => onFilter(e.target.value)}
          >
            <option value="">全部</option>
            <option value="student">学生</option>
            <option value="question_manager">出题负责人</option>
            <option value="admin">管理员</option>
          </select>
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 whitespace-nowrap">
            当前: {userCount} / 总计: {totalCount}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onImport}
          >
            批量导入
          </button>
          <div className="flex items-center gap-1 border-l pl-2">
            <span className="text-xs text-slate-600 mr-1">导出:</span>
            <select
              className="border rounded px-2 py-1 text-xs"
              disabled={exporting || userCount === 0}
              onChange={(e) => {
                if (e.target.value) {
                  const [type, format] = e.target.value.split('-');
                  handleExport(type, format);
                  e.target.value = '';
                }
              }}
            >
              <option value="">导出当前页</option>
              <option value="current-csv">当前页 → CSV</option>
              <option value="current-excel">当前页 → Excel</option>
            </select>
            <select
              className="border rounded px-2 py-1 text-xs"
              disabled={exporting}
              onChange={(e) => {
                if (e.target.value) {
                  const [type, format] = e.target.value.split('-');
                  handleExport(type, format);
                  e.target.value = '';
                }
              }}
            >
              <option value="">导出全部</option>
              <option value="all-csv">全部 → CSV</option>
              <option value="all-excel">全部 → Excel</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

