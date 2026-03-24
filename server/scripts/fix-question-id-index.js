/**
 * GraphTutor V3.0 - 修复Question模型的id字段索引
 * 
 * 功能：删除旧的唯一索引，创建新的sparse索引
 * 使用方法：node server/scripts/fix-question-id-index.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/db.js';
import { MONGODB_URI } from '../src/config.js';

async function fixIndex() {
  try {
    console.log('🔗 连接数据库...');
    await connectDB();
    console.log('✅ 数据库连接成功\n');

    const db = mongoose.connection.db;
    const collection = db.collection('questions');

    // 检查现有索引
    console.log('📋 检查现有索引...');
    const indexes = await collection.indexes();
    console.log('现有索引:', indexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique,
      sparse: idx.sparse,
    })));

    // 删除id字段的唯一索引（如果存在）
    try {
      const idIndex = indexes.find(idx => idx.name === 'id_1' || (idx.key && idx.key.id === 1));
      if (idIndex && idIndex.unique) {
        console.log('\n🗑️  删除旧的唯一索引 id_1...');
        await collection.dropIndex('id_1');
        console.log('✅ 旧索引已删除');
      } else {
        console.log('\n⏭️  未找到需要删除的唯一索引');
      }
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('\n⏭️  索引不存在，跳过删除');
      } else {
        console.error('删除索引错误:', error.message);
      }
    }

    // 创建新的sparse索引
    try {
      console.log('\n📝 创建新的sparse索引...');
      await collection.createIndex({ id: 1 }, { unique: false, sparse: true });
      console.log('✅ 新的sparse索引已创建');
    } catch (error) {
      console.error('创建索引错误:', error.message);
    }

    // 验证索引
    console.log('\n📋 验证新索引...');
    const newIndexes = await collection.indexes();
    const newIdIndex = newIndexes.find(idx => idx.name === 'id_1' || (idx.key && idx.key.id === 1));
    if (newIdIndex) {
      console.log('新索引配置:', {
        name: newIdIndex.name,
        key: newIdIndex.key,
        unique: newIdIndex.unique,
        sparse: newIdIndex.sparse,
      });
    }

    console.log('\n✅ 索引修复完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ 修复索引失败:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixIndex();

