/**
 * GraphTutor V3.0 - 快速功能测试
 * 
 * 功能：快速检查关键文件和配置是否正确
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const results = {
  passed: [],
  failed: [],
};

function checkFile(filePath, description) {
  const fullPath = path.join(projectRoot, filePath);
  if (fs.existsSync(fullPath)) {
    results.passed.push(description);
    return true;
  } else {
    results.failed.push(`${description} (文件不存在: ${filePath})`);
    return false;
  }
}

function checkFileContent(filePath, searchText, description) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    results.failed.push(`${description} (文件不存在)`);
    return false;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.includes(searchText)) {
      results.passed.push(description);
      return true;
    } else {
      results.failed.push(`${description} (未找到: ${searchText})`);
      return false;
    }
  } catch (error) {
    results.failed.push(`${description} (读取失败: ${error.message})`);
    return false;
  }
}

console.log('🧪 GraphTutor V3.0 快速功能测试\n');
console.log('='.repeat(60));

// 检查后端文件
console.log('\n📦 检查后端文件...');
checkFile('server/src/models/LearningGoal.js', '学习目标模型');
checkFile('server/src/models/Achievement.js', '成就模型');
checkFile('server/src/services/learningGoalUpdater.js', '学习目标更新服务');
checkFile('server/src/services/achievementService.js', '成就服务');
checkFile('server/src/services/questionRecommendation.js', '推荐服务');
checkFile('server/src/routes/v3/learningGoals.js', '学习目标路由');
checkFile('server/src/routes/v3/achievements.js', '成就路由');
checkFile('server/src/routes/v3/recommendations.js', '推荐路由');

// 检查前端文件
console.log('\n🎨 检查前端文件...');
checkFile('client/src/pages/LearningGoals.jsx', '学习目标页面');
checkFile('client/src/pages/Achievements.jsx', '成就页面');
checkFile('client/src/pages/Recommendations.jsx', '推荐页面');
checkFile('client/src/pages/Analytics.jsx', '学习分析页面');
checkFile('client/src/api/v3/learningGoals.js', '学习目标API');
checkFile('client/src/api/v3/achievements.js', '成就API');
checkFile('client/src/api/v3/recommendations.js', '推荐API');

// 检查路由配置
console.log('\n🛣️  检查路由配置...');
checkFileContent('server/src/app.js', 'v3LearningGoalsRoutes', '学习目标路由注册');
checkFileContent('server/src/app.js', 'v3AchievementsRoutes', '成就路由注册');
checkFileContent('server/src/app.js', 'v3RecommendationsRoutes', '推荐路由注册');
checkFileContent('server/src/app.js', '/api/v3/learning-goals', '学习目标API路径');
checkFileContent('server/src/app.js', '/api/v3/achievements', '成就API路径');
checkFileContent('server/src/app.js', '/api/v3/recommendations', '推荐API路径');

// 检查前端路由
console.log('\n🎯 检查前端路由...');
checkFileContent('client/src/App.jsx', 'LazyLearningGoals', '学习目标组件导入');
checkFileContent('client/src/App.jsx', 'LazyAchievements', '成就组件导入');
checkFileContent('client/src/App.jsx', 'LazyRecommendations', '推荐组件导入');
checkFileContent('client/src/App.jsx', 'path="/goals"', '学习目标路由');
checkFileContent('client/src/App.jsx', 'path="/achievements"', '成就路由');
checkFileContent('client/src/App.jsx', 'path="/recommendations"', '推荐路由');

// 检查导航菜单
console.log('\n📋 检查导航菜单...');
checkFileContent('client/src/layout/AppLayout.patched.jsx', '/goals', '学习目标菜单项');
checkFileContent('client/src/layout/AppLayout.patched.jsx', '/achievements', '成就菜单项');
checkFileContent('client/src/layout/AppLayout.patched.jsx', '/recommendations', '推荐菜单项');
checkFileContent('client/src/layout/AppLayout.patched.jsx', '/analytics', '学习分析菜单项');

// 检查集成
console.log('\n🔗 检查功能集成...');
checkFileContent('server/src/routes/records.js', 'updateLearningGoalsProgress', '答题记录集成学习目标更新');
checkFileContent('server/src/routes/records.js', 'checkAndAwardAchievements', '答题记录集成成就检查');
checkFileContent('client/src/pages/questions/QuestionDetail.jsx', 'getRecommendedQuestions', '题目详情页集成推荐');
checkFileContent('client/src/pages/Home.jsx', '/recommendations', '首页集成推荐入口');

// 输出结果
console.log('\n' + '='.repeat(60));
console.log('\n📊 测试结果:\n');
console.log(`✅ 通过: ${results.passed.length}`);
console.log(`❌ 失败: ${results.failed.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ 失败的检查:');
  results.failed.forEach(item => {
    console.log(`   - ${item}`);
  });
  console.log('\n⚠️  请检查上述问题');
} else {
  console.log('\n✅ 所有检查通过！功能配置完整。');
}

console.log('\n');

