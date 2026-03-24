/**
 * GraphTutor V3.0 - Markdown导入工具
 * 
 * 功能：从Markdown文件导入笔记
 */

/**
 * 解析Markdown文件内容
 * @param {string} markdownContent - Markdown文件内容
 * @returns {Array} 解析后的笔记数组
 */
export function parseMarkdownToNotes(markdownContent) {
  const notes = [];
  const lines = markdownContent.split('\n');
  
  let currentNote = null;
  let currentContent = [];
  let inFrontMatter = false;
  let frontMatter = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测Front Matter (YAML格式)
    if (line.trim() === '---' && i === 0) {
      inFrontMatter = true;
      continue;
    }
    
    if (inFrontMatter) {
      if (line.trim() === '---') {
        inFrontMatter = false;
        continue;
      }
      
      // 解析YAML字段
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        frontMatter[key] = value.trim().replace(/^["']|["']$/g, '');
      }
      continue;
    }
    
    // 检测标题（# 开头）
    if (line.startsWith('# ')) {
      // 如果之前有笔记，保存它
      if (currentNote) {
        currentNote.content = currentContent.join('\n').trim();
        notes.push(currentNote);
      }
      
      // 创建新笔记
      const title = line.substring(2).trim();
      currentNote = {
        title: title,
        content: '',
        type: frontMatter.type || 'knowledge',
        tags: frontMatter.tags ? frontMatter.tags.split(',').map(t => t.trim()) : [],
        isPublic: frontMatter.isPublic === 'true' || frontMatter.isPublic === true,
        questionId: frontMatter.questionId || null,
        knowledgeNodeId: frontMatter.knowledgeNodeId || null,
      };
      
      currentContent = [];
      frontMatter = {};
      continue;
    }
    
    // 收集内容
    if (currentNote) {
      currentContent.push(line);
    }
  }
  
  // 保存最后一个笔记
  if (currentNote) {
    currentNote.content = currentContent.join('\n').trim();
    notes.push(currentNote);
  }
  
  // 如果没有检测到任何笔记，尝试将整个文件作为一个笔记
  if (notes.length === 0 && markdownContent.trim()) {
    // 尝试从文件名或第一行提取标题
    const firstLine = lines.find(l => l.trim());
    const title = firstLine?.startsWith('#') 
      ? firstLine.substring(1).trim() 
      : '导入的笔记';
    
    notes.push({
      title: title,
      content: markdownContent.trim(),
      type: 'knowledge',
      tags: [],
      isPublic: false,
    });
  }
  
  return notes;
}

/**
 * 从文件读取并解析Markdown
 * @param {File} file - Markdown文件
 * @returns {Promise<Array>} 解析后的笔记数组
 */
export async function importMarkdownFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const notes = parseMarkdownToNotes(content);
        resolve(notes);
      } catch (err) {
        reject(new Error('解析Markdown文件失败: ' + err.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * 批量导入多个Markdown文件
 * @param {FileList} files - 文件列表
 * @returns {Promise<Array>} 所有解析后的笔记数组
 */
export async function importMultipleMarkdownFiles(files) {
  const allNotes = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
      try {
        const notes = await importMarkdownFile(file);
        notes.forEach(note => {
          // 如果没有标题，使用文件名
          if (!note.title || note.title === '导入的笔记') {
            note.title = file.name.replace('.md', '');
          }
        });
        allNotes.push(...notes);
      } catch (err) {
        console.error(`导入文件 ${file.name} 失败:`, err);
      }
    }
  }
  
  return allNotes;
}

/**
 * 验证笔记数据
 * @param {Object} note - 笔记对象
 * @returns {Object} { valid: boolean, errors: Array }
 */
export function validateImportedNote(note) {
  const errors = [];
  
  if (!note.title || !note.title.trim()) {
    errors.push('笔记标题不能为空');
  }
  
  if (!note.content || !note.content.trim()) {
    errors.push('笔记内容不能为空');
  }
  
  if (note.title && note.title.length > 200) {
    errors.push('笔记标题不能超过200个字符');
  }
  
  if (note.content && note.content.length > 50000) {
    errors.push('笔记内容不能超过50000个字符');
  }
  
  if (note.type && !['question', 'knowledge'].includes(note.type)) {
    errors.push('笔记类型无效');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 批量验证笔记
 * @param {Array} notes - 笔记数组
 * @returns {Object} { valid: Array, invalid: Array }
 */
export function validateImportedNotes(notes) {
  const valid = [];
  const invalid = [];
  
  notes.forEach((note, index) => {
    const validation = validateImportedNote(note);
    if (validation.valid) {
      valid.push(note);
    } else {
      invalid.push({
        index,
        note,
        errors: validation.errors,
      });
    }
  });
  
  return { valid, invalid };
}

