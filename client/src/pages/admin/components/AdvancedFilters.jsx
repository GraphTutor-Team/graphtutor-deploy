/**
 * GraphTutor V3.0 - 高级筛选组件
 * 
 * 作用：提供高级筛选功能，包括注册日期范围、最后登录日期范围、活跃天数等筛选条件
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户管理页面，使用此组件)
 *   - hooks/useUserManagement.js (筛选状态管理)
 * 技术栈：
 *   - React Hooks (useState)
 *   - 日期选择器 (input type="date")
 *   - 折叠/展开功能
 *   - 快速筛选按钮
 */

import { useState } from 'react';

export default function AdvancedFilters({ filters, onChange, onReset }) {
  const [expanded, setExpanded] = useState(false);

  const handleDateChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  const handleActiveDaysChange = (value) => {
    onChange({
      ...filters,
      activeDays: value ? parseInt(value, 10) : undefined,
    });
  };

  const hasActiveFilters = 
    filters.createdAtFrom || 
    filters.createdAtTo || 
    filters.lastLoginFrom || 
    filters.lastLoginTo || 
    filters.activeDays;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">高级筛选</h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              已启用
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={onReset}
            >
              清除筛选
            </button>
          )}
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 pt-3 border-t">
          {/* 注册时间范围 */}
          <div>
            <label className="block text-xs text-slate-600 mb-2">注册时间范围</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="date"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  value={filters.createdAtFrom || ''}
                  onChange={(e) => handleDateChange('createdAtFrom', e.target.value)}
                />
                <span className="text-xs text-slate-500 mt-1 block">起始日期</span>
              </div>
              <div>
                <input
                  type="date"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  value={filters.createdAtTo || ''}
                  onChange={(e) => handleDateChange('createdAtTo', e.target.value)}
                  min={filters.createdAtFrom || undefined}
                />
                <span className="text-xs text-slate-500 mt-1 block">结束日期</span>
              </div>
            </div>
          </div>

          {/* 最后登录时间范围 */}
          <div>
            <label className="block text-xs text-slate-600 mb-2">最后登录时间范围</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="date"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  value={filters.lastLoginFrom || ''}
                  onChange={(e) => handleDateChange('lastLoginFrom', e.target.value)}
                />
                <span className="text-xs text-slate-500 mt-1 block">起始日期</span>
              </div>
              <div>
                <input
                  type="date"
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  value={filters.lastLoginTo || ''}
                  onChange={(e) => handleDateChange('lastLoginTo', e.target.value)}
                  min={filters.lastLoginFrom || undefined}
                />
                <span className="text-xs text-slate-500 mt-1 block">结束日期</span>
              </div>
            </div>
          </div>

          {/* 活跃度筛选 */}
          <div>
            <label className="block text-xs text-slate-600 mb-2">活跃度筛选</label>
            <div className="flex items-center gap-2">
              <select
                className="border rounded-lg px-2 py-1.5 text-sm flex-1"
                value={filters.activeDays || ''}
                onChange={(e) => handleActiveDaysChange(e.target.value)}
              >
                <option value="">全部用户</option>
                <option value="1">最近1天内有登录</option>
                <option value="7">最近7天内有登录</option>
                <option value="30">最近30天内有登录</option>
                <option value="90">最近90天内有登录</option>
                <option value="180">最近180天内有登录</option>
              </select>
              {filters.activeDays && (
                <span className="text-xs text-slate-500">
                  最近 {filters.activeDays} 天活跃
                </span>
              )}
            </div>
          </div>

          {/* 快速筛选按钮 */}
          <div>
            <label className="block text-xs text-slate-600 mb-2">快速筛选</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => {
                  const today = new Date();
                  const last7Days = new Date(today);
                  last7Days.setDate(today.getDate() - 7);
                  onChange({
                    ...filters,
                    lastLoginFrom: last7Days.toISOString().split('T')[0],
                    lastLoginTo: today.toISOString().split('T')[0],
                  });
                }}
              >
                最近7天活跃
              </button>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => {
                  const today = new Date();
                  const last30Days = new Date(today);
                  last30Days.setDate(today.getDate() - 30);
                  onChange({
                    ...filters,
                    lastLoginFrom: last30Days.toISOString().split('T')[0],
                    lastLoginTo: today.toISOString().split('T')[0],
                  });
                }}
              >
                最近30天活跃
              </button>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => {
                  const today = new Date();
                  const last7Days = new Date(today);
                  last7Days.setDate(today.getDate() - 7);
                  onChange({
                    ...filters,
                    createdAtFrom: last7Days.toISOString().split('T')[0],
                    createdAtTo: today.toISOString().split('T')[0],
                  });
                }}
              >
                最近7天注册
              </button>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => {
                  const today = new Date();
                  const last30Days = new Date(today);
                  last30Days.setDate(today.getDate() - 30);
                  onChange({
                    ...filters,
                    createdAtFrom: last30Days.toISOString().split('T')[0],
                    createdAtTo: today.toISOString().split('T')[0],
                  });
                }}
              >
                最近30天注册
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

