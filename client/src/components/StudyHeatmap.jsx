/**
 * GraphTutor V3.0 - 学习热力图组件
 * 
 * 功能：显示学习活动热力图（类似GitHub贡献图）
 */

import { useMemo } from 'react';

const DAYS_OF_WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function getIntensityColor(count, maxCount) {
  if (count === 0) return 'bg-slate-100';
  const ratio = count / maxCount;
  if (ratio < 0.25) return 'bg-green-200';
  if (ratio < 0.5) return 'bg-green-400';
  if (ratio < 0.75) return 'bg-green-600';
  return 'bg-green-800';
}

export default function StudyHeatmap({ data = [], days = 365 }) {
  const { cells, maxCount, monthLabels } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { cells: [], maxCount: 0, monthLabels: [] };
    }
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);

    // 创建日期到数据的映射
    const dataMap = new Map();
    if (Array.isArray(data)) {
      data.forEach((item) => {
        const date = new Date(item.day || item.date || item.createdAt);
        const dateStr = date.toISOString().split('T')[0];
        const count = item.count || item.total || item.questions || 0;
        dataMap.set(dateStr, count);
      });
    }

    // 生成所有日期单元格
    const cells = [];
    const monthLabels = [];
    let currentDate = new Date(startDate);
    let lastMonth = -1;

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = dataMap.get(dateStr) || 0;
      const dayOfWeek = currentDate.getDay();
      const month = currentDate.getMonth();

      // 记录月份标签位置
      if (month !== lastMonth) {
        monthLabels.push({
          month,
          position: cells.length,
        });
        lastMonth = month;
      }

      cells.push({
        date: dateStr,
        count,
        dayOfWeek,
        month,
      });

      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
      currentDate = nextDate;
    }

    // 计算最大数量
    const maxCount = Math.max(...cells.map((c) => c.count), 1);

    return { cells, maxCount, monthLabels };
  }, [data, days]);

  if (cells.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
        <div className="text-center text-slate-500">暂无学习数据</div>
      </div>
    );
  }

  // 按周组织数据
  const weeks = [];
  let currentWeek = [];
  let currentWeekStart = cells[0].dayOfWeek;

  // 填充第一周前面的空白
  for (let i = 0; i < currentWeekStart; i++) {
    currentWeek.push(null);
  }

  cells.forEach((cell) => {
    if (cell.dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
    currentWeek.push(cell);
  });

  // 添加最后一周
  if (currentWeek.length > 0) {
    // 填充到7天
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-2">学习活动热力图</h3>
        <p className="text-sm text-slate-600">显示最近 {days} 天的学习活动</p>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {/* 星期标签 */}
          <div className="flex flex-col gap-1 mr-2">
            <div className="h-4"></div>
            {DAYS_OF_WEEK.map((day, idx) => (
              <div
                key={idx}
                className="h-3 text-xs text-slate-600 flex items-center justify-end pr-1"
                style={{ height: '11px' }}
              >
                {idx % 2 === 1 ? day : ''}
              </div>
            ))}
          </div>

          {/* 热力图主体 */}
          <div className="flex-1">
            {/* 月份标签 */}
            <div className="flex gap-1 mb-1 h-4">
              {monthLabels.map((label, idx) => {
                const nextLabel = monthLabels[idx + 1];
                const width = nextLabel
                  ? nextLabel.position - label.position
                  : weeks.length - label.position;
                return (
                  <div
                    key={idx}
                    className="text-xs text-slate-600"
                    style={{ width: `${width * 11}px` }}
                  >
                    {MONTHS[label.month]}
                  </div>
                );
              })}
            </div>

            {/* 热力图网格 */}
            <div className="flex gap-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((cell, dayIdx) => {
                    if (!cell) {
                      return (
                        <div
                          key={dayIdx}
                          className="w-3 h-3 rounded"
                          style={{ width: '11px', height: '11px' }}
                        />
                      );
                    }
                    return (
                      <div
                        key={cell.date}
                        className={`w-3 h-3 rounded cursor-pointer transition-all hover:scale-125 ${getIntensityColor(
                          cell.count,
                          maxCount
                        )}`}
                        style={{ width: '11px', height: '11px' }}
                        title={`${cell.date}: ${cell.count} 题`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 图例 */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-600">
          <span>较少</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded bg-slate-100" />
            <div className="w-3 h-3 rounded bg-green-200" />
            <div className="w-3 h-3 rounded bg-green-400" />
            <div className="w-3 h-3 rounded bg-green-600" />
            <div className="w-3 h-3 rounded bg-green-800" />
          </div>
          <span>较多</span>
          <span className="ml-4">最多: {maxCount} 题/天</span>
        </div>
      </div>
    </div>
  );
}

