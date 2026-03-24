/**
 * GraphTutor V3.0 - 数据库清理脚本
 * 
 * 功能：清理无效数据、修复数据一致性
 * 使用：node server/scripts/db-cleanup.js [--dry-run]
 * 
 * 清理内容：
 * 1. 删除孤立题目（bankId指向不存在的题库）
 * 2. 修复题库的questionCount计数
 * 3. 删除无效的学科关联
 * 4. 清理空题库
 */

import mongoose from 'mongoose';
import Question from '../src/models/Question.js';
import QuestionBank from '../src/models/QuestionBank.js';
import Subject from '../src/models/Subject.js';
import config from '../src/config.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function connectDB() {
  try {
    await mongoose.connect(config.MONGODB_URI || process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功\n');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

async function cleanupOrphanQuestions() {
  console.log('🔍 检查孤立题目...');
  
  const allBanks = await QuestionBank.find().select('_id').lean();
  const bankIds = new Set(allBanks.map(b => b._id.toString()));
  
  const questionsWithBank = await Question.find({ bankId: { $exists: true, $ne: null } }).select('_id bankId').lean();
  const orphanQuestions = questionsWithBank.filter(q => !bankIds.has(q.bankId?.toString()));
  
  if (orphanQuestions.length > 0) {
    console.log(`  发现 ${orphanQuestions.length} 个孤立题目`);
    if (!DRY_RUN) {
      await Question.updateMany(
        { _id: { $in: orphanQuestions.map(q => q._id) } },
        { $unset: { bankId: '' } }
      );
      console.log('  ✅ 已清除孤立题目的bankId引用');
    } else {
      console.log('  💡 预览模式：将清除这些题目的bankId引用');
    }
  } else {
    console.log('  ✅ 未发现孤立题目');
  }
}

async function fixBankQuestionCounts() {
  console.log('\n🔍 修复题库题目计数...');
  
  const banks = await QuestionBank.find().select('_id name').lean();
  let fixed = 0;
  
  for (const bank of banks) {
    const actualCount = await Question.countDocuments({ bankId: bank._id });
    const bankDoc = await QuestionBank.findById(bank._id);
    
    if (bankDoc.questionCount !== actualCount) {
      console.log(`  题库 "${bank.name}": ${bankDoc.questionCount} -> ${actualCount}`);
      if (!DRY_RUN) {
        bankDoc.questionCount = actualCount;
        await bankDoc.save();
        fixed++;
      }
    }
  }
  
  if (fixed > 0) {
    console.log(`  ✅ 修复了 ${fixed} 个题库的计数`);
  } else {
    console.log('  ✅ 所有题库计数正确');
  }
}

async function cleanupInvalidSubjectRefs() {
  console.log('\n🔍 检查无效的学科关联...');
  
  const allSubjects = await Subject.find().select('code').lean();
  const subjectCodes = new Set(allSubjects.map(s => s.code));
  
  // 检查题目
  const questionsWithSubject = await Question.find({ subjectCode: { $exists: true, $ne: null } }).select('_id subjectCode').lean();
  const invalidQuestionRefs = questionsWithSubject.filter(q => !subjectCodes.has(q.subjectCode));
  
  if (invalidQuestionRefs.length > 0) {
    console.log(`  发现 ${invalidQuestionRefs.length} 个题目有无效的学科关联`);
    if (!DRY_RUN) {
      await Question.updateMany(
        { _id: { $in: invalidQuestionRefs.map(q => q._id) } },
        { $unset: { subjectCode: '' } }
      );
      console.log('  ✅ 已清除无效的学科关联');
    } else {
      console.log('  💡 预览模式：将清除这些题目的学科关联');
    }
  } else {
    console.log('  ✅ 所有题目的学科关联有效');
  }
  
  // 检查题库
  const banksWithSubject = await QuestionBank.find({ subjectCode: { $exists: true, $ne: null } }).select('_id subjectCode name').lean();
  const invalidBankRefs = banksWithSubject.filter(b => !subjectCodes.has(b.subjectCode));
  
  if (invalidBankRefs.length > 0) {
    console.log(`  发现 ${invalidBankRefs.length} 个题库有无效的学科关联`);
    if (!DRY_RUN) {
      await QuestionBank.updateMany(
        { _id: { $in: invalidBankRefs.map(b => b._id) } },
        { $unset: { subjectCode: '' } }
      );
      console.log('  ✅ 已清除无效的学科关联');
    } else {
      console.log('  💡 预览模式：将清除这些题库的学科关联');
    }
  } else {
    console.log('  ✅ 所有题库的学科关联有效');
  }
}

async function cleanupEmptyBanks() {
  console.log('\n🔍 检查空题库...');
  
  const banks = await QuestionBank.find().select('_id name questionCount').lean();
  const emptyBanks = banks.filter(b => b.questionCount === 0);
  
  if (emptyBanks.length > 0) {
    console.log(`  发现 ${emptyBanks.length} 个空题库`);
    if (!DRY_RUN) {
      await QuestionBank.deleteMany({ _id: { $in: emptyBanks.map(b => b._id) } });
      console.log('  ✅ 已删除空题库');
    } else {
      console.log('  💡 预览模式：将删除这些空题库');
      emptyBanks.forEach(b => console.log(`    - ${b.name}`));
    }
  } else {
    console.log('  ✅ 未发现空题库');
  }
}

async function main() {
  console.log('🧹 GraphTutor V3.0 数据库清理工具\n');
  console.log(`模式：${DRY_RUN ? '🔍 预览模式（不执行）' : '✅ 执行模式'}\n`);
  
  await connectDB();
  
  try {
    await cleanupOrphanQuestions();
    await fixBankQuestionCounts();
    await cleanupInvalidSubjectRefs();
    await cleanupEmptyBanks();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 清理完成');
    
    if (DRY_RUN) {
      console.log('💡 这是预览模式，未实际执行清理。移除 --dry-run 参数以执行清理。');
    }
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📝 数据库连接已关闭');
  }
}

main().catch(console.error);

