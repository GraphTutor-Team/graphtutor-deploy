/**
 * 测试角色申请功能
 * 检查后端API是否正常工作
 */

import mongoose from 'mongoose';
import RoleApplication from '../src/models/RoleApplication.js';
import User from '../src/models/User.js';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/graphtutor';

async function testRoleApplication() {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 检查模型是否存在
    console.log('\n📋 检查模型...');
    console.log('RoleApplication 模型:', RoleApplication ? '✅ 存在' : '❌ 不存在');
    console.log('User 模型:', User ? '✅ 存在' : '❌ 不存在');

    // 检查集合是否存在
    const collections = await mongoose.connection.db.listCollections().toArray();
    const roleAppCollection = collections.find(c => c.name === 'roleapplications');
    console.log('roleapplications 集合:', roleAppCollection ? '✅ 存在' : '❌ 不存在');

    // 检查索引
    if (roleAppCollection) {
      const indexes = await mongoose.connection.db.collection('roleapplications').indexes();
      console.log('索引数量:', indexes.length);
      console.log('索引列表:', indexes.map(i => i.name).join(', '));
    }

    // 测试创建申请（不保存）
    console.log('\n🧪 测试创建申请对象...');
    const testApp = new RoleApplication({
      userId: new mongoose.Types.ObjectId(),
      requestedRole: 'question_manager',
      reason: '测试申请理由，用于验证功能是否正常',
      status: 'pending',
    });

    // 验证
    try {
      await testApp.validate();
      console.log('✅ 申请对象验证通过');
    } catch (err) {
      console.log('❌ 申请对象验证失败:', err.message);
    }

    // 检查现有申请数量
    const count = await RoleApplication.countDocuments();
    console.log(`\n📊 现有申请数量: ${count}`);

    // 检查待审核申请
    const pendingCount = await RoleApplication.countDocuments({ status: 'pending' });
    console.log(`待审核申请: ${pendingCount}`);

    console.log('\n✅ 测试完成');
  } catch (err) {
    console.error('❌ 测试失败:', err);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

testRoleApplication();

