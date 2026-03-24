/**
 * GraphTutor V3.0 - 增强的用户管理页面
 * 
 * 作用：提供完整的用户管理功能，包括搜索、筛选、排序、分页、批量操作、导入导出等
 * 关联页面：
 *   - hooks/useUserManagement.js (业务逻辑hook)
 *   - components/UserSearchBar.jsx (搜索栏组件)
 *   - components/AdvancedFilters.jsx (高级筛选组件)
 *   - components/UserTable.jsx (用户表格组件)
 *   - components/BulkActionsBar.jsx (批量操作栏组件)
 *   - components/UserDetailModal.jsx (用户详情模态框)
 *   - components/UserImportModal.jsx (用户导入模态框)
 *   - components/ExportConfigModal.jsx (导出配置模态框)
 * 技术栈：
 *   - React Hooks (useUserManagement自定义hook)
 *   - Tailwind CSS (样式)
 *   - 组件化设计 (可复用组件)
 */

import BackBar from '../../components/BackBar';
import Skeleton from '../../components/Skeleton';
import Empty from '../../components/Empty';
import { useUserManagement } from '../../hooks/useUserManagement';
import UserSearchBar from './components/UserSearchBar';
import AdvancedFilters from './components/AdvancedFilters';
import UserTable from './components/UserTable';
import BulkActionsBar from './components/BulkActionsBar';
import UserDetailModal from './components/UserDetailModal';
import UserImportModal from './components/UserImportModal';
import ExportConfigModal from './components/ExportConfigModal';

/**
 * 用户管理页面组件
 * @returns {JSX.Element} 用户管理页面
 */
export default function UserManagement() {
  const {
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
    setShowImportModal,
    setShowExportModal,
    setExportType,
    setDetailUserId,
    setShowDetailModal,
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
    loadUsers,
  } = useUserManagement();

  if (!currentUser) {
    return (
      <div>
        <BackBar title="用户管理" href="/admin" />
        <div className="card">
          <p className="text-sm text-slate-600 mb-3">
            请先使用管理员账号登录，才能访问用户管理页面。
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <BackBar title="用户管理" href="/admin" />
      
      <div className="space-y-4">
        {/* 搜索和筛选栏 */}
        <UserSearchBar
          search={search}
          roleFilter={roleFilter}
          onSearch={handleSearch}
          onFilter={handleFilter}
          onExport={(type) => {
            setExportType(type);
            setShowExportModal(true);
          }}
          onImport={() => setShowImportModal(true)}
          userCount={users.length}
          totalCount={total}
        />

        {/* 高级筛选 */}
        <AdvancedFilters
          filters={advancedFilters}
          onChange={handleAdvancedFiltersChange}
          onReset={handleResetAdvancedFilters}
        />

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <BulkActionsBar
            count={selectedIds.length}
            onBatchUpdateRole={handleBatchUpdateRole}
            onBatchDelete={handleBatchDelete}
            onClearSelection={() => setSelectedIds([])}
          />
        )}

        {/* 错误提示 */}
        {error && (
          <div className="card">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        )}

        {/* 用户表格 */}
        <div className="card">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <Empty text="暂无用户数据，或搜索条件下无结果。" />
          ) : (
            <>
              <UserTable
                users={users}
                currentUserId={currentUser.id || currentUser._id}
                selectedIds={selectedIds}
                sort={sort}
                order={order}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                onSort={handleSort}
                onViewDetail={handleViewDetail}
                onRefresh={loadUsers}
              />
              
              {/* 分页 */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    共 {total} 个用户，第 {page} / {totalPages} 页
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
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

      {/* 用户详情模态框 */}
      {showDetailModal && detailUserId && (
        <UserDetailModal
          userId={detailUserId}
          onClose={() => {
            setShowDetailModal(false);
            setDetailUserId(null);
          }}
        />
      )}

      {/* 用户导入模态框 */}
      {showImportModal && (
        <UserImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadUsers();
          }}
        />
      )}

      {/* 导出配置模态框 */}
      {showExportModal && (
        <ExportConfigModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportWithConfig}
        />
      )}
    </div>
  );
}
