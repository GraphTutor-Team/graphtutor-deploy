import { useState } from 'react';
import { linkBankToGroup, unlinkBankFromGroup } from '../../api/v3/groups';
import { toast } from '../../utils/toast';
import EmptyState from '../../components/common/EmptyState';
import { getLinkedBanks } from './groupDetailTabs';

export default function GroupBanksTab({ group, banks, isTeacher, onUpdate }) {
  const [linkBankId, setLinkBankId] = useState('');
  const linkedBanks = getLinkedBanks(group, banks);

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

  return (
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
              .filter((bank) => !linkedBanks.some((b) => b._id === bank._id))
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
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 bg-slate-50 rounded-lg min-w-0"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{bank.name}</div>
                {bank.description && (
                  <div className="text-sm text-slate-600 line-clamp-2">
                    {bank.description}
                  </div>
                )}
              </div>
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => handleUnlinkBank(bank._id)}
                  className="w-full sm:w-auto px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 shrink-0"
                >
                  取消关联
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
