/**
 * GraphTutor V3.0 - 用户管理业务逻辑Hook
 * 
 * 作用：封装用户管理页面的所有业务逻辑和状态管理
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (使用此hook)
 * 技术栈：
 *   - React Hooks (useState, useEffect, useCallback)
 *   - useDebounce (防抖)
 *   - API调用 (getUsers, batchUpdateUserRole, batchDeleteUsers)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUsers, batchUpdateUserRole, batchDeleteUsers } from '../api/users';
import { toast } from '../utils/toast';
import { exportToCSV } from '../utils/export';
import { exportToExcel } from '../utils/excelExport';
import { useDebounce } from './useDebounce';

/**
 * 用户管理业务逻辑Hook
 * @returns {Object} 用户管理相关的状态和方法
 */
export function useUserManagement() {
  const { user: currentUser } = useAuth();
  
  // 数据状态
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 分页状态
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  
  // 搜索和筛选状态
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [roleFilter, setRoleFilter] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState({
    createdAtFrom: '',
    createdAtTo: '',
    lastLoginFrom: '',
    lastLoginTo: '',
    activeDays: undefined,
  });
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  
  // 选择状态
  const [selectedIds, setSelectedIds] = useState([]);
  
  // 模态框状态
  const [detailUserId, setDetailUserId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('current');

  // 加载用户列表
  const loadUsers = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data, meta } = await getUsers({
        search: debouncedSearch,
        role: roleFilter || undefined,
        createdAtFrom: advancedFilters.createdAtFrom || undefined,
        createdAtTo: advancedFilters.createdAtTo || undefined,
        lastLoginFrom: advancedFilters.lastLoginFrom || undefined,
        lastLoginTo: advancedFilters.lastLoginTo || undefined,
        activeDays: advancedFilters.activeDays || undefined,
        sort,
        order,
        page,
        limit,
      });
      setUsers(data);
      setTotal(meta.total);
    } catch (err) {
      console.error('加载用户列表失败:', err);
      setError(err.message || '加载用户列表失败');
      toast.error(err.message || '加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentUser, debouncedSearch, roleFilter, advancedFilters, sort, order, page, limit]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 处理搜索
  const handleSearch = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  // 处理筛选
  const handleFilter = useCallback((role) => {
    setRoleFilter(role);
    setPage(1);
  }, []);

  // 处理高级筛选
  const handleAdvancedFiltersChange = useCallback((newFilters) => {
    setAdvancedFilters(newFilters);
    setPage(1);
  }, []);

  // 清除高级筛选
  const handleResetAdvancedFilters = useCallback(() => {
    setAdvancedFilters({
      createdAtFrom: '',
      createdAtTo: '',
      lastLoginFrom: '',
      lastLoginTo: '',
      activeDays: undefined,
    });
    setPage(1);
  }, []);

  // 处理排序
  const handleSort = useCallback((field) => {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('desc');
    }
    setPage(1);
  }, [sort, order]);

  // 处理选择
  const handleSelect = useCallback((id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback((checked) => {
    setSelectedIds(checked ? users.map(u => u._id || u.id) : []);
  }, [users]);

  // 批量修改角色
  const handleBatchUpdateRole = useCallback(async (role) => {
    if (selectedIds.length === 0) {
      toast.error('请先选择用户');
      return;
    }
    
    try {
      await batchUpdateUserRole(selectedIds, role);
      toast.success(`成功更新 ${selectedIds.length} 个用户的角色`);
      setSelectedIds([]);
      loadUsers();
    } catch (err) {
      console.error('批量更新角色失败:', err);
      toast.error(err.message || '批量更新角色失败');
    }
  }, [selectedIds, loadUsers]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) {
      toast.error('请先选择用户');
      return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个用户吗？此操作不可恢复。`)) {
      return;
    }
    
    try {
      await batchDeleteUsers(selectedIds);
      toast.success(`成功删除 ${selectedIds.length} 个用户`);
      setSelectedIds([]);
      loadUsers();
    } catch (err) {
      console.error('批量删除失败:', err);
      toast.error(err.message || '批量删除失败');
    }
  }, [selectedIds, loadUsers]);

  // 打开用户详情
  const handleViewDetail = useCallback((userId) => {
    setDetailUserId(userId);
    setShowDetailModal(true);
  }, []);

  // 字段映射工具函数
  const getFieldValue = useCallback((user, fieldKey) => {
    switch (fieldKey) {
      case 'email':
        return user.email || '';
      case 'name':
        return user.name || '';
      case 'role':
        return user.role === 'admin' ? '管理员' : 
               user.role === 'question_manager' ? '出题负责人' : '学生';
      case 'createdAt':
        return user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : '';
      case 'lastLogin':
        return user.lastLogin ? new Date(user.lastLogin).toLocaleString('zh-CN') : '';
      case 'school':
        return user.school || '';
      case 'major':
        return user.major || '';
      case 'grade':
        return user.grade || '';
      case 'studentId':
        return user.studentId || '';
      case 'bio':
        return user.bio || '';
      default:
        return '';
    }
  }, []);

  const getFieldLabel = useCallback((fieldKey) => {
    const labels = {
      email: '邮箱',
      name: '姓名',
      role: '角色',
      createdAt: '注册时间',
      lastLogin: '最后登录',
      school: '学校',
      major: '专业',
      grade: '年级',
      studentId: '学号',
      bio: '个人简介',
    };
    return labels[fieldKey] || fieldKey;
  }, []);

  // 获取所有用户（用于导出全部）
  const getAllUsers = useCallback(async () => {
    const { data: allUsers } = await getUsers({
      search: debouncedSearch,
      role: roleFilter || undefined,
      createdAtFrom: advancedFilters.createdAtFrom || undefined,
      createdAtTo: advancedFilters.createdAtTo || undefined,
      lastLoginFrom: advancedFilters.lastLoginFrom || undefined,
      lastLoginTo: advancedFilters.lastLoginTo || undefined,
      activeDays: advancedFilters.activeDays || undefined,
      sort,
      order,
      page: 1,
      limit: 10000,
    });
    return allUsers;
  }, [debouncedSearch, roleFilter, advancedFilters, sort, order]);

  // 导出用户数据为PDF
  const exportUsersToPDF = useCallback(async (userList, fields, headers) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #3b82f6; color: white; padding: 10px; text-align: left; }
          td { border: 1px solid #ddd; padding: 8px; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>用户列表</h1>
        <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
        <p>总计: ${userList.length} 个用户</p>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${userList.map(user => `
              <tr>
                ${fields.map(f => `<td>${getFieldValue(user, f)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">GraphTutor V3.0 - 用户管理</div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }, [getFieldValue]);

  // 导出用户数据（支持自定义字段和格式）
  const handleExportWithConfig = useCallback(async (config) => {
    const { fields, format } = config;
    
    let userList;
    if (exportType === 'current') {
      userList = users;
    } else {
      setLoading(true);
      try {
        userList = await getAllUsers();
      } finally {
        setLoading(false);
      }
    }

    if (userList.length === 0) {
      toast.error('没有可导出的用户');
      return;
    }

    try {
      const headers = fields.map(f => getFieldLabel(f));
      const exportData = userList.map(user => {
        const row = {};
        fields.forEach(field => {
          row[getFieldLabel(field)] = getFieldValue(user, field);
        });
        return row;
      });

      if (format === 'csv') {
        exportToCSV(exportData, `users-${Date.now()}.csv`, headers);
        toast.success(`已导出 ${userList.length} 个用户（CSV格式）`);
      } else if (format === 'excel') {
        const excelData = [
          headers,
          ...exportData.map(row => fields.map(f => row[getFieldLabel(f)])),
        ];
        exportToExcel(excelData, '用户列表', '用户列表', {
          columnWidths: fields.map(() => 15),
        });
        toast.success(`已导出 ${userList.length} 个用户（Excel格式）`);
      } else if (format === 'json') {
        const { exportToJSON } = await import('../utils/export');
        exportToJSON(exportData, `users-${Date.now()}.json`);
        toast.success(`已导出 ${userList.length} 个用户（JSON格式）`);
      } else if (format === 'pdf') {
        await exportUsersToPDF(userList, fields, headers);
        toast.success(`已导出 ${userList.length} 个用户（PDF格式）`);
      }
    } catch (err) {
      console.error('导出失败:', err);
      toast.error('导出失败: ' + err.message);
    }
  }, [exportType, users, getAllUsers, getFieldLabel, getFieldValue, exportUsersToPDF]);

  // 导出当前列表
  const handleExportCurrent = useCallback((format = 'csv') => {
    setExportType('current');
    setShowExportModal(true);
  }, []);

  // 导出所有用户
  const handleExportAll = useCallback(async (format = 'csv') => {
    try {
      setLoading(true);
      const { data: allUsers } = await getUsers({
        search,
        role: roleFilter || undefined,
        sort,
        order,
        page: 1,
        limit: 10000,
      });

      if (allUsers.length === 0) {
        toast.error('没有可导出的用户');
        return;
      }

      const exportData = allUsers.map(user => ({
        '用户ID': user._id || user.id,
        '邮箱': user.email || '',
        '姓名': user.name || '',
        '角色': user.role === 'admin' ? '管理员' : 
               user.role === 'question_manager' ? '出题负责人' : '学生',
        '创建时间': user.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : '',
        '最后登录': user.lastLogin ? new Date(user.lastLogin).toLocaleString('zh-CN') : '',
      }));

      if (format === 'csv') {
        exportToCSV(exportData, `all-users-${Date.now()}.csv`);
        toast.success(`已导出 ${allUsers.length} 个用户（CSV格式）`);
      } else if (format === 'excel') {
        const excelData = [
          ['用户ID', '邮箱', '姓名', '角色', '创建时间', '最后登录'],
          ...exportData.map(u => [
            u['用户ID'],
            u['邮箱'],
            u['姓名'],
            u['角色'],
            u['创建时间'],
            u['最后登录'],
          ]),
        ];
        exportToExcel(excelData, '所有用户', '所有用户', {
          columnWidths: [20, 30, 15, 12, 20, 20],
        });
        toast.success(`已导出 ${allUsers.length} 个用户（Excel格式）`);
      }
    } catch (err) {
      console.error('导出失败:', err);
      toast.error('导出失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, sort, order]);

  return {
    // 状态
    users,
    loading,
    error,
    page,
    limit,
    total,
    search,
    roleFilter,
    advancedFilters,
    sort,
    order,
    selectedIds,
    detailUserId,
    showDetailModal,
    showImportModal,
    showExportModal,
    exportType,
    currentUser,
    
    // 方法
    setPage,
    setSearch,
    setRoleFilter,
    setAdvancedFilters,
    setSelectedIds,
    setShowDetailModal,
    setShowImportModal,
    setShowExportModal,
    setExportType,
    setDetailUserId,
    handleSearch,
    handleFilter,
    handleAdvancedFiltersChange,
    handleResetAdvancedFilters,
    handleSort,
    handleSelect,
    handleSelectAll,
    handleBatchUpdateRole,
    handleBatchDelete,
    handleViewDetail,
    handleExportWithConfig,
    handleExportCurrent,
    handleExportAll,
    loadUsers,
    getFieldValue,
    getFieldLabel,
  };
}

