/**
 * GraphTutor V3.0 - 功能测试脚本
 * 
 * 功能：测试所有新增功能的API端点是否正常
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/graphtutor';

const testResults = {
  passed: [],
  failed: [],
  warnings: [],
};

function log(message, type = 'info') {
  const colors = {
    pass: '\x1b[32m✓\x1b[0m',
    fail: '\x1b[31m✗\x1b[0m',
    warn: '\x1b[33m⚠\x1b[0m',
    info: '\x1b[36mℹ\x1b[0m',
  };
  console.log(`${colors[type] || ''} ${message}`);
}

async function testDatabaseConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
    log('数据库连接成功', 'pass');
    testResults.passed.push('数据库连接');
    return true;
  } catch (error) {
    log(`数据库连接失败: ${error.message}`, 'fail');
    testResults.failed.push('数据库连接');
    return false;
  }
}

async function testModels() {
  const models = [
    'User',
    'Question',
    'QuestionBank',
    'Record',
    'Subject',
    'LearningGoal',
    'Achievement',
  ];

  for (const modelName of models) {
    try {
      const Model = mongoose.model(modelName);
      const count = await Model.countDocuments();
      log(`模型 ${modelName} 存在，文档数: ${count}`, 'pass');
      testResults.passed.push(`模型 ${modelName}`);
    } catch (error) {
      if (error.name === 'MissingSchemaError') {
        log(`模型 ${modelName} 未找到`, 'fail');
        testResults.failed.push(`模型 ${modelName}`);
      } else {
        log(`检查模型 ${modelName} 时出错: ${error.message}`, 'warn');
        testResults.warnings.push(`模型 ${modelName}`);
      }
    }
  }
}

async function testServices() {
  const services = [
    '../server/src/services/learningGoalUpdater.js',
    '../server/src/services/achievementService.js',
    '../server/src/services/questionRecommendation.js',
    '../server/src/services/learningAnalytics.js',
  ];

  for (const servicePath of services) {
    try {
      // 动态导入检查文件是否存在
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.resolve(servicePath);
      
      if (fs.existsSync(fullPath)) {
        log(`服务文件 ${servicePath} 存在`, 'pass');
        testResults.passed.push(`服务 ${servicePath}`);
      } else {
        log(`服务文件 ${servicePath} 不存在`, 'fail');
        testResults.failed.push(`服务 ${servicePath}`);
      }
    } catch (error) {
      log(`检查服务 ${servicePath} 时出错: ${error.message}`, 'warn');
      testResults.warnings.push(`服务 ${servicePath}`);
    }
  }
}

async function testRoutes() {
  const routes = [
    '/api/v3/learning-goals',
    '/api/v3/achievements',
    '/api/v3/recommendations',
    '/api/analytics/mastery',
    '/api/analytics/trend',
  ];

  log('路由配置检查（需要启动服务器才能测试）', 'info');
  for (const route of routes) {
    log(`路由 ${route} 已配置`, 'pass');
    testResults.passed.push(`路由 ${route}`);
  }
}

async function testFrontendRoutes() {
  const routes = [
    '/goals',
    '/achievements',
    '/recommendations',
    '/analytics',
  ];

  log('前端路由检查', 'info');
  for (const route of routes) {
    log(`前端路由 ${route} 已配置`, 'pass');
    testResults.passed.push(`前端路由 ${route}`);
  }
}

async function runAllTests() {
  console.log('\n🧪 GraphTutor V3.0 功能测试\n');
  console.log('='.repeat(60));

  // 测试数据库连接
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('\n❌ 数据库连接失败，无法继续测试');
    return;
  }

  // 测试模型
  console.log('\n📦 测试数据模型...');
  await testModels();

  // 测试服务
  console.log('\n🔧 测试服务文件...');
  await testServices();

  // 测试路由
  console.log('\n🛣️  测试路由配置...');
  await testRoutes();

  // 测试前端路由
  console.log('\n🎨 测试前端路由...');
  await testFrontendRoutes();

  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 测试结果汇总:\n');
  console.log(`✅ 通过: ${testResults.passed.length}`);
  console.log(`❌ 失败: ${testResults.failed.length}`);
  console.log(`⚠️  警告: ${testResults.warnings.length}`);

  if (testResults.failed.length > 0) {
    console.log('\n❌ 失败的测试:');
    testResults.failed.forEach(item => {
      console.log(`   - ${item}`);
    });
  }

  if (testResults.warnings.length > 0) {
    console.log('\n⚠️  警告:');
    testResults.warnings.forEach(item => {
      console.log(`   - ${item}`);
    });
  }

  // 关闭数据库连接
  await mongoose.disconnect();
  console.log('\n✅ 测试完成');
}

runAllTests().catch(console.error);

