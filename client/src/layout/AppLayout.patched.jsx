/**
 * GraphTutor V3.0 - 应用主布局组件
 * 
 * 作用：提供应用的主布局框架，包括导航栏、侧边栏、搜索功能、通知中心等，所有页面在此布局内渲染
 * 关联页面：
 *   - config/routes.jsx (路由配置，使用此布局)
 *   - context/AuthContext.jsx (用户认证状态)
 *   - components/NotificationCenter.jsx (通知中心)
 *   - components/SearchModal.jsx (搜索模态框)
 *   - utils/role.js (角色工具函数)
 *   - utils/accessibility.js (无障碍功能)
 * 技术栈：
 *   - React Router (NavLink, Outlet, useNavigate)
 *   - React Hooks (useState, useEffect)
 *   - 响应式布局
 *   - 侧边栏折叠/展开
 *   - 快捷键支持
 */

import { NavLink, Outlet, useNavigate, useMatch, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext.jsx";
import { isAdmin, isQuestionManager, getRoleName } from "../utils/role.js";
import NotificationCenter from "../components/NotificationCenter.jsx";
import SearchModal from "../components/SearchModal.jsx";
import AIAssistantFab from "../components/ai/AIAssistantFab.jsx";
import { AIContextProvider } from "../context/AIContext.jsx";

export default function AppLayout() {
  const [expand, setExpand] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(['学习中心', '社交与社区']));
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 移动端：路由变化时关闭侧栏，避免遮挡内容
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // 注册快捷键
  useEffect(() => {
    import('../utils/accessibility').then(({ setSearchModalHandler }) => {
      setSearchModalHandler(() => setSearchModalOpen(true));
    });
    
    import('../utils/keyboardShortcuts').then(({ registerShortcut }) => {
      // 注册导航快捷键
      registerShortcut('home', () => navigate('/home'));
      registerShortcut('back', () => navigate(-1));
      registerShortcut('quiz', () => navigate('/quiz'));
      registerShortcut('review', () => navigate('/review'));
      registerShortcut('notes', () => navigate('/notes'));
      registerShortcut('analytics', () => navigate('/analytics'));
      registerShortcut('settings', () => navigate('/settings'));
      registerShortcut('help', () => {
        import('../utils/keyboardShortcuts').then(({ showShortcutsHelp }) => {
          showShortcutsHelp();
        });
      });
    });
  }, [navigate]);

  // 根据角色获取菜单项（二级目录结构）
  const getMenuItems = () => {
    const role = user?.role || 'student';
    const items = [];

    // 1. 学习中心：首页 → 练/测/考 → 图谱与统计 → 结果
    items.push({
      type: 'group',
      label: '学习中心',
      roles: ['student', 'question_manager', 'admin'],
      children: [
        { to: '/home', title: '首页' },
        { to: '/quiz', title: '练习模式' },
        { to: '/quiz2', title: '测验会话' },
        { to: '/exam', title: '考试模式' },
        { to: '/graph', title: '知识图谱' },
        { to: '/statistics', title: '学习统计' },
        { to: '/result', title: '学习结果' },
      ],
    });

    // 2. 复习与错题
    items.push({
      type: 'group',
      label: '复习与错题',
      roles: ['student', 'question_manager', 'admin'],
      children: [
        { to: '/review', title: '错题复习' },
        { to: '/review-plans', title: '复习计划' },
      ],
    });

    // 3. 学习工具：收藏、笔记、计划、打卡
    items.push({
      type: 'group',
      label: '学习工具',
      roles: ['student', 'question_manager', 'admin'],
      children: [
        { to: '/favorites', title: '我的收藏' },
        { to: '/notes', title: '学习笔记' },
        { to: '/study-plans', title: '学习计划' },
        { to: '/check-in', title: '每日打卡' },
      ],
    });

    // 4. 学习分析
    items.push({
      type: 'group',
      label: '学习分析',
      roles: ['student', 'question_manager', 'admin'],
      children: [
        { to: '/analytics', title: '学习分析' },
        { to: '/goals', title: '学习目标' },
        { to: '/achievements', title: '学习成就' },
        { to: '/recommendations', title: '智能推荐' },
      ],
    });

    // 5. 社交与社区
    items.push({
      type: 'group',
      label: '社交与社区',
      roles: ['student', 'question_manager', 'admin'],
      children: [
        { to: '/messages', title: '消息' },
        { to: '/friends', title: '好友管理' },
        { to: '/friends/discover', title: '发现好友' },
        { to: '/groups', title: '群组管理' },
        { to: '/community', title: '学习社区' },
        { to: '/leaderboard', title: '排行榜' },
        { to: '/mentor', title: '师徒' },
        { to: '/learning-path', title: '学习路径' },
        { to: '/skill-tree', title: '技能树' },
      ],
    });

    // 6. 内容管理（仅出题负责人/管理员）：工作台 → 题库/题目 → 导入 → 扩展
    items.push({
      type: 'group',
      label: '内容管理',
      roles: ['question_manager', 'admin'],
      children: [
        { to: '/manager/dashboard', title: '工作台' },
        { to: '/banks', title: '题库管理' },
        { to: '/questions', title: '题目管理' },
        { to: '/questions/import', title: '题目导入' },
        { to: '/banks/import', title: '题库导入' },
        { to: '/ai', title: 'AI 出题' },
        { to: '/nodes', title: '知识点管理' },
        { to: '/subjects', title: '学科管理' },
      ],
    });

    // 7. 系统管理（仅管理员）
    items.push({
      type: 'group',
      label: '系统管理',
      roles: ['admin'],
      children: [
        { to: '/admin', title: '后台管理' },
        { to: '/admin/users', title: '用户管理' },
        { to: '/admin/role-applications', title: '角色申请' },
        { to: '/_new/admin-tools', title: '管理工具' },
      ],
    });

    // 8. 个人中心（放最后，与「设置/退出」靠近）
    items.push({
      type: 'group',
      label: '个人中心',
      roles: ['student', 'question_manager', 'admin'],
      children: [
        { to: '/profile', title: '个人中心' },
        { to: '/shop', title: '成就商城' },
        ...(role !== 'admin' ? [{ to: '/role/apply', title: '角色申请' }] : []),
        { to: '/settings', title: '系统设置' },
      ],
    });

    // 根据当前用户角色过滤菜单项
    return items.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(role);
    });
  };

  const menuItems = getMenuItems();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 如果还在加载认证状态，显示加载提示（必须在所有 Hooks 之后）
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* 移动端菜单按钮 */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-white rounded-lg shadow-lg border"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 移动端遮罩层 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ---------- 左侧侧边栏 ---------- */}
      <aside
        onMouseEnter={() => setExpand(true)}
        onMouseLeave={() => setExpand(false)}
        className={`
          group fixed left-0 top-0 z-50 h-full flex flex-col
          bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-lg border-r border-slate-200 dark:border-slate-700
          transition-[width] duration-300 ease-out
          ${expand ? "w-64" : "w-[4.5rem]"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* 顶部：Logo + 用户 */}
        <div className="shrink-0 px-3 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <div className={`flex items-center ${expand ? 'gap-3' : 'justify-center'}`}>
            <img
              src={logo}
              className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-700 shadow-md shrink-0"
              alt="GraphTutor"
            />
            {expand && (
              <span className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                GraphTutor
              </span>
            )}
          </div>
          {user && (
            <div className={`flex items-center mt-3 ${expand ? 'gap-3' : 'justify-center'}`}>
              <div className="relative shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-700 object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.nextElementSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white dark:border-slate-700 flex items-center justify-center text-white font-semibold text-sm ${user.avatarUrl ? 'hidden' : 'flex'}`}
                >
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" aria-hidden />
              </div>
              {expand && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {user.name || user.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {getRoleName(user.role)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 min-h-0" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          {menuItems.map((item, index) => {
            if (item.type === 'group') {
              return (
                <MenuGroup
                  key={`group-${index}`}
                  label={item.label}
                  children={item.children}
                  expand={expand}
                  isExpanded={expandedGroups.has(item.label)}
                  onToggle={() => {
                    const newExpanded = new Set(expandedGroups);
                    if (newExpanded.has(item.label)) {
                      newExpanded.delete(item.label);
                    } else {
                      newExpanded.add(item.label);
                    }
                    setExpandedGroups(newExpanded);
                  }}
                />
              );
            }
            return (
              <SideItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                title={item.title}
                expand={expand}
              />
            );
          })}
        </nav>

        {/* 底部：设置 + 退出 */}
        {user && (
          <div className="shrink-0 p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 space-y-1.5">
            <button
              onClick={() => navigate("/profile")}
              className={`w-full rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${expand ? '' : 'flex justify-center'}`}
            >
              {expand ? '个人设置' : '⚙️'}
            </button>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className={`w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${expand ? '' : 'flex justify-center'}`}
            >
              {expand ? '退出登录' : '🚪'}
            </button>
          </div>
        )}
      </aside>

      {/* 主内容区与 AI 助手共用上下文 */}
      <AIContextProvider>
        <main
          className={`
            flex-1 transition-[margin] duration-300 ease-out
            px-4 sm:px-6 pb-8 max-w-full min-w-0
            ${expand ? "md:ml-64" : "md:ml-[4.5rem]"}
            pt-16 md:pt-0
          `}
        >
          <Outlet />
        </main>

        {/* 全局搜索模态框 */}
        <SearchModal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} />

        {/* 全局 AI 学习伴侣悬浮入口 */}
        <AIAssistantFab />
      </AIContextProvider>
    </div>
  );
}

