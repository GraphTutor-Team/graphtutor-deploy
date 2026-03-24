/**
 * GraphTutor V3.0 - 错题趋势图组件
 * 
 * 功能：显示错题数量的趋势变化
 */

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function WrongQuestionTrend({ wrongQuestions = [], days = 30 }) {
  // 按日期分组统计错题
  const trendData = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayWrong = wrongQuestions.filter((wq) => {
      const wqDate = new Date(wq.createdAt || wq.time || wq.date);
      return wqDate.toISOString().split('T')[0] === dateStr;
    });
    
    trendData.push({
      date: dateStr,
      day: `${date.getMonth() + 1}/${date.getDate()}`,
      count: dayWrong.length,
      cumulative: 0, // 将在下面计算
    });
  }
  
  // 计算累计错题数
  let cumulative = 0;
  trendData.forEach((item) => {
    cumulative += item.count;
    item.cumulative = cumulative;
  });

  if (trendData.length === 0 || trendData.every((d) => d.count === 0)) {
    return (
      <div className="card flex flex-col gap-3">
        <div className="text-sm font-medium">错题趋势分析</div>
        <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-700">
          暂无错题数据
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="text-sm font-medium">错题趋势分析（最近 {days} 天）</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: '#64748b' }}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#64748b' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                fontSize: 11,
              }}
            />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="count"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.3}
              name="每日错题数"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="#f59e0b"
              strokeWidth={2}
              name="累计错题数"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-slate-500">
        显示每日错题数量和累计错题趋势
      </div>
    </div>
  );
}

