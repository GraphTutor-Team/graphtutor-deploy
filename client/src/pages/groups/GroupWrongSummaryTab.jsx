import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroupWrongSummary } from '../../api/v3/groups';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function GroupWrongSummaryTab({ group, active, onClose }) {
  const navigate = useNavigate();
  const [wrongSummary, setWrongSummary] = useState({ items: [] });
  const [wrongSummaryLoading, setWrongSummaryLoading] = useState(false);

  useEffect(() => {
    if (!active || !group?._id) return;
    setWrongSummaryLoading(true);
    getGroupWrongSummary(group._id)
      .then((data) => setWrongSummary(data))
      .catch(() => setWrongSummary({ items: [] }))
      .finally(() => setWrongSummaryLoading(false));
  }, [active, group?._id]);

  return (
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
  );
}
