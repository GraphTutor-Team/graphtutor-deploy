/**
 * GraphTutor V3.0 - 好友学习统计组件
 * 
 * 作用：显示好友的学习统计数据
 */

import Icon from '../common/Icon';

export default function FriendStatsSection({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="答题总数"
        value={stats.records?.total || 0}
        icon="check-circle"
        color="blue"
      />
      <StatCard
        title="正确数"
        value={stats.records?.correct || 0}
        icon="check"
        color="green"
      />
      <StatCard
        title="正确率"
        value={`${(stats.records?.accuracy || 0).toFixed(1)}%`}
        icon="target"
        color="slate"
      />
      <StatCard
        title="学习时长"
        value={`${Math.round((stats.records?.totalTimeMinutes || 0) / 60)}小时`}
        icon="clock"
        color="orange"
      />
      <StatCard
        title="错题总数"
        value={stats.wrongQuestions?.total || 0}
        icon="x-circle"
        color="red"
      />
      <StatCard
        title="已掌握"
        value={stats.wrongQuestions?.mastered || 0}
        icon="check-circle-2"
        color="green"
      />
      <StatCard
        title="打卡天数"
        value={stats.checkIn?.totalDays || 0}
        icon="calendar"
        color="blue"
      />
      <StatCard
        title="笔记数量"
        value={stats.notes || 0}
        icon="file-text"
        color="slate"
      />
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
    red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon name={icon} className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

