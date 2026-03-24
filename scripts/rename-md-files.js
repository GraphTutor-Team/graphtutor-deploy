/**
 * 批量重命名MD文件为中文名并更新所有引用
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 文件重命名映射
const fileMap = {
  'FEATURES_COMPLETE.md': '完整功能文档.md',
  'TECHNICAL_DOCUMENTATION.md': '技术文档.md',
  'DATABASE_DESIGN.md': '数据库设计文档.md',
  'DEPLOYMENT_GUIDE.md': '部署指南.md',
  'DEVELOPMENT_GUIDE.md': '开发指南.md',
  'DOCUMENTATION_INDEX.md': '文档索引.md',
  'QUICK_START.md': '快速开始指南.md',
  'QUICK_START_V3.md': '快速开始指南V3.md',
  'SUBMISSION_CHECKLIST.md': '提交检查清单.md',
  'CHANGELOG_V3.0.md': '更新日志.md',
  'TEST_SUMMARY.md': '测试总结.md',
  'BEAUTIFICATION_AND_TESTING.md': '美化与测试.md',
};

// 反向映射（用于更新引用）
const reverseMap = {};
Object.keys(fileMap).forEach(oldName => {
  reverseMap[fileMap[oldName]] = oldName;
});

/**
 * 递归查找所有MD文件
 */
function findMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // 跳过node_modules和.git目录
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') {
      return;
    }
    
    if (stat.isDirectory()) {
      findMdFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * 更新文件中的链接引用
 */
function updateFileReferences(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  // 更新所有引用
  Object.keys(fileMap).forEach(oldName => {
    const newName = fileMap[oldName];
    const patterns = [
      new RegExp(`\\[([^\\]]+)\\]\\(${escapeRegex(oldName)}\\)`, 'g'),
      new RegExp(`\\[([^\\]]+)\\]\\(${escapeRegex(oldName.replace('.md', ''))}\\)`, 'g'),
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, `[$1](${newName})`);
        updated = true;
      }
    });
  });
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ 更新引用: ${path.relative(rootDir, filePath)}`);
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 重命名文件
 */
function renameFiles() {
  console.log('开始重命名文件...\n');
  
  Object.keys(fileMap).forEach(oldName => {
    const newName = fileMap[oldName];
    const oldPath = path.join(rootDir, oldName);
    const newPath = path.join(rootDir, newName);
    
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      console.log(`✓ 重命名: ${oldName} -> ${newName}`);
    } else {
      console.log(`✗ 文件不存在: ${oldName}`);
    }
  });
}

/**
 * 更新所有MD文件中的引用
 */
function updateAllReferences() {
  console.log('\n开始更新文件引用...\n');
  
  const mdFiles = findMdFiles(rootDir);
  
  mdFiles.forEach(filePath => {
    updateFileReferences(filePath);
  });
  
  console.log('\n完成！');
}

// 执行
try {
  renameFiles();
  updateAllReferences();
} catch (error) {
  console.error('错误:', error);
  process.exit(1);
}

