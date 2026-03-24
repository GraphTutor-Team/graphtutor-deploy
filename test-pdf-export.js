/**
 * 测试PDF导出模块拆分后的导入是否正常
 * 运行方式：node test-pdf-export.js
 */

// 模拟浏览器环境
global.window = {
  open: () => ({
    document: {
      write: () => {},
      close: () => {},
    },
    onload: null,
    print: () => {},
  }),
  print: () => {},
};

// 测试ES模块导入（需要Node.js支持或使用构建工具）
console.log('测试PDF导出模块结构...\n');

const fs = require('fs');
const path = require('path');

// 检查文件是否存在
const filesToCheck = [
  'client/src/utils/pdfExport.js',
  'client/src/utils/pdfExport/index.js',
  'client/src/utils/pdfExport/learningReport.js',
  'client/src/utils/pdfExport/systemReport.js',
];

console.log('检查文件存在性:');
filesToCheck.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) {
    console.error(`    文件不存在！`);
  }
});

// 检查导出内容
console.log('\n检查导出内容:');
try {
  const pdfExportIndex = fs.readFileSync('client/src/utils/pdfExport/index.js', 'utf8');
  const pdfExportMain = fs.readFileSync('client/src/utils/pdfExport.js', 'utf8');
  
  // 检查index.js是否导出了正确的函数
  const expectedExports = [
    'exportLearningReportToPDF',
    'downloadLearningReportPDF',
    'exportSystemReportToPDF',
  ];
  
  expectedExports.forEach(exportName => {
    const inIndex = pdfExportIndex.includes(exportName);
    const inMain = pdfExportMain.includes(exportName);
    console.log(`  ${inIndex && inMain ? '✅' : '❌'} ${exportName}`);
    if (!inIndex) console.log(`    在 index.js 中未找到`);
    if (!inMain) console.log(`    在 pdfExport.js 中未找到`);
  });
  
  // 检查exportNoteToPDF
  const hasNoteExport = pdfExportMain.includes('exportNoteToPDF');
  console.log(`  ${hasNoteExport ? '✅' : '❌'} exportNoteToPDF (占位函数)`);
  
} catch (error) {
  console.error('读取文件时出错:', error.message);
}

// 检查使用该模块的文件
console.log('\n检查使用pdfExport的文件:');
const usageFiles = [
  'client/src/pages/admin/Reports.jsx',
  'client/src/pages/Analytics.jsx',
  'client/src/pages/Notes.jsx',
];

usageFiles.forEach(file => {
  const exists = fs.existsSync(file);
  if (exists) {
    const content = fs.readFileSync(file, 'utf8');
    const usesPdfExport = content.includes('pdfExport');
    console.log(`  ${usesPdfExport ? '✅' : '⚠️'} ${file}`);
    if (usesPdfExport) {
      // 检查导入路径
      const importMatch = content.match(/from\s+['"]([^'"]*pdfExport[^'"]*)['"]/);
      if (importMatch) {
        console.log(`    导入路径: ${importMatch[1]}`);
      }
    }
  } else {
    console.log(`  ⚠️ ${file} (文件不存在)`);
  }
});

console.log('\n✅ 结构检查完成！');
console.log('注意：实际功能测试需要在浏览器环境中进行。');

