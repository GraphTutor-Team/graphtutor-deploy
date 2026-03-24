/**
 * GraphTutor V3.0 - 系统统计报表PDF导出工具
 * 
 * 作用：生成系统统计报表的PDF文件
 * 关联页面：
 *   - pages/admin/Reports.jsx (统计报表页面)
 * 技术栈：
 *   - 浏览器打印API (window.print)
 *   - HTML模板生成
 *   - CSS打印样式
 */

/**
 * 导出系统统计报表为PDF
 * @param {Object} reportData - 系统统计报表数据
 * @param {string} filename - 文件名
 */
export function exportSystemReportToPDF(reportData, filename = 'system-report.pdf') {
  // 创建报表HTML内容
  const htmlContent = generateSystemReportHTML(reportData);
  
  // 创建新窗口并打印
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // 等待内容加载后触发打印
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

/**
 * 生成系统统计报表HTML内容
 */
function generateSystemReportHTML(reportData) {
  const { metadata, summary, periodStats, study, userGrowth } = reportData;
  const date = new Date(metadata?.generatedAt || Date.now()).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const reportTypeMap = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报',
    custom: '自定义报表',
  };

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>系统统计报表</title>
  <style>
    @media print {
      @page {
        margin: 2cm;
        size: A4;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
    body {
      font-family: 'Microsoft YaHei', 'SimSun', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1d4ed8;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1d4ed8;
      margin: 0;
      font-size: 28px;
    }
    .header .meta {
      color: #666;
      margin-top: 10px;
      font-size: 14px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #1d4ed8;
      border-left: 4px solid #1d4ed8;
      padding-left: 10px;
      margin-bottom: 15px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #1d4ed8;
      margin: 10px 0;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #1d4ed8;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 系统统计报表</h1>
    <div class="meta">
      <div>报表类型：${reportTypeMap[metadata?.type] || metadata?.type || '未知'}</div>
      <div>生成时间：${date}</div>
    </div>
  </div>

  ${generateSummarySection(summary)}
  ${generatePeriodStatsSection(periodStats)}
  ${generateStudyStatsSection(study)}
  ${generateUserGrowthSection(userGrowth)}

  <div class="footer">
    <p>本报表由 GraphTutor V3.0 自动生成</p>
    <p>© ${new Date().getFullYear()} GraphTutor. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

function generateSummarySection(summary) {
  if (!summary) return '';
  
  return `
    <div class="section">
      <div class="section-title">摘要统计</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">总用户数</div>
          <div class="stat-value">${summary.totalUsers || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">总题目数</div>
          <div class="stat-value" style="color: #047857;">${summary.totalQuestions || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">总题库数</div>
          <div class="stat-value" style="color: #7c3aed;">${summary.totalBanks || 0}</div>
        </div>
      </div>
      ${summary.userRoles ? `
        <table>
          <thead>
            <tr>
              <th>用户角色</th>
              <th>数量</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>管理员</td>
              <td>${summary.userRoles.admin || 0}</td>
            </tr>
            <tr>
              <td>出题负责人</td>
              <td>${summary.userRoles.questionManager || 0}</td>
            </tr>
            <tr>
              <td>学生</td>
              <td>${summary.userRoles.student || 0}</td>
            </tr>
          </tbody>
        </table>
      ` : ''}
    </div>
  `;
}

function generatePeriodStatsSection(periodStats) {
  if (!periodStats) return '';
  
  return `
    <div class="section">
      <div class="section-title">期间统计</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">新增用户</div>
          <div class="stat-value">${periodStats.newUsers || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">活跃用户</div>
          <div class="stat-value" style="color: #047857;">${periodStats.activeUsers || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">新增题目</div>
          <div class="stat-value" style="color: #7c3aed;">${periodStats.newQuestions || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">新增题库</div>
          <div class="stat-value">${periodStats.newBanks || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">学习记录</div>
          <div class="stat-value" style="color: #047857;">${periodStats.totalRecords || 0}</div>
        </div>
      </div>
    </div>
  `;
}

function generateStudyStatsSection(study) {
  if (!study) return '';
  
  return `
    <div class="section">
      <div class="section-title">学习统计</div>
      <table>
        <thead>
          <tr>
            <th>指标</th>
            <th>数值</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>总答题数</td>
            <td>${study.totalAnswered || 0}</td>
          </tr>
          <tr>
            <td>总正确数</td>
            <td style="color: #047857;">${study.totalCorrect || 0}</td>
          </tr>
          <tr>
            <td>总错误数</td>
            <td style="color: #dc2626;">${study.totalWrong || 0}</td>
          </tr>
          <tr>
            <td>正确率</td>
            <td>${(parseFloat(study.accuracy || 0) * 100).toFixed(2)}%</td>
          </tr>
          <tr>
            <td>活跃用户数</td>
            <td>${study.activeUsers || 0}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generateUserGrowthSection(userGrowth) {
  if (!userGrowth || !userGrowth.length) return '';
  
  return `
    <div class="section">
      <div class="section-title">用户增长趋势</div>
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>新增用户</th>
          </tr>
        </thead>
        <tbody>
          ${userGrowth.slice(0, 30).map(item => `
            <tr>
              <td>${item.date || item.day || ''}</td>
              <td>${item.count || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

