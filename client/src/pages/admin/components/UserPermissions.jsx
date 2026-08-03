/**
 * GraphTutor V3.0 - 用户权限详情组件
 * 
 * 作用：显示用户的详细权限信息，包括角色、权限摘要、资源统计和分类权限列表
 * 关联页面：
 *   - components/UserDetailModal.jsx (用户详情模态框，使用此组件)
 *   - api/users.js (获取用户权限API)
 * 技术栈：
 *   - React组件
 *   - 权限分类展示
 *   - 徽章组件 (Badge)
 *   - 折叠面板
 */

export default function UserPermissions({ permissions, stats }) {
  if (!permissions) return null;

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'question_manager':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'student':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const PermissionSection = ({ title, perms, descriptions }) => {
    const activePerms = Object.entries(perms).filter(([_, value]) => value === true);
    
    if (activePerms.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <div className="space-y-1">
          {activePerms.map(([key, _]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="text-green-600">✓</span>
              <span className="text-slate-600">{descriptions[key] || key}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const descriptions = {
    userManagement: {
      canViewAllUsers: '查看所有用户列表',
      canModifyUserRole: '修改用户角色',
      canDeleteUsers: '删除用户',
      canBatchImportUsers: '批量导入用户',
      canViewUserDetails: '查看用户详细信息',
    },
    bankManagement: {
      canCreateBank: '创建题库',
      canEditAllBanks: '编辑所有题库',
      canDeleteAllBanks: '删除所有题库',
      canImportBanks: '导入题库',
      canExportBanks: '导出题库',
      canViewPublicBanks: '查看公开题库',
      canViewPrivateBanks: '查看私有题库',
    },
    questionManagement: {
      canCreateQuestion: '创建题目',
      canEditAllQuestions: '编辑所有题目',
      canDeleteAllQuestions: '删除所有题目',
      canImportQuestions: '导入题目',
      canExportQuestions: '导出题目',
      canUseAI: '使用AI生成题目',
    },
    subjectManagement: {
      canManageSubjects: '管理学科分类',
      canCreateSubject: '创建学科',
      canEditSubject: '编辑学科',
      canDeleteSubject: '删除学科',
    },
    noteManagement: {
      canCreateNote: '创建笔记',
      canEditOwnNotes: '编辑自己的笔记',
      canDeleteOwnNotes: '删除自己的笔记',
      canViewPublicNotes: '查看公开笔记',
      canViewAllNotes: '查看所有笔记',
      canDeleteAllNotes: '删除所有笔记',
    },
    discussionManagement: {
      canCreateDiscussion: '创建讨论',
      canEditOwnDiscussions: '编辑自己的讨论',
      canDeleteOwnDiscussions: '删除自己的讨论',
      canViewAllDiscussions: '查看所有讨论',
      canModerateDiscussions: '管理讨论',
      canDeleteAllDiscussions: '删除所有讨论',
    },
    systemManagement: {
      canAccessAdminPanel: '访问管理后台',
      canViewSystemStats: '查看系统统计',
      canExportAllData: '导出所有数据',
      canImportAllData: '导入所有数据',
      canManageSettings: '管理系统设置',
      canWipeData: '清空系统数据',
    },
    analytics: {
      canViewOwnAnalytics: '查看自己的学习分析',
      canViewAllAnalytics: '查看所有用户的学习分析',
      canExportReports: '导出学习报告',
      canViewSystemReports: '查看系统报告',
    },
    groupManagement: {
      canCreateGroup: '创建学习群组',
      canJoinGroup: '加入群组',
      canManageOwnGroups: '管理自己创建的群组',
      canManageAllGroups: '管理所有群组',
    },
  };

  return (
    <div className="space-y-4">
      {/* 角色和摘要 */}
      <div className="card bg-slate-50 border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900">角色与权限</h3>
            <p className="text-xs text-slate-600 mt-1">当前用户的权限详情</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border ${getRoleColor(permissions.role)}`}>
            {permissions.roleName}
          </span>
        </div>
        
        {permissions.summary && permissions.summary.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-600 mb-2">权限摘要：</p>
            <div className="flex flex-wrap gap-2">
              {permissions.summary.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-white/80 px-2 py-1 text-xs text-slate-700 border border-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 资源统计 */}
      {stats && (
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm">资源统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-700">{stats.banks || 0}</div>
              <div className="text-xs text-blue-600 mt-1">题库</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-700">{stats.questions || 0}</div>
              <div className="text-xs text-green-600 mt-1">题目</div>
            </div>
            <div className="text-center p-2 bg-slate-50 rounded-lg">
              <div className="text-lg font-bold text-purple-700">{stats.notes || 0}</div>
              <div className="text-xs text-blue-600 mt-1">笔记</div>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-700">{stats.discussions || 0}</div>
              <div className="text-xs text-orange-600 mt-1">讨论</div>
            </div>
            <div className="text-center p-2 bg-pink-50 rounded-lg">
              <div className="text-lg font-bold text-pink-700">{stats.groups || 0}</div>
              <div className="text-xs text-pink-600 mt-1">群组</div>
            </div>
          </div>
        </div>
      )}

      {/* 详细权限列表 */}
      <div className="card">
        <h3 className="font-semibold mb-4 text-sm">详细权限</h3>
        <div className="space-y-4">
          {permissions.userManagement && (
            <PermissionSection
              title="用户管理"
              perms={permissions.userManagement}
              descriptions={descriptions.userManagement}
            />
          )}
          {permissions.bankManagement && (
            <PermissionSection
              title="题库管理"
              perms={permissions.bankManagement}
              descriptions={descriptions.bankManagement}
            />
          )}
          {permissions.questionManagement && (
            <PermissionSection
              title="题目管理"
              perms={permissions.questionManagement}
              descriptions={descriptions.questionManagement}
            />
          )}
          {permissions.subjectManagement && (
            <PermissionSection
              title="学科管理"
              perms={permissions.subjectManagement}
              descriptions={descriptions.subjectManagement}
            />
          )}
          {permissions.noteManagement && (
            <PermissionSection
              title="笔记管理"
              perms={permissions.noteManagement}
              descriptions={descriptions.noteManagement}
            />
          )}
          {permissions.discussionManagement && (
            <PermissionSection
              title="讨论管理"
              perms={permissions.discussionManagement}
              descriptions={descriptions.discussionManagement}
            />
          )}
          {permissions.systemManagement && (
            <PermissionSection
              title="系统管理"
              perms={permissions.systemManagement}
              descriptions={descriptions.systemManagement}
            />
          )}
          {permissions.analytics && (
            <PermissionSection
              title="数据分析"
              perms={permissions.analytics}
              descriptions={descriptions.analytics}
            />
          )}
          {permissions.groupManagement && (
            <PermissionSection
              title="群组管理"
              perms={permissions.groupManagement}
              descriptions={descriptions.groupManagement}
            />
          )}
        </div>
      </div>
    </div>
  );
}

