import { useState, useEffect } from 'react';
import { removeMemberFromGroup, updateGroup } from '../../api/v3/groups';
import { toast } from '../../utils/toast';

export default function GroupSettingsTab({
  group,
  isOwner,
  currentUserId,
  onClose,
  onUpdate,
}) {
  const [settingsForm, setSettingsForm] = useState({
    name: group?.name || '',
    description: group?.description || '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setSettingsForm({
      name: group?.name || '',
      description: group?.description || '',
    });
  }, [group?._id, group?.name, group?.description]);

  const handleSaveSettings = async () => {
    if (!settingsForm.name.trim()) {
      toast.error('请输入群组名称');
      return;
    }
    try {
      setSavingSettings(true);
      await updateGroup(group._id, {
        name: settingsForm.name.trim(),
        description: settingsForm.description.trim(),
      });
      toast.success('设置已保存');
      onUpdate();
    } catch (err) {
      toast.error(err.message || '保存失败');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('确定要退出该群组吗？')) return;
    try {
      await removeMemberFromGroup(group._id, currentUserId);
      toast.success('已退出群组');
      onClose();
      onUpdate();
    } catch (err) {
      toast.error(err.message || '退出失败');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">群组名称</label>
        <input
          type="text"
          value={settingsForm.name}
          onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          disabled={!isOwner}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">描述</label>
        <textarea
          value={settingsForm.description}
          onChange={(e) => setSettingsForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          rows={3}
          disabled={!isOwner}
        />
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-400">
        <p>群组代码: <span className="font-mono font-bold">{group.code}</span></p>
        <p>创建时间: {new Date(group.createdAt).toLocaleString()}</p>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        {isOwner && (
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {savingSettings ? '保存中…' : '保存设置'}
          </button>
        )}
        {!isOwner && (
          <button
            type="button"
            onClick={handleLeaveGroup}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            退出群组
          </button>
        )}
      </div>
    </div>
  );
}
