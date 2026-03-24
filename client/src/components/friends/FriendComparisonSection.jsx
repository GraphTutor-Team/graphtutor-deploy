/**
 * GraphTutor V3.0 - 好友数据对比组件
 * 
 * 作用：显示好友学习数据对比（图表和表格）
 */

import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function FriendComparisonSection({ comparison }) {
  // 准备柱状图数据
  const barChartData = [
    {
      name: '答题总数',
      [comparison.user1.name]: comparison.comparison.records.user1.total,
      [comparison.user2.name]: comparison.comparison.records.user2.total,
    },
    {
      name: '正确数',
      [comparison.user1.name]: comparison.comparison.records.user1.correct,
      [comparison.user2.name]: comparison.comparison.records.user2.correct,
    },
    {
      name: '学习时长(小时)',
      [comparison.user1.name]: Math.round(comparison.comparison.records.user1.totalTimeMinutes / 60),
      [comparison.user2.name]: Math.round(comparison.comparison.records.user2.totalTimeMinutes / 60),
    },
    {
      name: '错题总数',
      [comparison.user1.name]: comparison.comparison.wrongQuestions.user1.total,
      [comparison.user2.name]: comparison.comparison.wrongQuestions.user2.total,
    },
    {
      name: '已掌握',
      [comparison.user1.name]: comparison.comparison.wrongQuestions.user1.mastered,
      [comparison.user2.name]: comparison.comparison.wrongQuestions.user2.mastered,
    },
    {
      name: '打卡天数',
      [comparison.user1.name]: comparison.comparison.checkIn.user1.totalDays,
      [comparison.user2.name]: comparison.comparison.checkIn.user2.totalDays,
    },
  ];

  // 准备雷达图数据
  const radarData = [
    {
      subject: '答题数',
      [comparison.user1.name]: Math.min(comparison.comparison.records.user1.total / 100, 1) * 100,
      [comparison.user2.name]: Math.min(comparison.comparison.records.user2.total / 100, 1) * 100,
      fullMark: 100,
    },
    {
      subject: '正确率',
      [comparison.user1.name]: comparison.comparison.records.user1.accuracy,
      [comparison.user2.name]: comparison.comparison.records.user2.accuracy,
      fullMark: 100,
    },
    {
      subject: '学习时长',
      [comparison.user1.name]: Math.min(comparison.comparison.records.user1.totalTimeMinutes / 600, 1) * 100,
      [comparison.user2.name]: Math.min(comparison.comparison.records.user2.totalTimeMinutes / 600, 1) * 100,
      fullMark: 100,
    },
    {
      subject: '打卡天数',
      [comparison.user1.name]: Math.min(comparison.comparison.checkIn.user1.totalDays / 30, 1) * 100,
      [comparison.user2.name]: Math.min(comparison.comparison.checkIn.user2.totalDays / 30, 1) * 100,
      fullMark: 100,
    },
    {
      subject: '笔记数',
      [comparison.user1.name]: Math.min(comparison.comparison.notes.user1 / 50, 1) * 100,
      [comparison.user2.name]: Math.min(comparison.comparison.notes.user2 / 50, 1) * 100,
      fullMark: 100,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 柱状图对比 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          数据对比柱状图
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={comparison.user1.name} fill="#3b82f6" />
            <Bar dataKey={comparison.user2.name} fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 雷达图对比 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          综合能力对比雷达图
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              name={comparison.user1.name}
              dataKey={comparison.user1.name}
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Radar
              name={comparison.user2.name}
              dataKey={comparison.user2.name}
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
            />
            <Tooltip />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 详细数据对比表格 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          详细数据对比
        </h3>
        <div className="space-y-4">
          <ComparisonRow
            label="答题总数"
            user1={comparison.comparison.records.user1.total}
            user2={comparison.comparison.records.user2.total}
            difference={comparison.comparison.records.difference.total}
          />
          <ComparisonRow
            label="正确数"
            user1={comparison.comparison.records.user1.correct}
            user2={comparison.comparison.records.user2.correct}
            difference={comparison.comparison.records.difference.correct}
          />
          <ComparisonRow
            label="正确率"
            user1={`${comparison.comparison.records.user1.accuracy.toFixed(1)}%`}
            user2={`${comparison.comparison.records.user2.accuracy.toFixed(1)}%`}
            difference={`${comparison.comparison.records.difference.accuracy.toFixed(1)}%`}
          />
          <ComparisonRow
            label="学习时长"
            user1={`${Math.round(comparison.comparison.records.user1.totalTimeMinutes / 60)}小时`}
            user2={`${Math.round(comparison.comparison.records.user2.totalTimeMinutes / 60)}小时`}
            difference={`${Math.round(comparison.comparison.records.difference.totalTimeMinutes / 60)}小时`}
          />
          <ComparisonRow
            label="错题总数"
            user1={comparison.comparison.wrongQuestions.user1.total}
            user2={comparison.comparison.wrongQuestions.user2.total}
            difference={comparison.comparison.wrongQuestions.difference.total}
          />
          <ComparisonRow
            label="已掌握错题"
            user1={comparison.comparison.wrongQuestions.user1.mastered}
            user2={comparison.comparison.wrongQuestions.user2.mastered}
            difference={comparison.comparison.wrongQuestions.difference.mastered}
          />
          <ComparisonRow
            label="打卡天数"
            user1={comparison.comparison.checkIn.user1.totalDays}
            user2={comparison.comparison.checkIn.user2.totalDays}
            difference={comparison.comparison.checkIn.difference.totalDays}
          />
          <ComparisonRow
            label="笔记数量"
            user1={comparison.comparison.notes.user1}
            user2={comparison.comparison.notes.user2}
            difference={comparison.comparison.notes.difference}
          />
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({ label, user1, user2, difference }) {
  const isPositive = typeof difference === 'number' ? difference > 0 : false;
  const diffColor = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
      <span className="text-slate-600 dark:text-slate-400 w-24">{label}</span>
      <div className="flex-1 flex items-center justify-around">
        <span className="text-slate-900 dark:text-slate-100">{user1}</span>
        <span className="text-slate-500 dark:text-slate-400">vs</span>
        <span className="text-slate-900 dark:text-slate-100">{user2}</span>
        <span className={`ml-4 ${diffColor}`}>
          {typeof difference === 'number' && difference !== 0 && (difference > 0 ? '+' : '')}
          {difference}
        </span>
      </div>
    </div>
  );
}

