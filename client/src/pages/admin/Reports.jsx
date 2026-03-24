/**
 * GraphTutor V3.0 - 统计报表页面
 * 
 * 作用：生成和查看系统统计报表，支持日报、周报、月报和自定义时间范围报表
 * 关联页面：
 *   - api/admin.js (报表生成API)
 *   - utils/excelExport.js (Excel导出工具)
 *   - utils/pdfExport.js (PDF导出工具)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - Excel导出 (exportToExcel)
 *   - PDF导出 (exportSystemReportToPDF)
 *   - 日期选择器
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import BackBar from '../../components/BackBar';
import { generateSystemReport } from '../../api/admin';
import { toast } from '../../utils/toast';
import Skeleton from '../../components/Skeleton';
import { exportToExcel } from '../../utils/excelExport';
import { exportSystemReportToPDF } from '../../utils/pdfExport';

export default function Reports() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [reportType, setReportType] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const reportData = await generateSystemReport({
        type: reportType,
        startDate: reportType === 'custom' ? startDate : undefined,
        endDate: reportType === 'custom' ? endDate : undefined,
      });
      setReport(reportData);
      toast.success('报表生成成功');
    } catch (err) {
      console.error('生成报表失败:', err);
      toast.error(err.message || '生成报表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = (reportData) => {
    try {
      const reportTypeMap = {
        daily: '日报',
        weekly: '周报',
        monthly: '月报',
        custom: '自定义报表',
      };
      const typeName = reportTypeMap[reportType] || '统计报表';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `系统${typeName}_${dateStr}.pdf`;
      
      exportSystemReportToPDF(reportData, filename);
      toast.success('PDF报表导出成功，请使用打印对话框保存为PDF');
    } catch (err) {
      console.error('导出PDF失败:', err);
      toast.error('导出PDF失败');
    }
  };

  const handleExportExcel = (reportData) => {
    try {
      const excelData = buildExcelData(reportData);
      exportToExcel(excelData, '系统统计报表', '报表', {
        columnWidths: [20, 30],
      });
      toast.success('Excel报表导出成功');
    } catch (err) {
      console.error('导出Excel失败:', err);
      toast.error('导出Excel失败');
    }
  };

  const buildExcelData = (reportData) => {
    const data = [];
    
    // 报表元信息
    data.push(['系统统计报表', '']);
    data.push(['生成时间', new Date(reportData.metadata?.generatedAt || Date.now()).toLocaleString('zh-CN')]);
    data.push(['报表类型', reportData.metadata?.type || '']);
    data.push(['']);
    
    // 摘要统计
    data.push(['摘要统计', '']);
    data.push(['总用户数', reportData.summary?.totalUsers || 0]);
    data.push(['总题目数', reportData.summary?.totalQuestions || 0]);
    data.push(['总题库数', reportData.summary?.totalBanks || 0]);
    data.push(['']);
    
    // 用户角色分布
    if (reportData.summary?.userRoles) {
      data.push(['用户角色分布', '']);
      data.push(['管理员', reportData.summary.userRoles.admin || 0]);
      data.push(['出题负责人', reportData.summary.userRoles.questionManager || 0]);
      data.push(['学生', reportData.summary.userRoles.student || 0]);
      data.push(['']);
    }
    
    // 期间统计
    if (reportData.periodStats) {
      data.push(['期间统计', '']);
      data.push(['新增用户', reportData.periodStats.newUsers || 0]);
      data.push(['活跃用户', reportData.periodStats.activeUsers || 0]);
      data.push(['新增题目', reportData.periodStats.newQuestions || 0]);
      data.push(['新增题库', reportData.periodStats.newBanks || 0]);
      data.push(['学习记录', reportData.periodStats.totalRecords || 0]);
      data.push(['']);
    }
    
    // 学习统计
    if (reportData.study) {
      data.push(['学习统计', '']);
      data.push(['总答题数', reportData.study.totalAnswered || 0]);
      data.push(['总正确数', reportData.study.totalCorrect || 0]);
      data.push(['总错误数', reportData.study.totalWrong || 0]);
      data.push(['正确率', `${(parseFloat(reportData.study.accuracy) * 100).toFixed(2)}%`]);
      data.push(['活跃用户数', reportData.study.activeUsers || 0]);
    }
    
    return data;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <BackBar title="统计报表" />
      
      {/* 报表配置 */}
      <div className="card mb-4">
        <h3 className="font-semibold mb-4">报表配置</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-2">报表类型</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="daily">日报</option>
              <option value="weekly">周报</option>
              <option value="monthly">月报</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          {reportType === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-2">开始日期</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-2">结束日期</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading || (reportType === 'custom' && (!startDate || !endDate))}
          >
            {loading ? '生成中...' : '生成报表'}
          </button>
        </div>
      </div>

      {/* 报表内容 */}
      {loading ? (
        <div className="card">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : report ? (
        <div className="space-y-4">
          {/* 报表摘要 */}
          <div className="card">
            <h3 className="font-semibold mb-4">报表摘要</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{report.summary?.totalUsers || 0}</div>
                <div className="text-sm text-blue-600 mt-1">总用户数</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{report.summary?.totalQuestions || 0}</div>
                <div className="text-sm text-green-600 mt-1">总题目数</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{report.summary?.totalBanks || 0}</div>
                <div className="text-sm text-purple-600 mt-1">总题库数</div>
              </div>
            </div>
          </div>

          {/* 期间统计 */}
          {report.periodStats && (
            <div className="card">
              <h3 className="font-semibold mb-4">期间统计</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold">{report.periodStats.newUsers || 0}</div>
                  <div className="text-xs text-slate-600 mt-1">新增用户</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold">{report.periodStats.activeUsers || 0}</div>
                  <div className="text-xs text-slate-600 mt-1">活跃用户</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold">{report.periodStats.newQuestions || 0}</div>
                  <div className="text-xs text-slate-600 mt-1">新增题目</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold">{report.periodStats.newBanks || 0}</div>
                  <div className="text-xs text-slate-600 mt-1">新增题库</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold">{report.periodStats.totalRecords || 0}</div>
                  <div className="text-xs text-slate-600 mt-1">学习记录</div>
                </div>
              </div>
            </div>
          )}

          {/* 导出按钮 */}
          <div className="card">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleExportPDF(report)}
              >
                导出PDF
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleExportExcel(report)}
              >
                导出Excel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="text-slate-500 text-center py-8">请选择报表类型并生成报表</p>
        </div>
      )}
    </div>
  );
}

