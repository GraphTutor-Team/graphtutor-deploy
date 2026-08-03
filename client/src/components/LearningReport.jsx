/**
 * GraphTutor V3.0 - 学习报告组件
 * 
 * 功能：显示详细的学习报告
 */

import { useState, useEffect } from 'react';
import { generateLearningReport } from '../utils/learningReport';
import { exportLearningReportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';

export default function LearningReport({ data }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data) {
      try {
        const reportData = generateLearningReport(data);
        setReport(reportData);
      } catch (err) {
        console.error('生成报告失败:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [data]);

  const handleExportPDF = () => {
    if (!report) return;
    
    const html = generateReportHTML(report);
    exportLearningReportToPDF({
      title: '学习报告',
      content: html,
    });
  };

  const handleExportExcel = () => {
    if (!report) return;
    
    const excelData = [
      ['学习报告', ''],
      ['生成时间', report.generatedAt],
      [''],
      ['总体统计', ''],
      ['总题数', report.overview.totalQuestions],
      ['正确数', report.overview.totalCorrect],
      ['错误数', report.overview.totalWrong],
      ['正确率', report.overview.overallAccuracy],
      ['总学习时长', report.overview.totalStudyTime],
      ['平均每日时长', report.overview.avgDailyTime],
      ['学习天数', report.overview.studyDays],
      ['学习频率', report.overview.studyFrequency],
      [''],
      ['知识点分析', ''],
      ['总知识点数', report.knowledge.totalNodes],
      ['掌握知识点', report.knowledge.masteredNodes],
      ['薄弱知识点', report.knowledge.weakNodes],
      ['掌握率', report.knowledge.masteryRate],
    ];
    
    exportToExcel(excelData, '学习报告');
  };

  if (loading || !report) {
    return (
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="text-center text-slate-500">生成报告中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      {/* 报告头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">📊 学习报告</h2>
          <p className="text-slate-600 dark:text-slate-400">
            生成时间：{report.generatedAt}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            📄 导出PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            📊 导出Excel
          </button>
        </div>
      </div>

      {/* 总体统计 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">📈 总体统计</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {report.overview.totalQuestions}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">总题数</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {report.overview.overallAccuracy}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">正确率</div>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-purple-400">
              {report.overview.totalStudyTime}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">总时长</div>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {report.overview.studyDays}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">学习天数</div>
          </div>
        </div>
      </div>

      {/* 知识点分析 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">📚 知识点分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">掌握情况</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>总知识点数</span>
                <span className="font-semibold">{report.knowledge.totalNodes}</span>
              </div>
              <div className="flex justify-between">
                <span>已掌握</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {report.knowledge.masteredNodes}
                </span>
              </div>
              <div className="flex justify-between">
                <span>薄弱知识点</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {report.knowledge.weakNodes}
                </span>
              </div>
              <div className="flex justify-between">
                <span>掌握率</span>
                <span className="font-semibold">{report.knowledge.masteryRate}</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">最佳表现知识点</div>
            <div className="space-y-2">
              {report.knowledge.topNodes.map((node, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{node.name}</span>
                  <span className="font-semibold">{node.accuracy}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 错题分析 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">❌ 错题分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {report.wrongQuestions.total}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">总错题数</div>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {report.wrongQuestions.recent}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">最近7天错题</div>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              建议：及时复习错题，使用智能复习功能
            </div>
          </div>
        </div>
      </div>

      {/* 学习习惯 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">⏰ 学习习惯</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">最佳学习时间</div>
            <div className="font-semibold">{report.habits.bestStudyTime}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">学习频率</div>
            <div className="font-semibold">{report.habits.studyFrequency}%</div>
          </div>
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">学习一致性</div>
            <div className="font-semibold capitalize">{report.habits.consistency}</div>
          </div>
        </div>
      </div>

      {/* 学习建议 */}
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
    </div>
  );
}

/**
 * 生成报告HTML（用于PDF导出）
 */
function generateReportHTML(report) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h1 style="text-align: center; margin-bottom: 30px;">学习报告</h1>
      <p style="text-align: center; color: #666; margin-bottom: 30px;">生成时间：${report.generatedAt}</p>
      
      <h2>总体统计</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">总题数</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.overview.totalQuestions}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">正确率</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.overview.overallAccuracy}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">总学习时长</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.overview.totalStudyTime}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">学习天数</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${report.overview.studyDays}</td>
        </tr>
      </table>
      
      <h2>知识点分析</h2>
      <p>总知识点数：${report.knowledge.totalNodes}</p>
      <p>已掌握：${report.knowledge.masteredNodes}</p>
      <p>薄弱知识点：${report.knowledge.weakNodes}</p>
      <p>掌握率：${report.knowledge.masteryRate}</p>
      
      <h2>错题分析</h2>
      <p>总错题数：${report.wrongQuestions.total}</p>
      <p>最近7天错题：${report.wrongQuestions.recent}</p>
      
      <h2>学习建议</h2>
      ${report.recommendations.map(rec => `
        <div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-left: 4px solid #007bff;">
          <strong>${rec.title}</strong>
          <p>${rec.content}</p>
        </div>
      `).join('')}
    </div>
  `;
}
