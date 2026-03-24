/**
 * GraphTutor V3.0 - 数据库备份脚本
 * 
 * 功能：备份MongoDB数据库到JSON文件
 * 使用：node server/scripts/db-backup.js [--output=backup.json]
 */

import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.js';
import Question from '../src/models/Question.js';
import QuestionBank from '../src/models/QuestionBank.js';
import Subject from '../src/models/Subject.js';
import config from '../src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_ARG = process.argv.find(arg => arg.startsWith('--output='));
const OUTPUT_FILE = OUTPUT_ARG 
  ? OUTPUT_ARG.split('=')[1] 
  : `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

async function connectDB() {
  try {
    await mongoose.connect(config.MONGODB_URI || process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

async function backupData() {
  console.log('📦 开始备份数据...\n');
  
  const backup = {
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    data: {},
  };
  
  // 备份用户（排除密码哈希）
  console.log('  备份用户...');
  const users = await User.find().select('-passwordHash').lean();
  backup.data.users = users;
  console.log(`  ✅ 已备份 ${users.length} 个用户`);
  
  // 备份题目
  console.log('  备份题目...');
  const questions = await Question.find().lean();
  backup.data.questions = questions;
  console.log(`  ✅ 已备份 ${questions.length} 个题目`);
  
  // 备份题库
  console.log('  备份题库...');
  const banks = await QuestionBank.find().lean();
  backup.data.questionBanks = banks;
  console.log(`  ✅ 已备份 ${banks.length} 个题库`);
  
  // 备份学科
  console.log('  备份学科...');
  const subjects = await Subject.find().lean();
  backup.data.subjects = subjects;
  console.log(`  ✅ 已备份 ${subjects.length} 个学科`);
  
  // 保存到文件
  const outputPath = path.resolve(__dirname, '..', OUTPUT_FILE);
  await fs.writeFile(outputPath, JSON.stringify(backup, null, 2), 'utf-8');
  
  const stats = await fs.stat(outputPath);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log(`\n✅ 备份完成！`);
  console.log(`  文件: ${outputPath}`);
  console.log(`  大小: ${fileSizeMB} MB`);
  
  return outputPath;
}

async function main() {
  console.log('💾 GraphTutor V3.0 数据库备份工具\n');
  
  await connectDB();
  
  try {
    await backupData();
  } catch (error) {
    console.error('❌ 备份过程中发生错误:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📝 数据库连接已关闭');
  }
}

main().catch(console.error);

