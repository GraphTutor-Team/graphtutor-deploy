/**
 * GraphTutor V3.0 - 学习时间分布图组件
 * 
 * 功能：显示一天中不同时间段的学习活动分布
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function StudyTimeDistribution({ records = [] }) {
  // 将记录按小时分组
  const hourData = Array.from({ length: 24 }, (_, hour) => {
    const hourRecords = records.filter((record) => {
      const date = new Date(record.createdAt || record.time || record.date);
      return date.getHours() === hour;
    });
    return {
      hour: `${hour}:00`,
      count: hourRecords.length,
      correct: hourRecords.filter((r) => r.isCorrect || r.correct).length,
    };
  });

  const maxCount = Math.max(...hourData.map((d) => d.count), 1);

  return (
    <div className="card flex flex-col gap-3">
      <div className="text-sm font-medium">学习时间分布（24小时）</div>
      <div className="h-64">
        {maxCount === 0 ? (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-700">
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: '#64748b' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  fontSize: 11,
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="#1d4ed8" name="总题数" />
              <Bar dataKey="correct" fill="#047857" name="正确数" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="text-xs text-slate-500">
        显示你在一天中不同时间段的学习活动分布
      </div>
    </div>
  );
}

