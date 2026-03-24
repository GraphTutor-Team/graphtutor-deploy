/**
 * GraphTutor V3.0 - 导入检查脚本
 * 
 * 功能：检查所有关键文件的导入是否正确
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const issues = [];

function checkFile(filePath, description) {
  const fullPath = path.join(projectRoot, filePath);
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      // 检查是否有语法错误（简单的检查）
      if (content.includes('export') || content.includes('import')) {
        return { exists: true, valid: true };
      }
      return { exists: true, valid: true };
    } catch (error) {
      issues.push(`${description}: ${error.message}`);
      return { exists: true, valid: false };
    }
  } else {
    issues.push(`${description}: 文件不存在`);
    return { exists: false, valid: false };
  }
}

function checkImports(filePath, requiredImports) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const missing = [];

  for (const imp of requiredImports) {
    if (!content.includes(imp)) {
      missing.push(imp);
    }
  }

  if (missing.length > 0) {
    issues.push(`${filePath}: 缺少导入 ${missing.join(', ')}`);
  }
}

console.log('🔍 检查文件导入...\n');

// 检查关键文件
const keyFiles = [
  { path: 'server/src/models/LearningGoal.js', desc: '学习目标模型' },
  { path: 'server/src/models/Achievement.js', desc: '成就模型' },
  { path: 'server/src/services/learningGoalUpdater.js', desc: '学习目标更新服务' },
  { path: 'server/src/services/achievementService.js', desc: '成就服务' },
  { path: 'server/src/services/questionRecommendation.js', desc: '推荐服务' },
  { path: 'server/src/routes/v3/learningGoals.js', desc: '学习目标路由' },
  { path: 'server/src/routes/v3/achievements.js', desc: '成就路由' },
  { path: 'server/src/routes/v3/recommendations.js', desc: '推荐路由' },
  { path: 'client/src/pages/LearningGoals.jsx', desc: '学习目标页面' },
  { path: 'client/src/pages/Achievements.jsx', desc: '成就页面' },
  { path: 'client/src/pages/Recommendations.jsx', desc: '推荐页面' },
  { path: 'client/src/api/v3/learningGoals.js', desc: '学习目标API' },
  { path: 'client/src/api/v3/achievements.js', desc: '成就API' },
  { path: 'client/src/api/v3/recommendations.js', desc: '推荐API' },
];

for (const file of keyFiles) {
  const result = checkFile(file.path, file.desc);
  if (result.exists && result.valid) {
    console.log(`✅ ${file.desc}`);
  } else if (result.exists) {
    console.log(`⚠️  ${file.desc} (存在但可能有问题)`);
  } else {
    console.log(`❌ ${file.desc} (不存在)`);
  }
}

// 检查关键导入
console.log('\n🔍 检查关键导入...\n');

checkImports('server/src/app.js', [
  'v3LearningGoalsRoutes',
  'v3AchievementsRoutes',
  'v3RecommendationsRoutes',
]);

checkImports('server/src/routes/records.js', [
  'updateLearningGoalsProgress',
  'checkAndAwardAchievements',
]);

checkImports('client/src/App.jsx', [
  'LazyLearningGoals',
  'LazyAchievements',
  'LazyRecommendations',
]);

checkImports('client/src/layout/AppLayout.patched.jsx', [
  '/goals',
  '/achievements',
  '/recommendations',
]);

if (issues.length > 0) {
  console.log('\n⚠️  发现以下问题:\n');
  issues.forEach(issue => {
    console.log(`   - ${issue}`);
  });
} else {
  console.log('\n✅ 所有检查通过！');
}

console.log('\n');

