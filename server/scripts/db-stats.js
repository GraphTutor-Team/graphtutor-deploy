/**
 * GraphTutor V3.0 - 数据库统计脚本
 * 
 * 功能：生成数据库统计报告
 * 使用：node server/scripts/db-stats.js
 */

import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Question from '../src/models/Question.js';
import QuestionBank from '../src/models/QuestionBank.js';
import Subject from '../src/models/Subject.js';
import config from '../src/config.js';

async function connectDB() {
  try {
    await mongoose.connect(config.MONGODB_URI || process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

async function generateStats() {
  console.log('📊 GraphTutor V3.0 数据库统计报告\n');
  console.log('='.repeat(60));

  // 用户统计
  const totalUsers = await User.countDocuments();
  const usersByRole = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  console.log('\n👥 用户统计:');
  console.log(`  总用户数: ${totalUsers}`);
  usersByRole.forEach(({ _id, count }) => {
    console.log(`  - ${_id || '未设置'}: ${count}`);
  });

  // 题目统计
  const totalQuestions = await Question.countDocuments();
  const questionsByDifficulty = await Question.aggregate([
    {
      $group: {
        _id: '$difficulty',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const questionsWithQid = await Question.countDocuments({ qid: { $exists: true, $ne: null } });
  const questionsWithSubject = await Question.countDocuments({ subjectCode: { $exists: true, $ne: null } });

  console.log('\n📝 题目统计:');
  console.log(`  总题目数: ${totalQuestions}`);
  console.log(`  有QID的题目: ${questionsWithQid} (${((questionsWithQid / totalQuestions) * 100).toFixed(1)}%)`);
  console.log(`  关联学科的题目: ${questionsWithSubject} (${((questionsWithSubject / totalQuestions) * 100).toFixed(1)}%)`);
  console.log('  难度分布:');
  questionsByDifficulty.forEach(({ _id, count }) => {
    console.log(`    - 难度 ${_id}: ${count}`);
  });

  // 题库统计
  const totalBanks = await QuestionBank.countDocuments();
  const publicBanks = await QuestionBank.countDocuments({ isPublic: true });
  const banksWithSubject = await QuestionBank.countDocuments({ subjectCode: { $exists: true, $ne: null } });
  const banksWithManagers = await QuestionBank.countDocuments({ managers: { $exists: true, $ne: [] } });

  console.log('\n📚 题库统计:');
  console.log(`  总题库数: ${totalBanks}`);
  console.log(`  公开题库: ${publicBanks}`);
  console.log(`  关联学科的题库: ${banksWithSubject}`);
  console.log(`  有管理者的题库: ${banksWithManagers}`);

  // 学科统计
  const totalSubjects = await Subject.countDocuments();
  const enabledSubjects = await Subject.countDocuments({ enabled: true });
  const subjectsByLevel = await Subject.aggregate([
    {
      $group: {
        _id: '$level',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  console.log('\n📖 学科统计:');
  console.log(`  总学科数: ${totalSubjects}`);
  console.log(`  启用的学科: ${enabledSubjects}`);
  console.log('  层级分布:');
  subjectsByLevel.forEach(({ _id, count }) => {
    console.log(`    - 第 ${_id} 级: ${count}`);
  });

  // 最近活动
  const recentQuestions = await Question.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('content createdAt qid')
    .lean();
  const recentBanks = await QuestionBank.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name createdAt')
    .lean();

  console.log('\n🕐 最近活动:');
  console.log('  最近创建的题目:');
  recentQuestions.forEach((q, i) => {
    const preview = q.content.substring(0, 30) + (q.content.length > 30 ? '...' : '');
    console.log(`    ${i + 1}. [${q.qid || '无QID'}] ${preview}`);
  });
  console.log('  最近创建的题库:');
  recentBanks.forEach((b, i) => {
    console.log(`    ${i + 1}. ${b.name}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ 统计报告生成完成');
}

async function main() {
  await connectDB();
  try {
    await generateStats();
  } catch (error) {
    console.error('❌ 生成统计报告失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📝 数据库连接已关闭');
  }
}

main().catch(console.error);

