/**
 * 批量重命名MD文件为中文名并更新所有引用
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 文件重命名映射（只重命名根目录下的文件）
const fileMap = {
  'README_DEPLOY.md': '部署说明.md',
  'PRE_DEPLOY_CHECKLIST.md': '部署前检查清单.md',
  'DEPLOY.md': '快速部署指南.md',
  'CONTRIBUTING.md': '贡献指南.md',
  'SECURITY.md': '安全策略.md',
  'CODE_OF_CONDUCT.md': '行为准则.md',
  'BEAUTIFICATION_AND_TESTING.md': '美化与测试.md',
  'PROJECT_CHECKLIST.md': '项目检查清单.md',
};

/**
 * 递归查找所有MD文件
 */
function findMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // 跳过node_modules、.git、md文件存放等目录
    if (file === 'node_modules' || file === '.git' || file === 'dist' || 
        file === 'build' || file === 'md文件存放' || file === 'tools') {
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
 * 转义正则表达式特殊字符
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    
    // 匹配各种链接格式
    const patterns = [
      // [文本](文件名.md)
      new RegExp(`\\[([^\\]]+)\\]\\(${escapeRegex(oldName)}\\)`, 'g'),
      // [文本](文件名) (无扩展名)
      new RegExp(`\\[([^\\]]+)\\]\\(${escapeRegex(oldName.replace('.md', ''))}\\)`, 'g'),
      // 直接文件名引用
      new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g'),
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        if (pattern.source.includes('\\[')) {
          // 链接格式，保持链接结构
          content = content.replace(pattern, `[$1](${newName})`);
        } else {
          // 直接文件名引用
          content = content.replace(pattern, newName);
        }
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
 * 重命名文件
 */
function renameFiles() {
  console.log('开始重命名文件...\n');
  
  Object.keys(fileMap).forEach(oldName => {
    const newName = fileMap[oldName];
    const oldPath = path.join(rootDir, oldName);
    const newPath = path.join(rootDir, newName);
    
    if (fs.existsSync(oldPath)) {
      // 检查新文件是否已存在
      if (fs.existsSync(newPath)) {
        console.log(`⚠ 文件已存在，跳过: ${newName}`);
        // 删除旧文件
        fs.unlinkSync(oldPath);
        console.log(`✓ 删除旧文件: ${oldName}`);
      } else {
        fs.renameSync(oldPath, newPath);
        console.log(`✓ 重命名: ${oldName} -> ${newName}`);
      }
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
  console.log('\n✅ 所有文件已重命名为中文名！');
} catch (error) {
  console.error('❌ 错误:', error);
  process.exit(1);
}

