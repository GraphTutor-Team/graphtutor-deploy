/**
 * GraphTutor V3.0 - 笔记PDF导出工具
 * 
 * 作用：生成学习笔记的PDF文件
 * 关联页面：
 *   - pages/Notes.jsx (笔记管理页面)
 *   - pages/NoteShare.jsx (笔记分享页面)
 * 技术栈：
 *   - 浏览器打印API (window.print)
 *   - HTML模板生成
 *   - CSS打印样式
 *   - Markdown渲染（转换为HTML）
 */

/**
 * 导出笔记为PDF
 * @param {Object} note - 笔记数据
 * @param {string} filename - 文件名
 */
export function exportNoteToPDF(note, filename = 'note.pdf') {
  if (!note) {
    console.error('笔记数据为空');
    return;
  }

  // 创建笔记HTML内容
  const htmlContent = generateNoteHTML(note);
  
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
 * 生成笔记HTML内容
 * @param {Object} note - 笔记数据
 * @returns {string} HTML内容
 */
function generateNoteHTML(note) {
  const {
    title = '未命名笔记',
    content = '',
    type = 'question',
    tags = [],
    isPublic = false,
    createdAt,
    images = [],
    attachments = [],
    userId,
  } = note;

  const date = createdAt 
    ? new Date(createdAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('zh-CN');

  const authorName = userId?.name || userId?.email || '未知用户';
  const typeLabel = type === 'question' ? '题目笔记' : '知识点笔记';
  
  // 将Markdown转换为HTML（简单版本）
  const htmlContent = markdownToHTML(content);

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
      line-height: 1.8;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1d4ed8;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1d4ed8;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header .meta {
      color: #666;
      font-size: 14px;
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .header .meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-primary {
      background-color: #3b82f6;
      color: white;
    }
    .badge-success {
      background-color: #10b981;
      color: white;
    }
    .badge-secondary {
      background-color: #6b7280;
      color: white;
    }
    .content {
      margin: 30px 0;
      font-size: 16px;
    }
    .content h1, .content h2, .content h3 {
      color: #1d4ed8;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    .content h1 {
      font-size: 24px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    .content h2 {
      font-size: 20px;
    }
    .content h3 {
      font-size: 18px;
    }
    .content p {
      margin: 15px 0;
    }
    .content ul, .content ol {
      margin: 15px 0;
      padding-left: 30px;
    }
    .content li {
      margin: 8px 0;
    }
    .content code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    .content pre {
      background-color: #1f2937;
      color: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 15px 0;
    }
    .content pre code {
      background-color: transparent;
      color: inherit;
      padding: 0;
    }
    .content blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 15px;
      margin: 15px 0;
      color: #6b7280;
      font-style: italic;
    }
    .content img {
      max-width: 100%;
      height: auto;
      margin: 15px 0;
      border-radius: 8px;
    }
    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .content table th,
    .content table td {
      border: 1px solid #e5e7eb;
      padding: 10px;
      text-align: left;
    }
    .content table th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .tags {
      margin: 20px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tag {
      padding: 4px 12px;
      background-color: #e0e7ff;
      color: #3730a3;
      border-radius: 12px;
      font-size: 12px;
    }
    .images {
      margin: 20px 0;
    }
    .image-item {
      margin: 15px 0;
      text-align: center;
    }
    .image-item img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    .attachments {
      margin: 20px 0;
      padding: 15px;
      background-color: #f9fafb;
      border-radius: 8px;
    }
    .attachments h3 {
      margin-top: 0;
      font-size: 16px;
    }
    .attachment-item {
      padding: 8px;
      margin: 5px 0;
      background-color: white;
      border-radius: 4px;
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
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      <div class="meta-item">
        <span class="badge ${type === 'question' ? 'badge-primary' : 'badge-success'}">
          ${typeLabel}
        </span>
      </div>
      ${isPublic ? `
        <div class="meta-item">
          <span class="badge badge-secondary">公开笔记</span>
        </div>
      ` : ''}
      <div class="meta-item">
        <span>作者：${escapeHtml(authorName)}</span>
      </div>
      <div class="meta-item">
        <span>创建时间：${date}</span>
      </div>
    </div>
  </div>

  <div class="content">
    ${htmlContent}
  </div>

  ${tags.length > 0 ? `
    <div class="tags">
      ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
    </div>
  ` : ''}

  ${images.length > 0 ? `
    <div class="images">
      <h3>图片</h3>
      ${images.map(img => `
        <div class="image-item">
          <img src="${img.url || img}" alt="${img.alt || '笔记图片'}" />
          ${img.caption ? `<p style="text-align: center; color: #666; font-size: 12px;">${escapeHtml(img.caption)}</p>` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${attachments.length > 0 ? `
    <div class="attachments">
      <h3>附件</h3>
      ${attachments.map(att => `
        <div class="attachment-item">
          <strong>${escapeHtml(att.name || att.filename || '附件')}</strong>
          ${att.size ? `<span style="color: #666; margin-left: 10px;">(${formatFileSize(att.size)})</span>` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div class="footer">
    <p>本笔记由 GraphTutor V3.0 导出</p>
    <p>© ${new Date().getFullYear()} GraphTutor. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * 将Markdown转换为HTML（简化版本）
 * @param {string} markdown - Markdown文本
 * @returns {string} HTML文本
 */
function markdownToHTML(markdown) {
  if (!markdown) return '<p>（无内容）</p>';
  
  let html = markdown;
  
  // 代码块（先处理，避免被其他规则影响）
  html = html.replace(/```([\s\S]*?)```/gim, (match, code) => {
    return '<pre><code>' + escapeHtml(code.trim()) + '</code></pre>';
  });
  
  // 行内代码
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  
  // 标题
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // 粗体和斜体
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  
  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');
  
  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />');
  
  // 引用
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // 无序列表
  const lines = html.split('\n');
  let inList = false;
  let result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^[\*\-\+] /.test(line)) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push('<li>' + line.replace(/^[\*\-\+] /, '') + '</li>');
    } else if (/^\d+\. /.test(line)) {
      if (!inList) {
        result.push('<ol>');
        inList = true;
      }
      result.push('<li>' + line.replace(/^\d+\. /, '') + '</li>');
    } else {
      if (inList) {
        result.push(inList ? '</ul>' : '</ol>');
        inList = false;
      }
      if (line.trim()) {
        result.push(line);
      }
    }
  }
  if (inList) {
    result.push('</ul>');
  }
  
  html = result.join('\n');
  
  // 换行处理
  html = html.replace(/\n\n/gim, '</p><p>');
  html = html.replace(/\n/gim, '<br>');
  
  // 包装段落（如果还没有被包装）
  if (!html.includes('<p>') && !html.includes('<h') && !html.includes('<ul') && !html.includes('<ol')) {
    html = '<p>' + html + '</p>';
  } else if (!html.startsWith('<')) {
    html = '<p>' + html;
  }
  if (!html.endsWith('>') && !html.endsWith('</p>') && !html.endsWith('</ul>') && !html.endsWith('</ol>')) {
    html = html + '</p>';
  }
  
  return html;
}

/**
 * 转义HTML特殊字符
 * @param {string} text - 原始文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

