/**
 * GraphTutor V3.0 - 学习计划生成器组件
 * 
 * 功能：生成个性化学习计划
 */

import { useState, useEffect } from 'react';
import { generateStudyPlan, exportPlanAsText } from '../utils/studyPlanGenerator';
import { exportLearningReportToPDF } from '../utils/pdfExport';

export default function StudyPlanGenerator({ data, onPlanGenerated }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableTime, setAvailableTime] = useState({
    weekdays: 60,
    weekends: 120,
  });

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const generatedPlan = generateStudyPlan({
        ...data,
        availableTime,
      });
      setPlan(generatedPlan);
      if (onPlanGenerated) {
        onPlanGenerated(generatedPlan);
      }
    } catch (err) {
      console.error('生成计划失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportText = () => {
    if (!plan) return;
    const text = exportPlanAsText(plan);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `学习计划_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!plan) return;
    const html = generatePlanHTML(plan);
    exportLearningReportToPDF({
      title: '学习计划',
      content: html,
    });
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">📅 学习计划生成器</h2>
        <p className="text-slate-600 dark:text-slate-400">
          根据你的学习目标和历史数据，生成个性化学习计划
        </p>
      </div>

      {/* 可用时间设置 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">⏰ 设置可用时间</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">工作日（分钟）</label>
            <input
              type="number"
              value={availableTime.weekdays}
              onChange={(e) => setAvailableTime({
                ...availableTime,
                weekdays: parseInt(e.target.value) || 60,
              })}
              className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">周末（分钟）</label>
            <input
              type="number"
              value={availableTime.weekends}
              onChange={(e) => setAvailableTime({
                ...availableTime,
                weekends: parseInt(e.target.value) || 120,
              })}
              className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              min="0"
            />
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '生成中...' : '生成学习计划'}
        </button>
      </div>

      {/* 生成的计划 */}
      {plan && (
        <>
          {/* 周计划总结 */}
          <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">📊 周计划总结</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleExportText}
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 text-sm"
                >
                  📄 导出文本
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  📄 导出PDF
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {plan.weeklySummary.totalQuestions}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">总题数</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatDuration(plan.weeklySummary.totalDuration)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">总时长</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {plan.weeklySummary.studyDays}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">学习天数</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {plan.weeklySummary.avgDaily.toFixed(1)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">平均每日</div>
              </div>
            </div>
          </div>

          {/* 每日计划 */}
          <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4">📅 每日计划</h3>
            <div className="space-y-4">
              {plan.dailyPlans.map((daily, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border dark:border-slate-600"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {daily.date} ({daily.dayOfWeek})
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        可用时间：{formatDuration(daily.timeAvailable)}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      预计时长：{formatDuration(daily.estimatedDuration)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {daily.tasks.map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.priority === 'high' 
                              ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                              : task.priority === 'medium'
                              ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                              : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          }`}>
                            {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                          </span>
                          <span className="text-slate-900 dark:text-slate-100">{task.name}</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {task.count}题 (约{formatDuration(task.estimatedTime)})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 建议 */}
          {plan.recommendations.length > 0 && (
            <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
              <h3 className="text-lg font-bold mb-4">💡 计划建议</h3>
              <div className="space-y-3">
                {plan.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      rec.type === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : rec.type === 'warning'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div className="font-semibold mb-1">{rec.title}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{rec.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}小时${mins}分钟`;
}

function generatePlanHTML(plan) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h1 style="text-align: center; margin-bottom: 30px;">学习计划</h1>
      <p style="text-align: center; color: #666; margin-bottom: 30px;">
        生成时间：${new Date(plan.generatedAt).toLocaleString('zh-CN')}
      </p>
      
      <h2>周计划总结</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">总题数</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${plan.weeklySummary.totalQuestions}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">总时长</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${formatDuration(plan.weeklySummary.totalDuration)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">学习天数</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${plan.weeklySummary.studyDays}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">平均每日</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${plan.weeklySummary.avgDaily.toFixed(1)}题</td>
        </tr>
      </table>
      
      <h2>每日计划</h2>
      ${plan.dailyPlans.map((daily, index) => `
        <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-left: 4px solid #007bff;">
          <h3>${index + 1}. ${daily.date} (${daily.dayOfWeek})</h3>
          <p>可用时间：${formatDuration(daily.timeAvailable)} | 预计时长：${formatDuration(daily.estimatedDuration)}</p>
          <ul>
            ${daily.tasks.map(task => `
              <li>${task.name}：${task.count}题 (约${formatDuration(task.estimatedTime)})</li>
            `).join('')}
          </ul>
        </div>
      `).join('')}
      
      ${plan.recommendations.length > 0 ? `
        <h2>建议</h2>
        ${plan.recommendations.map(rec => `
          <div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-left: 4px solid #007bff;">
            <strong>${rec.title}</strong>
            <p>${rec.content}</p>
          </div>
        `).join('')}
      ` : ''}
    </div>
  `;
}

