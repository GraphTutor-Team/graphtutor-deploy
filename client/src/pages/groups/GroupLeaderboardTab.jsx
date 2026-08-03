import { useState, useEffect } from 'react';
import { getGroupLeaderboard } from '../../api/v3/groups';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function GroupLeaderboardTab({ group, currentUserId, active }) {
  const [leaderboard, setLeaderboard] = useState({ items: [], period: 'all' });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    if (!active || !group?._id) return;
    setLeaderboardLoading(true);
    getGroupLeaderboard(group._id, leaderboardPeriod)
      .then((data) => setLeaderboard(data))
      .catch(() => setLeaderboard({ items: [], period: leaderboardPeriod }))
      .finally(() => setLeaderboardLoading(false));
  }, [active, group?._id, leaderboardPeriod]);

  return (
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
  );
}
