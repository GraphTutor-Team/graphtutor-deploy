/**
 * GraphTutor V3.0 - 初始化学习计划相关索引
 * 
 * 功能：确保学习计划相关的MongoDB索引已创建
 * 使用方法：node server/scripts/init-study-plan-indexes.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 导入模型以确保它们被注册
import '../src/models/StudyPlan.js';
import '../src/models/StudyTask.js';
import '../src/models/StudyCheckIn.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/graphtutor';

async function initIndexes() {
  try {
    console.log('🔌 正在连接MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB连接成功');

    const db = mongoose.connection.db;
    const collections = ['studyplans', 'studytasks', 'studycheckins'];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        console.log(`\n📋 ${collectionName} 现有索引:`);
        indexes.forEach(index => {
          console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // 重建索引以确保最新配置生效
        console.log(`\n🔄 重建 ${collectionName} 索引...`);
        await collection.reIndex();
        console.log(`✅ ${collectionName} 索引重建完成`);
      } catch (err) {
        console.error(`❌ ${collectionName} 索引操作失败:`, err.message);
      }
    }

    console.log('\n✅ 所有索引初始化完成');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB连接已关闭');
  }
}

initIndexes();

