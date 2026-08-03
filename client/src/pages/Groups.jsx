/**
 * GraphTutor V3.0 - 群组管理页面
 * 
 * 功能：创建、查看、管理学习群组
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getGroups,
  createGroup,
  deleteGroup,
  joinGroupByCode,
} from '../api/v3/groups';
import { getBanks } from '../api/v3/questionBanks';
import { toast } from '../utils/toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import GroupDetailDialog from './groups/GroupDetailDialog';

export default function Groups() {
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
    <div className="page-shell">
      <header className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              群组管理
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              创建和管理学习群组，组织学生协作学习
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowJoinDialog(true)}
              className="btn btn-outline"
            >
              加入群组
            </button>
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="btn btn-primary"
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
              description="创建或加入一个群组，和好友一起协作学习。不熟流程可先看使用教程。"
              actionLabel="创建群组"
              onAction={() => setShowCreateDialog(true)}
              secondaryLink="/home?guide=1"
              secondaryLabel="使用教程"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {groups.map((group) => (
                <article
                  key={group._id}
                  className="surface !p-0 overflow-hidden hover:border-blue-200 dark:hover:border-slate-600 transition-colors flex flex-col"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
                        {group.name}
                      </h3>
                      <span className="badge badge-primary shrink-0">
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

                  <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-900/40 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setSelectedGroup(group)}
                      className="btn btn-primary flex-1"
                    >
                      查看详情
                    </button>
                    {isGroupOwner(group) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('确定要删除此群组吗？')) {
                            handleDeleteGroup(group._id);
                          }
                        }}
                        className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
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