/* 可折叠菜单组 */
function MenuGroup({ label, children, expand, isExpanded, onToggle }) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between rounded-lg px-3 py-2
          text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200
          transition-colors duration-150
          ${expand ? 'text-left' : 'justify-center'}
        `}
      >
        {expand ? (
          <>
            <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            <span className="text-slate-400 dark:text-slate-500 text-[10px] transition-transform duration-200">
              {isExpanded ? '▾' : '▸'}
            </span>
          </>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider truncate max-w-full" title={label}>
            {label.slice(0, 2)}
          </span>
        )}
      </button>
      {expand && isExpanded && (
        <div className="mt-0.5 ml-1 pl-3 border-l border-slate-200 dark:border-slate-600 space-y-0.5">
          {children.map((child) => (
            <SideItem
              key={child.to}
              to={child.to}
              title={child.title}
              expand={expand}
              isSubItem={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* 单个菜单项 */
function SideItem({ to, title, expand, isSubItem = false }) {
  const match = useMatch(to);
  const isActive = match !== null;

  return (
    <NavLink
      to={to}
      className={`
        flex items-center rounded-lg px-3 py-2 text-left
        transition-colors duration-150 relative
        ${isSubItem ? 'text-sm' : 'text-sm'}
        ${
          isActive
            ? 'bg-blue-600 dark:bg-blue-500 text-white font-medium'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100'
        }
        ${expand ? '' : 'justify-center'}
      `}
    >
      {expand ? (
        <span className="flex-1 truncate">{title}</span>
      ) : (
        <span className="text-xs truncate max-w-full" title={title}>
          {title.length > 2 ? title.slice(0, 2) : title}
        </span>
      )}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white dark:bg-slate-200 rounded-r-full" aria-hidden />
      )}
    </NavLink>
  );
}
