/**
 * GraphTutor V3.0 - 学习报告PDF导出工具
 * 
 * 作用：生成用户学习报告的PDF文件
 * 关联页面：
 *   - pages/Analytics.jsx (学习分析页面)
 *   - components/LearningReport.jsx (学习报告组件)
 * 技术栈：
 *   - 浏览器打印API (window.print)
 *   - HTML模板生成
 *   - CSS打印样式
 */

/**
 * 生成学习报告PDF（使用浏览器打印）
 * @param {Object} reportData - 学习报告数据
 * @param {string} filename - 文件名
 */
export function exportLearningReportToPDF(reportData, filename = 'learning-report.pdf') {
  // 创建报告HTML内容
  const htmlContent = generateReportHTML(reportData);
  
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
 * 生成报告HTML内容
 */
function generateReportHTML(reportData) {
  const { overall, knowledgeNodes, bySubject, byDifficulty, byType, trend, user, reportTitle } = reportData;
  const title = reportTitle || '学习报告';
  const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>学习报告</title>
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
      max-width: 800px;
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
      grid-template-columns: repeat(4, 1fr);
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
    .progress-bar {
      background-color: #e5e7eb;
      border-radius: 10px;
      height: 20px;
      overflow: hidden;
      margin: 5px 0;
    }
    .progress-fill {
      background-color: #1d4ed8;
      height: 100%;
      transition: width 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    }
    .summary {
      background: #f0f9ff;
      border-left: 4px solid #0ea5e9;
      padding: 15px;
      margin: 20px 0;
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
    <h1>📊 ${title}</h1>
    <div class="meta">
      <div>用户：${user?.name || user?.email || '未知用户'}</div>
      <div>生成时间：${date}</div>
    </div>
  </div>

  ${generateOverallSection(overall)}
  ${generateKnowledgeNodesSection(knowledgeNodes)}
  ${generateSubjectSection(bySubject)}
  ${generateDifficultySection(byDifficulty)}
  ${generateTypeSection(byType)}
  ${generateTrendSection(trend)}
  ${generateSummarySection(reportData)}

  <div class="footer">
    <p>本报告由 GraphTutor V3.0 自动生成</p>
    <p>© ${new Date().getFullYear()} GraphTutor. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

function generateOverallSection(overall) {
  if (!overall) return '';
  
  return `
    <div class="section">
      <div class="section-title">总体统计</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">总答题数</div>
          <div class="stat-value">${overall.total || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">正确数</div>
          <div class="stat-value" style="color: #047857;">${overall.correct || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">错误数</div>
          <div class="stat-value" style="color: #dc2626;">${overall.wrong || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">正确率</div>
          <div class="stat-value" style="color: #7c3aed;">${(overall.accuracy || 0).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  `;
}

function generateKnowledgeNodesSection(knowledgeNodes) {
  if (!knowledgeNodes || knowledgeNodes.length === 0) return '';
  
  const topNodes = knowledgeNodes.slice(0, 10);
  
  return `
    <div class="section">
      <div class="section-title">知识点掌握度（前10项）</div>
      <table>
        <thead>
          <tr>
            <th>知识点</th>
            <th>总题数</th>
            <th>正确数</th>
            <th>正确率</th>
            <th>掌握度</th>
          </tr>
        </thead>
        <tbody>
          ${topNodes.map(node => `
            <tr>
              <td>${node.knowledgeNodeId || '未标注'}</td>
              <td>${node.total || 0}</td>
              <td>${node.correct || 0}</td>
              <td>${(node.accuracy || 0).toFixed(1)}%</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${node.accuracy || 0}%">
                    ${(node.accuracy || 0).toFixed(0)}%
                  </div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function generateSubjectSection(bySubject) {
  if (!bySubject || bySubject.length === 0) return '';
  
  return `
    <div class="section">
      <div class="section-title">学科分布</div>
      <table>
        <thead>
          <tr>
            <th>学科</th>
            <th>总题数</th>
            <th>正确数</th>
            <th>正确率</th>
          </tr>
        </thead>
        <tbody>
          ${bySubject.map(subject => `
            <tr>
              <td>${subject.subjectCode || '未分类'}</td>
              <td>${subject.total || 0}</td>
              <td>${subject.correct || 0}</td>
              <td>${(subject.accuracy || 0).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function generateDifficultySection(byDifficulty) {
  if (!byDifficulty || byDifficulty.length === 0) return '';
  
  return `
    <div class="section">
      <div class="section-title">难度分布</div>
      <table>
        <thead>
          <tr>
            <th>难度</th>
            <th>总题数</th>
            <th>正确数</th>
            <th>正确率</th>
          </tr>
        </thead>
        <tbody>
          ${byDifficulty.map(diff => `
            <tr>
              <td>难度 ${diff.difficulty}</td>
              <td>${diff.total || 0}</td>
              <td>${diff.correct || 0}</td>
              <td>${(diff.accuracy || 0).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function generateTypeSection(byType) {
  if (!byType || byType.length === 0) return '';
  
  const typeNames = {
    single: '单选题',
    multiple: '多选题',
    judge: '判断题',
    fill: '填空题',
    short: '简答题',
  };
  
  return `
    <div class="section">
      <div class="section-title">题型分布</div>
      <table>
        <thead>
          <tr>
            <th>题型</th>
            <th>总题数</th>
            <th>正确数</th>
            <th>正确率</th>
          </tr>
        </thead>
        <tbody>
          ${byType.map(type => `
            <tr>
              <td>${typeNames[type.type] || type.type}</td>
              <td>${type.total || 0}</td>
              <td>${type.correct || 0}</td>
              <td>${(type.accuracy || 0).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function generateTrendSection(trend) {
  if (!trend || trend.length === 0) return '';
  
  const recentTrend = trend.slice(-7); // 最近7天
  
  return `
    <div class="section">
      <div class="section-title">学习趋势（最近7天）</div>
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>答题数</th>
            <th>正确数</th>
            <th>正确率</th>
          </tr>
        </thead>
        <tbody>
          ${recentTrend.map(item => `
            <tr>
              <td>${item.date || item.day || ''}</td>
              <td>${item.total || 0}</td>
              <td>${item.correct || 0}</td>
              <td>${(item.accuracy || 0).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function generateSummarySection(reportData) {
  const { overall, knowledgeNodes } = reportData;
  
  if (!overall) return '';
  
  const weakNodes = (knowledgeNodes || [])
    .filter(n => n.accuracy < 60)
    .slice(0, 5)
    .map(n => n.knowledgeNodeId || '未标注')
    .join('、');
  
  const strongNodes = (knowledgeNodes || [])
    .filter(n => n.accuracy >= 80)
    .slice(0, 5)
    .map(n => n.knowledgeNodeId || '未标注')
    .join('、');
  
  return `
    <div class="section">
      <div class="section-title">学习总结</div>
      <div class="summary">
        <h3>学习概况</h3>
        <p>在本次统计期间，你共完成了 <strong>${overall.total || 0}</strong> 道题目，
        其中正确 <strong>${overall.correct || 0}</strong> 道，错误 <strong>${overall.wrong || 0}</strong> 道，
        整体正确率为 <strong>${(overall.accuracy || 0).toFixed(1)}%</strong>。</p>
        
        ${weakNodes ? `
          <h3>需要加强的知识点</h3>
          <p>以下知识点正确率较低，建议重点复习：${weakNodes}</p>
        ` : ''}
        
        ${strongNodes ? `
          <h3>掌握较好的知识点</h3>
          <p>以下知识点掌握较好，继续保持：${strongNodes}</p>
        ` : ''}
        
        <h3>学习建议</h3>
        <ul>
          <li>继续保持每日学习的习惯，坚持就是胜利</li>
          <li>针对薄弱知识点，可以增加专项练习</li>
          <li>定期复习错题，巩固已学知识</li>
          <li>合理规划学习时间，避免过度疲劳</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * 导出为PDF文件（使用下载方式）
 * 注意：这个方法需要服务端支持或使用jsPDF库
 */
export async function downloadLearningReportPDF(reportData, filename = 'learning-report.pdf') {
  // 如果浏览器支持，使用打印方式
  if (window.print) {
    exportLearningReportToPDF(reportData, filename);
    return;
  }
  
  // 否则提示用户
  alert('您的浏览器不支持PDF导出，请使用打印功能（Ctrl+P）保存为PDF');
}

