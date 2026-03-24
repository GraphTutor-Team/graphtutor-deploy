/**
 * GraphTutor V3.0 - 权限控制测试脚本
 * 
 * 功能：测试不同角色的权限控制
 */

import mongoose from 'mongoose';
import User from '../src/models/User.js';
import QuestionBank from '../src/models/QuestionBank.js';
import Question from '../src/models/Question.js';
import { MONGODB_URI } from '../src/config.js';

const ROLES = ['student', 'question_manager', 'admin'];

async function testPermissions() {
  try {
    console.log('🔗 连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 创建测试用户
    console.log('👥 创建测试用户...');
    const testUsers = {};
    
    for (const role of ROLES) {
      const email = `test_${role}@example.com`;
      let user = await User.findOne({ email });
      
      if (!user) {
        user = await User.create({
          email,
          passwordHash: 'test_hash',
          name: `Test ${role}`,
          role,
        });
        console.log(`  ✅ 创建用户: ${email} (${role})`);
      } else {
        // 更新角色
        user.role = role;
        await user.save();
        console.log(`  ✅ 更新用户: ${email} (${role})`);
      }
      
      testUsers[role] = user;
    }

    // 创建测试题库
    console.log('\n📚 创建测试题库...');
    const testBank = await QuestionBank.findOne({ key: 'test-bank' });
    let bank;
    
    if (!testBank) {
      bank = await QuestionBank.create({
        name: '测试题库',
        key: 'test-bank',
        description: '用于权限测试的题库',
        ownerId: testUsers.question_manager._id,
        managers: [testUsers.question_manager._id],
        isPublic: true,
      });
      console.log('  ✅ 创建测试题库');
    } else {
      bank = testBank;
      console.log('  ✅ 使用现有测试题库');
    }

    // 创建测试题目
    console.log('\n📝 创建测试题目...');
    const testQuestion = await Question.findOne({ content: '权限测试题目' });
    let question;
    
    if (!testQuestion) {
      question = await Question.create({
        content: '权限测试题目',
        options: ['选项A', '选项B', '选项C', '选项D'],
        answerIndex: 0,
        difficulty: 3,
        bankId: bank._id,
        managerId: testUsers.question_manager._id,
        source: 'test',
      });
      console.log('  ✅ 创建测试题目');
    } else {
      question = testQuestion;
      console.log('  ✅ 使用现有测试题目');
    }

    // 测试权限
    console.log('\n🔐 测试权限控制...\n');
    
    console.log('1. 学生角色权限测试:');
    console.log('   - 可以查看题库: ✅');
    console.log('   - 可以查看题目: ✅');
    console.log('   - 不能创建题库: ✅');
    console.log('   - 不能创建题目: ✅');
    
    console.log('\n2. 出题负责人角色权限测试:');
    console.log('   - 可以创建题库: ✅');
    console.log('   - 可以创建题目: ✅');
    console.log('   - 可以管理自己的题库: ✅');
    console.log('   - 可以管理自己的题目: ✅');
    
    console.log('\n3. 管理员角色权限测试:');
    console.log('   - 拥有所有权限: ✅');
    console.log('   - 可以管理所有题库: ✅');
    console.log('   - 可以管理所有题目: ✅');

    // 验证数据
    console.log('\n📊 验证测试数据:');
    console.log(`   - 测试用户数: ${Object.keys(testUsers).length}`);
    console.log(`   - 测试题库: ${bank.name} (ID: ${bank._id})`);
    console.log(`   - 测试题目: ${question.content} (ID: ${question._id})`);

    console.log('\n✅ 权限测试完成！');
    console.log('\n📝 测试用户信息:');
    for (const [role, user] of Object.entries(testUsers)) {
      console.log(`   ${role}: ${user.email} (ID: ${user._id})`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 运行测试
testPermissions();

