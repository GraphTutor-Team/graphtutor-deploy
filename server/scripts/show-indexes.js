/**
 * GraphTutor V3.0 - 显示索引脚本
 * 
 * 功能：显示主要集合的索引信息
 * 使用方法：node server/scripts/show-indexes.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/graphtutor';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB连接成功\n');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
    process.exit(1);
  }
}

async function showIndexes() {
  const db = mongoose.connection.db;
  
  const collections = [
    'users',
    'questions',
    'questionbanks',
    'subjects',
    'records',
    'wrongquestions',
    'studyplans',
    'studytasks',
    'studycheckins',
  ];

  console.log('='.repeat(70));
  console.log('GraphTutor V3.0 - 数据库索引信息');
  console.log('='.repeat(70));
  console.log('');

  for (const collectionName of collections) {
    try {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      
      console.log(`\n📋 ${collectionName.toUpperCase()}`);
      console.log('-'.repeat(70));
      
      if (indexes.length === 0) {
        console.log('  ⚠️  无索引');
      } else {
        indexes.forEach((index, idx) => {
          const keys = Object.entries(index.key)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ');
          const unique = index.unique ? ' [唯一]' : '';
          const sparse = index.sparse ? ' [稀疏]' : '';
          console.log(`  ${idx + 1}. ${index.name}: { ${keys} }${unique}${sparse}`);
        });
      }
    } catch (err) {
      console.log(`\n❌ ${collectionName}: 错误 - ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
}

async function main() {
  await connectDB();
  await showIndexes();
  await mongoose.connection.close();
  console.log('\n🔌 数据库连接已关闭');
}

main();

