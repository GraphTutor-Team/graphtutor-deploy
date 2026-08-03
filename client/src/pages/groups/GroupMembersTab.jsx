import { removeMemberFromGroup } from '../../api/v3/groups';
import { toast } from '../../utils/toast';
import { getActiveMembers } from './groupDetailTabs';

export default function GroupMembersTab({ group, currentUserId, isTeacher, onUpdate }) {
  const activeMembers = getActiveMembers(group);

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

  return (
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
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 bg-slate-50 rounded-lg min-w-0"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="min-w-0">
                  <div className="font-medium break-words">
                    {member.userId?.name || member.userId?.email || '-'}
                    {member.role === 'teacher' && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded whitespace-nowrap">
                        老师
                      </span>
                    )}
                    {isCurrentUser && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded whitespace-nowrap">
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
                  type="button"
                  onClick={() => handleRemoveMember(memberId)}
                  className="w-full sm:w-auto px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                >
                  移除
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
