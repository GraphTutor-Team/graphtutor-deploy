/**
 * GraphTutor V3.0 - 懒加载工具
 * 
 * 作用：集中管理所有需要懒加载的页面组件，优化应用初始加载性能
 * 关联页面：
 *   - config/routes.jsx (路由配置，使用懒加载组件)
 *   - App.jsx (应用入口，间接使用)
 * 技术栈：
 *   - React.lazy (组件懒加载)
 *   - 代码分割 (Code Splitting)
 *   - 动态导入 (Dynamic Import)
 */

import { lazy } from 'react';

// 懒加载页面组件
export const LazyBankList = lazy(() => import('../pages/banks/BankList.jsx'));
export const LazyBankDetail = lazy(() => import('../pages/banks/BankDetail.jsx'));
export const LazyBankForm = lazy(() => import('../pages/banks/BankForm.jsx'));
export const LazyBankStats = lazy(() => import('../pages/banks/BankStats.jsx'));
export const LazyQuestionList = lazy(() => import('../pages/questions/QuestionList.jsx'));
export const LazyQuestionEditor = lazy(() => import('../pages/questions/QuestionEditor.jsx'));
export const LazyQuestionDetail = lazy(() => import('../pages/questions/QuestionDetail.jsx'));
export const LazyQuestionWizard = lazy(() => import('../pages/questions/QuestionWizard.jsx'));
export const LazyQuestionImport = lazy(() => import('../pages/questions/QuestionImport.jsx'));
export const LazySubjectManagement = lazy(() => import('../pages/subjects/SubjectManagement.jsx'));
export const LazyRoleApplication = lazy(() => import('../pages/role/RoleApplication.jsx'));
export const LazyRoleApplicationManagement = lazy(() => import('../pages/admin/RoleApplicationManagement.jsx'));
export const LazyAIConsole = lazy(() => import('../pages/ai/AIConsole.jsx'));
export const LazyManagerDashboard = lazy(() => import('../pages/manager/Dashboard.jsx'));
export const LazyBankImport = lazy(() => import('../pages/banks/BankImport.jsx'));
export const LazyAnalytics = lazy(() => import('../pages/Analytics.jsx'));
export const LazyLearningGoals = lazy(() => import('../pages/LearningGoals.jsx'));
export const LazyAchievements = lazy(() => import('../pages/Achievements.jsx'));
export const LazyRecommendations = lazy(() => import('../pages/Recommendations.jsx'));
export const LazyGroups = lazy(() => import('../pages/Groups.jsx'));
export const LazyReviewPlans = lazy(() => import('../pages/ReviewPlans.jsx'));
export const LazyFavorites = lazy(() => import('../pages/Favorites.jsx'));
export const LazyNotes = lazy(() => import('../pages/Notes.jsx'));
export const LazyStudyPlans = lazy(() => import('../pages/StudyPlans.jsx'));
export const LazyCheckIn = lazy(() => import('../pages/CheckIn.jsx'));
export const LazyLearningPath = lazy(() => import('../pages/LearningPath.jsx'));
export const LazySkillTree = lazy(() => import('../pages/SkillTree.jsx'));
export const LazyCommunity = lazy(() => import('../pages/Community.jsx'));
export const LazyLeaderboard = lazy(() => import('../pages/Leaderboard.jsx'));
export const LazyMentor = lazy(() => import('../pages/Mentor.jsx'));
export const LazyDiscussionDetail = lazy(() => import('../pages/DiscussionDetail.jsx'));
export const LazyNotifications = lazy(() => import('../pages/Notifications.jsx'));
export const LazyShop = lazy(() => import('../pages/Shop.jsx'));
export const LazyDataBackup = lazy(() => import('../components/DataBackup.jsx'));
export const LazyQuickQuestionGenerator = lazy(() => import('../pages/QuickQuestionGenerator.jsx'));
export const LazyPublicNotes = lazy(() => import('../pages/PublicNotes.jsx'));
export const LazyNoteShare = lazy(() => import('../pages/NoteShare.jsx'));
export const LazyUserManagement = lazy(() => import('../pages/admin/UserManagement.jsx'));
export const LazyOperationLogs = lazy(() => import('../pages/admin/OperationLogs.jsx'));
export const LazyReports = lazy(() => import('../pages/admin/Reports.jsx'));
export const LazyFriends = lazy(() => import('../pages/Friends.jsx'));
export const LazyFriendsDiscover = lazy(() => import('../pages/FriendsDiscover.jsx'));
export const LazyFriendDetail = lazy(() => import('../pages/FriendDetail.jsx'));
export const LazyUserProfile = lazy(() => import('../pages/UserProfile.jsx'));
export const LazyFriendChallenges = lazy(() => import('../pages/FriendChallenges.jsx'));
export const LazyLearningPosts = lazy(() => import('../pages/LearningPosts.jsx'));
export const LazyMessages = lazy(() => import('../pages/Messages.jsx'));

// 懒加载公共组件
export const LazySubjectSelector = lazy(() => import('../components/common/SubjectSelector.jsx'));
export const LazySubjectTree = lazy(() => import('../components/common/SubjectTree.jsx'));

