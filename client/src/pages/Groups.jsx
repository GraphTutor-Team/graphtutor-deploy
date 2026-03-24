/**
 * GraphTutor V3.0 - 群组管理页面
 * 
 * 功能：创建、查看、管理学习群组
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  joinGroupByCode,
  addMemberToGroup,
  removeMemberFromGroup,
  updateMemberRole,
  linkBankToGroup,
  unlinkBankFromGroup,
  getGroupLeaderboard,
  getGroupPractices,
  createGroupPractice,
  getGroupPracticeSession,
  getGroupWrongSummary,
  getGroupAssignments,
  createGroupAssignment,
  getGroupAssignmentCompletion,
  getStudyRoomPresence,
  enterStudyRoom,
  leaveStudyRoom,
  studyRoomHeartbeat,
  updateStudyRoomStatus,
  getGroupSharedQuestions,
  addGroupSharedQuestion,
  removeGroupSharedQuestion,
} from '../api/v3/groups';
import { getBanks } from '../api/v3/questionBanks';
import { toast } from '../utils/toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [banks, setBanks] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [joinCode, setJoinCode] = useState('');

  // 创建群组表单
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: 'custom',
    settings: {
      allowStudentInvite: false,
      isPublic: false,
      requireApproval: false,
      maxMembers: 100,
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, banksData] = await Promise.all([
        getGroups({ status: 'active' }),
        getBanks({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      setGroups(groupsData || []);
      setBanks(banksData.data || []);
    } catch (err) {
      console.error('加载数据失败:', err);
      const msg = err.response?.status === 401 ? '请先登录' : (err.message || '加载数据失败');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      if (!createForm.name.trim()) {
        toast.error('请输入群组名称');
        return;
      }

      await createGroup(createForm);
      toast.success('群组创建成功');
      setShowCreateDialog(false);
      setCreateForm({
        name: '',
        description: '',
        type: 'custom',
        settings: {
          allowStudentInvite: false,
          isPublic: false,
          requireApproval: false,
          maxMembers: 100,
        },
      });
      loadData();
    } catch (err) {
      const msg = err.response?.status === 401 ? '请先登录' : (err.message || '创建群组失败');
      toast.error(msg);
    }
  };

  const handleJoinGroup = async () => {
    try {
      if (!joinCode.trim()) {
        toast.error('请输入群组代码');
        return;
      }

      await joinGroupByCode(joinCode.toUpperCase());
      toast.success('成功加入群组');
      setShowJoinDialog(false);
      setJoinCode('');
      loadData();
    } catch (err) {
      const msg = err.response?.status === 401 ? '请先登录' : (err.message || '加入群组失败');
      toast.error(msg);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await deleteGroup(groupId);
      toast.success('群组删除成功');
      loadData();
    } catch (err) {
      toast.error(err.message || '删除群组失败');
    }
  };

  const handleRemoveMember = async (groupId, memberId) => {
    try {
      await removeMemberFromGroup(groupId, memberId);
      toast.success('成员移除成功');
      loadData();
    } catch (err) {
      toast.error(err.message || '移除成员失败');
    }
  };

  const handleLinkBank = async (groupId, bankId) => {
    try {
      await linkBankToGroup(groupId, bankId);
      toast.success('题库关联成功');
      loadData();
    } catch (err) {
      toast.error(err.message || '关联题库失败');
    }
  };

  const handleUnlinkBank = async (groupId, bankId) => {
    try {
      await unlinkBankFromGroup(groupId, bankId);
      toast.success('取消关联成功');
      loadData();
    } catch (err) {
      toast.error(err.message || '取消关联失败');
    }
  };

  const currentUserId = user?.id || user?._id;

  const isGroupOwner = (group) => {
    const ownerId = group.ownerId?._id ?? group.ownerId;
    return ownerId != null && (String(ownerId) === String(currentUserId));
  };

  const isGroupTeacher = (group) => {
    if (isGroupOwner(group)) return true;
    return group.members?.some(
      (m) =>
        (m.userId?._id ?? m.userId) != null &&
        String(m.userId?._id ?? m.userId) === String(currentUserId) &&
        m.role === 'teacher' &&
        m.status === 'active'
    );
  };

  const getTypeLabel = (type) => {
    const labels = {
      class: '班级',
      study: '学习小组',
      custom: '自定义',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* 页面标题区 */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                群组管理
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                创建和管理学习群组，组织学生协作学习
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => setShowJoinDialog(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                加入群组
              </button>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                创建群组
              </button>
            </div>
          </div>
        </header>

        {/* 群组列表 */}
        <section>
          {groups.length === 0 ? (
            <EmptyState
              icon="users"
              title="暂无群组"
              description="当前还没有群组。创建或加入一个群组，和好友一起协作学习。"
              actionLabel="创建群组"
              onAction={() => setShowCreateDialog(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {groups.map((group) => (
                <article
                  key={group._id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow flex flex-col"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
                        {group.name}
                      </h3>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium shrink-0">
                        {getTypeLabel(group.type)}
                      </span>
                    </div>
                    {group.code && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-2">
                        代码 {group.code}
                      </p>
                    )}
                    {group.description ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                        {group.description}
                      </p>
                    ) : (
                      <div className="mb-4" />
                    )}

                    <div className="grid grid-cols-3 gap-3 py-3 border-t border-slate-100 dark:border-slate-700 mt-auto">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {group.members?.filter((m) => m.status === 'active').length || 0}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">成员</div>
                      </div>
                      <div className="text-center border-x border-slate-100 dark:border-slate-700">
                        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {group.bankIds?.length || 0}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">题库</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={group.ownerId?.name || group.ownerId?.email}>
                          {group.ownerId?.name || group.ownerId?.email || '-'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">群主</div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/30 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedGroup(group)}
                      className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      查看详情
                    </button>
                    {isGroupOwner(group) && (
                      <button
                        onClick={() => {
                          if (window.confirm('确定要删除此群组吗？')) {
                            handleDeleteGroup(group._id);
                          }
                        }}
                        className="py-2 px-3 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 创建群组对话框 */}
      {showCreateDialog && (
        <ConfirmDialog
          title="创建群组"
          onConfirm={handleCreateGroup}
          onCancel={() => setShowCreateDialog(false)}
          confirmText="创建"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">群组名称 *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="请输入群组名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">描述</label>
              <textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="请输入群组描述"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">群组类型</label>
              <select
                value={createForm.type}
                onChange={(e) =>
                  setCreateForm({ ...createForm, type: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="class">班级</option>
                <option value="study">学习小组</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createForm.settings.isPublic}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      settings: {
                        ...createForm.settings,
                        isPublic: e.target.checked,
                      },
                    })
                  }
                />
                <span className="text-sm">允许通过代码加入</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createForm.settings.requireApproval}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      settings: {
                        ...createForm.settings,
                        requireApproval: e.target.checked,
                      },
                    })
                  }
                />
                <span className="text-sm">需要审核才能加入</span>
              </label>
            </div>
          </div>
        </ConfirmDialog>
      )}

      {/* 加入群组对话框 */}
      {showJoinDialog && (
        <ConfirmDialog
          title="加入群组"
          onConfirm={handleJoinGroup}
          onCancel={() => {
            setShowJoinDialog(false);
            setJoinCode('');
          }}
          confirmText="加入"
        >
          <div>
            <label className="block text-sm font-medium mb-1">群组代码</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="请输入群组代码"
              maxLength={20}
            />
            <p className="text-xs text-slate-500 mt-1">
              请输入老师提供的群组代码
            </p>
          </div>
        </ConfirmDialog>
      )}

      {/* 群组详情对话框 */}
      {selectedGroup && (
        <GroupDetailDialog
          group={selectedGroup}
          banks={banks}
          onClose={() => setSelectedGroup(null)}
          onUpdate={loadData}
          isOwner={isGroupOwner(selectedGroup)}
          isTeacher={isGroupTeacher(selectedGroup)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

// 群组详情对话框组件
function GroupDetailDialog({
  group,
  banks,
  onClose,
  onUpdate,
  isOwner,
  isTeacher,
  currentUserId,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('members');
  const [linkBankId, setLinkBankId] = useState('');

  const [leaderboard, setLeaderboard] = useState({ items: [], period: 'all' });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [practices, setPractices] = useState([]);
  const [practicesLoading, setPracticesLoading] = useState(false);
  const [wrongSummary, setWrongSummary] = useState({ items: [] });
  const [wrongSummaryLoading, setWrongSummaryLoading] = useState(false);
  const [showCreatePractice, setShowCreatePractice] = useState(false);
  const [practiceForm, setPracticeForm] = useState({ bankId: '', questionCount: 10, title: '共同练习' });
  const [creatingPractice, setCreatingPractice] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    bankId: '',
    questionCount: 10,
    title: '作业',
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  const [studyRoomPresence, setStudyRoomPresence] = useState([]);
  const [studyRoomLoading, setStudyRoomLoading] = useState(false);
  const [isInStudyRoom, setIsInStudyRoom] = useState(false);
  const [studyRoomGoal, setStudyRoomGoal] = useState('');
  const [studyRoomHeartbeatRef, setStudyRoomHeartbeatRef] = useState(null);

  const [sharedQuestions, setSharedQuestions] = useState([]);
  const [sharedQuestionsLoading, setSharedQuestionsLoading] = useState(false);
  const [completionForAssignment, setCompletionForAssignment] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'leaderboard' && group?._id) {
      setLeaderboardLoading(true);
      getGroupLeaderboard(group._id, leaderboardPeriod)
        .then((data) => setLeaderboard(data))
        .catch(() => setLeaderboard({ items: [], period: leaderboardPeriod }))
        .finally(() => setLeaderboardLoading(false));
    }
  }, [activeTab, group?._id, leaderboardPeriod]);

  useEffect(() => {
    if (activeTab === 'practice' && group?._id) {
      setPracticesLoading(true);
      getGroupPractices(group._id)
        .then(setPractices)
        .catch(() => setPractices([]))
        .finally(() => setPracticesLoading(false));
    }
  }, [activeTab, group?._id]);

  useEffect(() => {
    if (activeTab === 'wrong' && group?._id && isTeacher) {
      setWrongSummaryLoading(true);
      getGroupWrongSummary(group._id)
        .then((data) => setWrongSummary(data))
        .catch(() => setWrongSummary({ items: [] }))
        .finally(() => setWrongSummaryLoading(false));
    }
  }, [activeTab, group?._id, isTeacher]);

  useEffect(() => {
    if (activeTab === 'assignments' && group?._id) {
      setAssignmentsLoading(true);
      getGroupAssignments(group._id)
        .then(setAssignments)
        .catch(() => setAssignments([]))
        .finally(() => setAssignmentsLoading(false));
    }
  }, [activeTab, group?._id]);

  useEffect(() => {
    if (activeTab === 'studyRoom' && group?._id) {
      setStudyRoomLoading(true);
      getStudyRoomPresence(group._id)
        .then((list) => {
          setStudyRoomPresence(list);
          const me = list.find((p) => p.userId === currentUserId);
          if (me) {
            setIsInStudyRoom(true);
            setStudyRoomGoal(me.todayGoal || '');
          }
        })
        .catch(() => setStudyRoomPresence([]))
        .finally(() => setStudyRoomLoading(false));
    }
  }, [activeTab, group?._id, currentUserId]);

  useEffect(() => {
    if (activeTab === 'sharedQuestions' && group?._id) {
      setSharedQuestionsLoading(true);
      getGroupSharedQuestions(group._id)
        .then(setSharedQuestions)
        .catch(() => setSharedQuestions([]))
        .finally(() => setSharedQuestionsLoading(false));
    }
  }, [activeTab, group?._id]);

  const loadStudyRoomPresence = () => {
    if (group?._id) {
      getStudyRoomPresence(group._id).then(setStudyRoomPresence).catch(() => {});
    }
  };

  const handleEnterStudyRoom = async () => {
    try {
      await enterStudyRoom(group._id, { todayGoal: studyRoomGoal.trim() || undefined });
      setIsInStudyRoom(true);
      toast.success('已进入自习室');
      loadStudyRoomPresence();
      const heartbeatInterval = setInterval(() => {
        studyRoomHeartbeat(group._id).catch(() => {});
        loadStudyRoomPresence();
      }, 2 * 60 * 1000);
      setStudyRoomHeartbeatRef(heartbeatInterval);
    } catch (err) {
      toast.error(err.message || '进入失败');
    }
  };

  const handleLeaveStudyRoom = async () => {
    try {
      if (studyRoomHeartbeatRef) {
        clearInterval(studyRoomHeartbeatRef);
        setStudyRoomHeartbeatRef(null);
      }
      await leaveStudyRoom(group._id);
      setIsInStudyRoom(false);
      toast.success('已离开自习室');
      setStudyRoomPresence((prev) => prev.filter((p) => p.userId !== currentUserId));
    } catch (err) {
      toast.error(err.message || '离开失败');
    }
  };

  useEffect(() => {
    return () => {
      if (studyRoomHeartbeatRef) clearInterval(studyRoomHeartbeatRef);
    };
  }, [studyRoomHeartbeatRef]);

  const handleCreatePractice = async () => {
    if (!practiceForm.bankId) {
      toast.error('请选择题库');
      return;
    }
    setCreatingPractice(true);
    try {
      await createGroupPractice(group._id, practiceForm);
      toast.success('共同练习已创建');
      setShowCreatePractice(false);
      setPracticeForm({ bankId: '', questionCount: 10, title: '共同练习' });
      getGroupPractices(group._id).then(setPractices);
    } catch (err) {
      toast.error(err.message || '发起失败');
    } finally {
      setCreatingPractice(false);
    }
  };

  const handleJoinPractice = async (session) => {
    try {
      const data = await getGroupPracticeSession(group._id, session._id);
      const ids = (data.questionIds || []).map((id) => id.toString?.() || id);
      onClose();
      navigate('/quiz', { state: { groupPracticeQuestionIds: ids } });
    } catch (err) {
      toast.error(err.message || '无法加入练习');
    }
  };

  const handleCreateAssignment = async () => {
    if (!assignmentForm.bankId) {
      toast.error('请选择题库');
      return;
    }
    setCreatingAssignment(true);
    try {
      await createGroupAssignment(group._id, {
        bankId: assignmentForm.bankId,
        questionCount: Math.max(1, Math.min(200, Number(assignmentForm.questionCount) || 10)),
        title: assignmentForm.title || '作业',
        dueAt: new Date(assignmentForm.dueAt).toISOString(),
      });
      toast.success('作业已布置');
      setShowCreateAssignment(false);
      setAssignmentForm({
        bankId: '',
        questionCount: 10,
        title: '作业',
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      });
      getGroupAssignments(group._id).then(setAssignments);
    } catch (err) {
      toast.error(err.message || '布置失败');
    } finally {
      setCreatingAssignment(false);
    }
  };

  const handleOpenAssignment = (assignment) => {
    onClose();
    navigate('/exam', {
      state: {
        assignmentId: assignment._id,
        groupId: group._id,
        bankId: assignment.bankId?._id || assignment.bankId,
        questionCount: assignment.questionCount || 10,
      },
    });
  };

  const handleShowCompletion = async (assignmentId) => {
    setCompletionLoading(true);
    setCompletionForAssignment(null);
    try {
      const data = await getGroupAssignmentCompletion(group._id, assignmentId);
      setCompletionForAssignment(data);
    } catch (err) {
      toast.error(err.message || '获取完成情况失败');
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleLinkBank = async () => {
    if (!linkBankId) {
      toast.error('请选择题库');
      return;
    }
    try {
      await linkBankToGroup(group._id, linkBankId);
      toast.success('题库关联成功');
      setLinkBankId('');
      onUpdate();
    } catch (err) {
      toast.error(err.message || '关联题库失败');
    }
  };

  const handleUnlinkBank = async (bankId) => {
    try {
      await unlinkBankFromGroup(group._id, bankId);
      toast.success('取消关联成功');
      onUpdate();
    } catch (err) {
      toast.error(err.message || '取消关联失败');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('确定要移除此成员吗？')) return;
    try {
      await removeMemberFromGroup(group._id, memberId);
      toast.success('成员移除成功');
      onUpdate();
    } catch (err) {
      toast.error(err.message || '移除成员失败');
    }
  };

  const activeMembers = group.members?.filter((m) => m.status === 'active') || [];
  const linkedBanks = banks.filter((bank) =>
    group.bankIds?.some((id) => id._id === bank._id || id === bank._id)
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate pr-4">
            {group.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 标签页 */}
        <div className="border-b border-slate-200 dark:border-slate-700 px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'members'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              成员 ({activeMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('banks')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'banks'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              关联题库 ({linkedBanks.length})
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'leaderboard'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              排行榜
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'practice'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              共同练习
            </button>
            <button
              onClick={() => setActiveTab('studyRoom')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'studyRoom'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              自习室
            </button>
            <button
              onClick={() => setActiveTab('sharedQuestions')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'sharedQuestions'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              小组题库
            </button>
            {isTeacher && (
              <button
                onClick={() => setActiveTab('wrong')}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'wrong'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                错题集锦
              </button>
            )}
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'assignments'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              作业
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              设置
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-0">

          {/* 成员标签页 */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-600">
                    群组代码: <span className="font-mono font-bold">{group.code}</span>
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {activeMembers.map((member) => {
                  const memberId = member.userId?._id || member.userId;
                  const isCurrentUser = memberId === currentUserId;
                  const canRemove =
                    isTeacher &&
                    !isCurrentUser &&
                    memberId !== group.ownerId?._id &&
                    memberId !== group.ownerId;

                  return (
                    <div
                      key={member._id || memberId}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">
                            {member.userId?.name || member.userId?.email || '-'}
                            {member.role === 'teacher' && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                老师
                              </span>
                            )}
                            {isCurrentUser && (
                              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                我
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            加入时间: {new Date(member.joinedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(memberId)}
                          className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          移除
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 关联题库标签页 */}
          {activeTab === 'banks' && (
            <div className="space-y-4">
              {isTeacher && (
                <div className="flex items-center gap-2 mb-4">
                  <select
                    value={linkBankId}
                    onChange={(e) => setLinkBankId(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  >
                    <option value="">选择要关联的题库</option>
                    {banks
                      .filter(
                        (bank) =>
                          !linkedBanks.some(
                            (b) => b._id === bank._id
                          )
                      )
                      .map((bank) => (
                        <option key={bank._id} value={bank._id}>
                          {bank.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleLinkBank}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    关联
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {linkedBanks.length === 0 ? (
                  <EmptyState
                    icon="book"
                    title="暂无关联题库"
                    description="关联题库后，群成员可在此群内练习该题库的题目。请点击上方「关联」添加题库。"
                  />
                ) : (
                  linkedBanks.map((bank) => (
                    <div
                      key={bank._id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{bank.name}</div>
                        {bank.description && (
                          <div className="text-sm text-slate-600">
                            {bank.description}
                          </div>
                        )}
                      </div>
                      {isTeacher && (
                        <button
                          onClick={() => handleUnlinkBank(bank._id)}
                          className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          取消关联
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 排行榜标签页 */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">统计周期：</span>
                <select
                  value={leaderboardPeriod}
                  onChange={(e) => setLeaderboardPeriod(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="week">本周</option>
                  <option value="month">本月</option>
                  <option value="all">全部</option>
                </select>
              </div>
              {leaderboardLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : leaderboard.items?.length === 0 ? (
                <EmptyState icon="trophy" title="暂无排行" description="成员答题后将按答题量与正确率显示排名。" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-600">
                        <th className="text-left py-2 px-2">排名</th>
                        <th className="text-left py-2 px-2">姓名</th>
                        <th className="text-right py-2 px-2">答题数</th>
                        <th className="text-right py-2 px-2">正确率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.items.map((row) => {
                        const uid = row.userId?._id || row.userId;
                        const isMe = uid === currentUserId;
                        return (
                          <tr
                            key={uid || row.rank}
                            className={`border-b border-slate-100 dark:border-slate-700 ${isMe ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                          >
                            <td className="py-2 px-2 font-medium">{row.rank}</td>
                            <td className="py-2 px-2">
                              {row.name || row.userId?.name || row.userId?.email || '-'}
                              {isMe && <span className="ml-1 text-blue-600 dark:text-blue-400">(我)</span>}
                            </td>
                            <td className="py-2 px-2 text-right">{row.totalQuestions ?? 0}</td>
                            <td className="py-2 px-2 text-right">
                              {row.accuracy != null ? `${Math.round(Number(row.accuracy) * 100)}%` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 共同练习标签页 */}
          {activeTab === 'practice' && (
            <div className="space-y-4">
              {isTeacher && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowCreatePractice(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    发起共同练习
                  </button>
                </div>
              )}
              {practicesLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : practices.length === 0 ? (
                <EmptyState
                  icon="edit"
                  title="暂无进行中的共同练习"
                  description={isTeacher ? '点击「发起共同练习」选择题库与题数，成员可一起做同一套题。' : '老师发起后，可在此参与共同练习。'}
                />
              ) : (
                <ul className="space-y-2">
                  {practices.map((session) => (
                    <li
                      key={session._id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{session.title || '共同练习'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          题数: {session.questionCount ?? session.questionIds?.length ?? 0}
                          {session.createdBy?.name && ` · 发起: ${session.createdBy.name}`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinPractice(session)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        参与练习
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 自习室标签页 */}
          {activeTab === 'studyRoom' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                与组内成员一起自习，互相监督。进入后每 2 分钟自动刷新在线状态，5 分钟无活动将自动视为离开。
              </p>
              {!isInStudyRoom ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">今日学习目标（选填）</label>
                    <input
                      type="text"
                      value={studyRoomGoal}
                      onChange={(e) => setStudyRoomGoal(e.target.value)}
                      placeholder="例如：完成高数第十章练习"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <button
                    onClick={handleEnterStudyRoom}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    进入自习室
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={studyRoomGoal}
                      onChange={(e) => setStudyRoomGoal(e.target.value)}
                      placeholder="今日学习目标"
                      className="flex-1 min-w-[160px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={() => {
                        updateStudyRoomStatus(group._id, { todayGoal: studyRoomGoal }).then(() => loadStudyRoomPresence()).catch(() => {});
                      }}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      更新今日目标
                    </button>
                    <button
                      onClick={handleLeaveStudyRoom}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      离开自习室
                    </button>
                  </div>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">当前在线 ({studyRoomPresence.length})</h4>
                {studyRoomLoading ? (
                  <div className="flex justify-center py-4"><LoadingSpinner /></div>
                ) : studyRoomPresence.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">暂无人在自习室</p>
                ) : (
                  <ul className="space-y-2">
                    {studyRoomPresence.map((p) => (
                      <li
                        key={p.userId}
                        className={`flex items-center justify-between p-2 rounded-lg ${p.userId === currentUserId ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-slate-50 dark:bg-slate-700/50'}`}
                      >
                        <span className="font-medium">{p.name}</span>
                        {p.userId === currentUserId && <span className="text-xs text-emerald-600 dark:text-emerald-400">(我)</span>}
                        {p.todayGoal && <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={p.todayGoal}>{p.todayGoal}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 小组题库标签页 */}
          {activeTab === 'sharedQuestions' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                组内成员可把错题或好题加入小组题库，形成组内精选题库，所有人可在此练习。
              </p>
              {sharedQuestionsLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : sharedQuestions.length === 0 ? (
                <EmptyState
                  icon="book"
                  title="小组题库为空"
                  description="从「我的错题」或「收藏」中选题加入小组题库，或等组内成员添加。"
                />
              ) : (
                <ul className="space-y-2">
                  {sharedQuestions.map((q) => (
                    <li
                      key={q._id || q.questionId}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{q.content || `题目 ${q.questionId}`}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className={q.type === 'wrong' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {q.type === 'wrong' ? '错题' : '好题'}
                          </span>
                          <span>添加: {q.addedByName}</span>
                          {q.note && <span>{q.note}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <button
                          onClick={() => {
                            onClose();
                            navigate('/quiz', { state: { questionIds: [q.questionId] } });
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          练习
                        </button>
                        {(q.addedBy === currentUserId || isTeacher) && (
                          <button
                            onClick={async () => {
                              try {
                                await removeGroupSharedQuestion(group._id, q.questionId);
                                toast.success('已移除');
                                getGroupSharedQuestions(group._id).then(setSharedQuestions).catch(() => {});
                              } catch (e) {
                                toast.error(e.message || '移除失败');
                              }
                            }}
                            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            移除
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/review', { state: { fromGroup: group._id, groupName: group.name } });
                  }}
                  className="px-4 py-2 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  从错题本添加题目
                </button>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/favorites', { state: { fromGroup: group._id, groupName: group.name } });
                  }}
                  className="ml-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  从收藏添加题目
                </button>
              </div>
            </div>
          )}

          {/* 错题集锦标签页（仅老师可见） */}
          {activeTab === 'wrong' && (
            <div className="space-y-4">
              {wrongSummaryLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : !wrongSummary.items?.length ? (
                <EmptyState
                  icon="clipboard"
                  title="暂无群组错题"
                  description="成员做题产生的错题会汇总于此，便于统一讲解。"
                />
              ) : (
                <ul className="space-y-3">
                  {(wrongSummary.items || []).map((item, index) => (
                    <li
                      key={item.questionId || index}
                      className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 mb-2">
                        {item.summary || item.content || `题目 ${item.questionId}`}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>错误人数: {item.wrongCount ?? 0}</span>
                        {item.wrongUserNames?.length > 0 && (
                          <span>（{item.wrongUserNames.slice(0, 5).join('、')}{item.wrongUserNames.length > 5 ? '…' : ''}）</span>
                        )}
                      </div>
                      {item.questionId && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate(`/questions/${item.questionId}/detail`);
                          }}
                          className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          查看题目
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 作业标签页 */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              {isTeacher && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowCreateAssignment(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    布置作业
                  </button>
                </div>
              )}
              {assignmentsLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : assignments.length === 0 ? (
                <EmptyState
                  icon="edit"
                  title="暂无作业"
                  description={isTeacher ? '点击「布置作业」指定题库与截止时间，学生提交后可在完成情况中查看。' : '老师布置作业后将显示在此，点击「去做作业」进入考试模式完成并提交。'}
                />
              ) : (
                <ul className="space-y-3">
                  {assignments.map((a) => {
                    const dueAt = a.dueAt ? new Date(a.dueAt) : null;
                    const memberCount = activeMembers.length;
                    const submitted = a.submissionCount ?? 0;
                    return (
                      <li
                        key={a._id}
                        className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="font-medium">{a.title || '作业'}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {a.bankId?.name && `题库：${a.bankId.name}`}
                              {' · '}{a.questionCount ?? 0} 题
                              {dueAt && ` · 截止：${dueAt.toLocaleString()}`}
                              {isTeacher && memberCount > 0 && ` · 已提交 ${submitted}/${memberCount}`}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {isTeacher && (
                              <button
                                onClick={() => handleShowCompletion(a._id)}
                                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                完成情况
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenAssignment(a)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                              {isTeacher ? '查看' : '去做作业'}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* 设置标签页 */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">群组名称</label>
                <input
                  type="text"
                  defaultValue={group.name}
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={!isOwner}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  defaultValue={group.description}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  disabled={!isOwner}
                />
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p>群组代码: <span className="font-mono font-bold">{group.code}</span></p>
                <p>创建时间: {new Date(group.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* 发起共同练习弹窗 */}
        {showCreatePractice && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 z-10 rounded-xl">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">发起共同练习</h3>
              <div>
                <label className="block text-sm font-medium mb-1">题库</label>
                <select
                  value={practiceForm.bankId}
                  onChange={(e) => setPracticeForm((f) => ({ ...f, bankId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">请选择题库</option>
                  {linkedBanks.map((bank) => (
                    <option key={bank._id} value={bank._id}>{bank.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">题数</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={practiceForm.questionCount}
                  onChange={(e) => setPracticeForm((f) => ({ ...f, questionCount: Math.max(1, Math.min(100, Number(e.target.value) || 10)) }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">标题</label>
                <input
                  type="text"
                  value={practiceForm.title}
                  onChange={(e) => setPracticeForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="共同练习"
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreatePractice(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  取消
                </button>
                <button
                  onClick={handleCreatePractice}
                  disabled={creatingPractice}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingPractice ? '创建中…' : '发起'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 布置作业弹窗 */}
        {showCreateAssignment && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 z-10 rounded-xl">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">布置作业</h3>
              <div>
                <label className="block text-sm font-medium mb-1">题库</label>
                <select
                  value={assignmentForm.bankId}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, bankId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">请选择题库</option>
                  {linkedBanks.map((bank) => (
                    <option key={bank._id} value={bank._id}>{bank.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">题数</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={assignmentForm.questionCount}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, questionCount: Math.max(1, Math.min(200, Number(e.target.value) || 10)) }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">截止时间</label>
                <input
                  type="datetime-local"
                  value={assignmentForm.dueAt}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, dueAt: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">标题</label>
                <input
                  type="text"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="作业"
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateAssignment(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateAssignment}
                  disabled={creatingAssignment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingAssignment ? '布置中…' : '布置'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 完成情况弹窗 */}
        {(completionLoading || completionForAssignment) && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 z-10 rounded-xl">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {completionForAssignment?.assignment?.title || '完成情况'}
                </h3>
                <button
                  onClick={() => setCompletionForAssignment(null)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="关闭"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 min-h-0">
                {completionLoading ? (
                  <div className="flex justify-center py-8"><LoadingSpinner /></div>
                ) : completionForAssignment ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      已提交 {completionForAssignment.submittedCount}/{completionForAssignment.totalMembers} 人
                    </p>
                    <div>
                      <h4 className="text-sm font-medium mb-2">已提交</h4>
                      <ul className="space-y-1 text-sm">
                        {(completionForAssignment.submitted || []).map((s) => (
                          <li key={s.userId} className="flex justify-between">
                            <span>{s.name || s.userId}</span>
                            <span>
                              {s.totalCorrect}/{s.totalQuestions}
                              {s.score != null && ` · ${s.score}%`}
                              {' · '}{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {(completionForAssignment.notSubmitted || []).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">未提交</h4>
                        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                          {(completionForAssignment.notSubmitted || []).map((s) => (
                            <li key={s.userId}>{s.name || s.userId}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

