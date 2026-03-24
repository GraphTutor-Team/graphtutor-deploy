/**
 * GraphTutor V3.0 - 自动报告生成器组件
 * 
 * 功能：自动生成和导出学习报告
 */

import { useState } from 'react';
import { generateLearningReport, exportReportAsText } from '../utils/autoReport';
import { exportLearningReportToPDF } from '../utils/pdfExport';

export default function AutoReportGenerator({ data }) {
  const [period, setPeriod] = useState('week');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    try {
      const generatedReport = generateLearningReport(data, period);
      setReport(generatedReport);
    } catch (err) {
      console.error('生成报告失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportText = () => {
    if (!report) return;
    const text = exportReportAsText(report);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `学习报告_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!report) return;
    const html = generateReportHTML(report);
    exportLearningReportToPDF({
      title: `学习报告（${report.summary.periodLabel}）`,
      content: html,
    });
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">📄 自动报告生成器</h2>
        <p className="text-slate-600 dark:text-slate-400">
          自动生成学习报告，全面了解学习情况
        </p>
      </div>

      {/* 报告设置 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium">报告周期：</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="all">全部</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '生成中...' : '生成报告'}
          </button>
        </div>
      </div>

      {/* 生成的报告 */}
      {report && (
        <>
          {/* 摘要 */}
          <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">报告摘要</h3>
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
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">总题数</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {report.summary.totalQuestions}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">正确率</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {report.summary.accuracy}%
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">学习天数</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {report.summary.studyDays}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">已掌握知识点</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {report.statistics.masteredNodes}
                </div>
              </div>
            </div>
          </div>

          {/* 目标完成情况 */}
          {report.goals.total > 0 && (
            <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
              <h3 className="text-lg font-bold mb-4">目标完成情况</h3>
              <div className="space-y-3">
                {report.goals.details.map((goal, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {goal.title}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {goal.progress}/{goal.target} ({goal.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${goal.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 建议 */}
          {report.recommendations.length > 0 && (
            <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
              <h3 className="text-lg font-bold mb-4">💡 学习建议</h3>
              <div className="space-y-3">
                {report.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      rec.priority === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : rec.priority === 'medium'
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

function generateReportHTML(report) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h1 style="text-align: center; margin-bottom: 30px;">学习报告</h1>
      <p style="text-align: center; color: #666; margin-bottom: 30px;">
        生成时间：${new Date(report.generatedAt).toLocaleString('zh-CN')} | 
        报告周期：${report.summary.periodLabel}
      </p>
      
      <h2>一、学习摘要</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">总题数</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.summary.totalQuestions}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">正确题数</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.summary.correctQuestions}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">正确率</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.summary.accuracy}%</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">学习天数</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.summary.studyDays}天</td>
        </tr>
      </table>
      
      <h2>二、统计信息</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">已掌握知识点</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.statistics.masteredNodes}个</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">薄弱知识点</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.statistics.weakNodes}个</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">错题总数</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.statistics.wrongQuestions}道</td>
        </tr>
      </table>
      
      ${report.recommendations.length > 0 ? `
        <h2>三、学习建议</h2>
        ${report.recommendations.map((rec, index) => `
          <div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-left: 4px solid #007bff;">
            <strong>${index + 1}. ${rec.title}</strong>
            <p>${rec.content}</p>
          </div>
        `).join('')}
      ` : ''}
    </div>
  `;
}

