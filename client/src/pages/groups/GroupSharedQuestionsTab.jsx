import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroupSharedQuestions, removeGroupSharedQuestion } from '../../api/v3/groups';
import { toast } from '../../utils/toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function GroupSharedQuestionsTab({
  group,
  currentUserId,
  isTeacher,
  active,
  onClose,
}) {
  const navigate = useNavigate();
  const [sharedQuestions, setSharedQuestions] = useState([]);
  const [sharedQuestionsLoading, setSharedQuestionsLoading] = useState(false);

  useEffect(() => {
    if (!active || !group?._id) return;
    setSharedQuestionsLoading(true);
    getGroupSharedQuestions(group._id)
      .then(setSharedQuestions)
      .catch(() => setSharedQuestions([]))
      .finally(() => setSharedQuestionsLoading(false));
  }, [active, group?._id]);

  return (
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
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 min-w-0"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{q.content || `题目 ${q.questionId}`}</div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className={q.type === 'wrong' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {q.type === 'wrong' ? '错题' : '好题'}
                  </span>
                  <span>添加: {q.addedByName}</span>
                  {q.note && <span className="line-clamp-1">{q.note}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/quiz', { state: { questionIds: [q.questionId] } });
                  }}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  练习
                </button>
                {(q.addedBy === currentUserId || isTeacher) && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await removeGroupSharedQuestion(group._id, q.questionId);
                        toast.success('已移除');
                        getGroupSharedQuestions(group._id).then(setSharedQuestions).catch(() => {});
                      } catch (e) {
                        toast.error(e.message || '移除失败');
                      }
                    }}
                    className="flex-1 sm:flex-none px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
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
  );
}
