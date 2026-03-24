/**
 * GraphTutor V3.0 - 题库列表页面
 * 
 * 功能：显示题库列表，支持筛选、搜索、分页
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getBanks, deleteBank } from '../../api/v3/questionBanks';
import { getSubjectTree } from '../../api/v3/subjects';
import SubjectSelector from '../../components/common/SubjectSelector';
import { exportBanks, exportToJSON } from '../../utils/export';
import { toast } from '../../utils/toast';

export default function BankList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 筛选条件
  const [filters, setFilters] = useState({
    subjectCode: '',
    search: '',
    isPublic: undefined,
    page: 1,
    limit: 20,
  });

  // 视图模式：list 或 grid
  const [viewMode, setViewMode] = useState('list');
  
  // 分页信息
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // 学科列表（用于筛选）
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    loadBanks();
  }, [filters]);

  const loadSubjects = async () => {
    try {
      const tree = await getSubjectTree();
      setSubjects(tree);
    } catch (error) {
      console.error('加载学科列表失败:', error);
    }
  };

  const loadBanks = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 根据用户角色设置筛选条件
      const queryFilters = { ...filters };
      
      // 权限控制：非管理员只能看到自己的题库或公开题库
      if (user?.role !== 'admin') {
        // 出题负责人和学习者只能看到：
        // 1. 自己创建的题库
        // 2. 公开的题库
        // 这里后端应该处理，但前端也可以传递 userId 参数
        if (user?._id || user?.id) {
          queryFilters.ownerId = user._id || user.id;
        }
      }
      
      const result = await getBanks(queryFilters);
      setBanks(result.data);
      setMeta(result.meta);
    } catch (err) {
      console.error('加载题库列表失败:', err);
      setError(err.message || '加载题库列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`确定要删除题库"${name}"吗？此操作不可恢复。`)) {
      return;
    }

    try {
      await deleteBank(id);
      // 重新加载列表
      loadBanks();
    } catch (err) {
      alert(err.message || '删除失败');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // 重置到第一页
    }));
  };

  // 权限判断：管理员可以管理所有，其他用户只能管理自己的
  const canManageAll = user?.role === 'admin';
  const canManageOwn = user?.role === 'admin' || user?.role === 'question_manager' || user?.role === 'student';
  
  // 判断是否可以管理某个题库
  const canManageBank = (bank) => {
    if (canManageAll) return true;
    if (!canManageOwn) return false;
    const isOwner = bank.ownerId?._id === user?._id || bank.ownerId === user?._id;
    return isOwner;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">题库管理</h1>
        <p className="text-slate-600">管理和查看所有题库</p>
      </div>

      {/* 操作栏 */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-4">
          {/* 搜索框 */}
          <input
            type="text"
            placeholder="搜索题库名称..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* 学科筛选（支持树形结构） */}
          <div className="w-64">
            <select
              value={filters.subjectCode}
              onChange={(e) => handleFilterChange('subjectCode', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有学科</option>
              {(() => {
                // 扁平化树形结构用于下拉选择
                const flattenSubjects = (subjects, result = []) => {
                  subjects.forEach((subject) => {
                    result.push(subject);
                    if (subject.children && subject.children.length > 0) {
                      flattenSubjects(subject.children, result);
                    }
                  });
                  return result;
                };
                return flattenSubjects(subjects).map((subject) => {
                  const indent = '  '.repeat((subject.level || 1) - 1);
                  return (
                    <option key={subject.code} value={subject.code}>
                      {indent}{subject.icon || '📚'} {subject.name} ({subject.code})
                    </option>
                  );
                });
              })()}
            </select>
          </div>

          {/* 公开性筛选 */}
          <select
            value={filters.isPublic ?? ''}
            onChange={(e) =>
              handleFilterChange(
                'isPublic',
                e.target.value === '' ? undefined : e.target.value === 'true'
              )
            }
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部</option>
            <option value="true">公开</option>
            <option value="false">私有</option>
          </select>
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-2">
          {/* 导出按钮 */}
          <div className="relative group">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              导出 ▼
            </button>
            <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[120px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={() => {
                  try {
                    exportBanks(banks, `banks-${Date.now()}.json`);
                    toast.success(`已导出 ${banks.length} 个题库`);
                  } catch (error) {
                    toast.error('导出失败: ' + error.message);
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 rounded-lg"
              >
                导出为JSON
              </button>
            </div>
          </div>
          
          {/* 导入按钮 */}
          {canManageOwn && (
            <button
              onClick={() => navigate('/banks/import')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap"
            >
              📥 导入
            </button>
          )}
          
          {/* 创建按钮 */}
          {canManageOwn && (
            <button
              onClick={() => navigate('/banks/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + 创建题库
            </button>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* 视图切换按钮 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          共找到 {meta.total} 个题库
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}
            title="列表视图"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}
            title="卡片视图"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 题库列表 */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">加载中...</div>
      ) : banks.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          暂无题库数据
        </div>
      ) : viewMode === 'list' ? (
        <>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    题库名称
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    学科
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    题目数量
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    创建者
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {banks.map((bank) => (
                  <tr key={bank._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div
                        className="font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => navigate(`/banks/${bank._id}`)}
                      >
                        {bank.name}
                      </div>
                      {bank.description && (
                        <div className="text-sm text-slate-500 mt-1 line-clamp-1">
                          {bank.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {bank.subjectCode ? (
                        <div className="flex items-center gap-2">
                          <span>{bank.subjectCode?.icon || '📚'}</span>
                          <span>{bank.subjectCode?.name || bank.subjectCode}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">未分类</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <span className="font-medium">{bank.questionCount || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div>{bank.ownerId?.name || bank.ownerId?.email || '-'}</div>
                      {bank.groupId && (
                        <div className="text-xs text-blue-600 mt-1">
                          📚 {bank.groupId?.name || ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          bank.isPublic
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {bank.isPublic ? '公开' : '私有'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/banks/${bank._id}`)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          查看
                        </button>
                        {canManageBank(bank) && (
                          <>
                            <button
                              onClick={() => navigate(`/banks/${bank._id}/edit`)}
                              className="text-green-600 hover:text-green-700 text-sm"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDelete(bank._id, bank.name)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              删除
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank) => (
            <div
              key={bank._id}
              className="bg-white rounded-lg border hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/banks/${bank._id}`)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-blue-600 line-clamp-2 flex-1">
                    {bank.name}
                  </h3>
                  <span
                    className={`ml-2 px-2 py-1 text-xs rounded flex-shrink-0 ${
                      bank.isPublic
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {bank.isPublic ? '公开' : '私有'}
                  </span>
                </div>
                {bank.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {bank.description}
                  </p>
                )}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>{bank.subjectCode?.icon || '📚'}</span>
                    <span>{bank.subjectCode?.name || '未分类'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">题目数量</span>
                    <span className="font-bold text-blue-600">{bank.questionCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">创建者</span>
                    <span className="text-slate-700">{bank.ownerId?.name || bank.ownerId?.email || '-'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/banks/${bank._id}`);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    查看详情
                  </button>
                  {canManageBank(bank) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/banks/${bank._id}/edit`);
                      }}
                      className="px-3 py-2 border rounded-lg hover:bg-slate-50 text-sm"
                    >
                      编辑
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            共 {meta.total} 个题库，第 {meta.page} / {meta.totalPages} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={meta.page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={meta.page >= meta.totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

