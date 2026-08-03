import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getGroupAssignments,
  createGroupAssignment,
  getGroupAssignmentCompletion,
} from '../../api/v3/groups';
import { toast } from '../../utils/toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { getActiveMembers, getLinkedBanks } from './groupDetailTabs';

export default function GroupAssignmentsTab({
  group,
  banks,
  isTeacher,
  active,
  onClose,
}) {
  const navigate = useNavigate();
  const linkedBanks = getLinkedBanks(group, banks);
  const activeMembers = getActiveMembers(group);
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
  const [completionForAssignment, setCompletionForAssignment] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);

  useEffect(() => {
    if (!active || !group?._id) return;
    setAssignmentsLoading(true);
    getGroupAssignments(group._id)
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setAssignmentsLoading(false));
  }, [active, group?._id]);

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

  return (
    <>
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

      {showCreateAssignment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md max-w-md w-full p-6 space-y-4">
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

      {(completionLoading || completionForAssignment) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
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
    </>
  );
}
