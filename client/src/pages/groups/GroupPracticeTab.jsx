import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getGroupPractices,
  createGroupPractice,
  getGroupPracticeSession,
} from '../../api/v3/groups';
import { toast } from '../../utils/toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { getLinkedBanks } from './groupDetailTabs';

export default function GroupPracticeTab({
  group,
  banks,
  isTeacher,
  active,
  onClose,
}) {
  const navigate = useNavigate();
  const linkedBanks = getLinkedBanks(group, banks);
  const [practices, setPractices] = useState([]);
  const [practicesLoading, setPracticesLoading] = useState(false);
  const [showCreatePractice, setShowCreatePractice] = useState(false);
  const [practiceForm, setPracticeForm] = useState({ bankId: '', questionCount: 10, title: '共同练习' });
  const [creatingPractice, setCreatingPractice] = useState(false);

  useEffect(() => {
    if (!active || !group?._id) return;
    setPracticesLoading(true);
    getGroupPractices(group._id)
      .then(setPractices)
      .catch(() => setPractices([]))
      .finally(() => setPracticesLoading(false));
  }, [active, group?._id]);

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

  return (
    <>
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
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{session.title || '共同练习'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    题数: {session.questionCount ?? session.questionIds?.length ?? 0}
                    {session.createdBy?.name && ` · 发起: ${session.createdBy.name}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleJoinPractice(session)}
                  className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  参与练习
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCreatePractice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md max-w-md w-full p-6 space-y-4">
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
    </>
  );
}
