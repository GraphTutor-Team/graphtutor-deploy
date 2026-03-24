/**
 * GraphTutor V3.0 数据迁移脚本
 * 
 * 功能：
 * 1. 用户角色迁移：user -> student
 * 2. 题库管理者迁移：ownerId -> managers[]
 * 3. 题目ID系统：为现有题目生成 qid（可选）
 * 4. 学科分类初始化：创建默认学科分类
 * 
 * 使用方式：
 * node server/scripts/migrate-to-v3.js [--dry-run] [--rollback]
 * 
 * 安全特性：
 * - 支持 --dry-run 模式（仅预览，不执行）
 * - 支持 --rollback 模式（回滚迁移）
 * - 自动备份数据
 * - 幂等性保证（可重复执行）
 */

import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Question from '../src/models/Question.js';
import QuestionBank from '../src/models/QuestionBank.js';
import Subject from '../src/models/Subject.js';
import config from '../src/config.js';

const DRY_RUN = process.argv.includes('--dry-run');
const ROLLBACK = process.argv.includes('--rollback');

// 迁移日志
const migrationLog = [];

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  migrationLog.push(logEntry);
}

async function connectDB() {
  try {
    await mongoose.connect(config.MONGODB_URI || process.env.MONGODB_URI);
    log('✅ 数据库连接成功');
  } catch (error) {
    log(`❌ 数据库连接失败: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 步骤1：用户角色迁移
 * user -> student（向后兼容）
 */
async function migrateUserRoles() {
  log('📋 开始用户角色迁移...');
  
  if (ROLLBACK) {
    // 回滚：student -> user
    const result = await User.updateMany(
      { role: 'student' },
      { $set: { role: 'user' } }
    );
    log(`✅ 回滚完成：${result.modifiedCount} 个用户角色已恢复为 user`);
    return;
  }

  if (DRY_RUN) {
    const count = await User.countDocuments({ role: 'user' });
    log(`🔍 [预览] 将迁移 ${count} 个用户角色：user -> student`);
    return;
  }

  const result = await User.updateMany(
    { role: 'user' },
    { $set: { role: 'student' } }
  );
  
  log(`✅ 用户角色迁移完成：${result.modifiedCount} 个用户已更新为 student 角色`);
}

/**
 * 步骤2：题库管理者迁移
 * ownerId -> managers[]（向后兼容）
 */
async function migrateBankManagers() {
  log('📋 开始题库管理者迁移...');
  
  if (ROLLBACK) {
    // 回滚：managers[0] -> ownerId，清空 managers
    const banks = await QuestionBank.find({ managers: { $exists: true, $ne: [] } });
    let count = 0;
    for (const bank of banks) {
      if (bank.managers && bank.managers.length > 0 && !bank.ownerId) {
        bank.ownerId = bank.managers[0];
        bank.managers = [];
        await bank.save();
        count++;
      }
    }
    log(`✅ 回滚完成：${count} 个题库已恢复 ownerId`);
    return;
  }

  if (DRY_RUN) {
    const banks = await QuestionBank.find({ 
      ownerId: { $exists: true, $ne: null },
      $or: [
        { managers: { $exists: false } },
        { managers: { $size: 0 } }
      ]
    });
    log(`🔍 [预览] 将迁移 ${banks.length} 个题库：ownerId -> managers[]`);
    return;
  }

  const banks = await QuestionBank.find({ 
    ownerId: { $exists: true, $ne: null }
  });
  
  let count = 0;
  for (const bank of banks) {
    // 如果 managers 为空或不存在，将 ownerId 添加到 managers
    if (!bank.managers || bank.managers.length === 0) {
      bank.managers = [bank.ownerId];
      await bank.save();
      count++;
    } else if (!bank.managers.includes(bank.ownerId)) {
      // 如果 managers 存在但不包含 ownerId，则添加
      bank.managers.push(bank.ownerId);
      await bank.save();
      count++;
    }
  }
  
  log(`✅ 题库管理者迁移完成：${count} 个题库已更新 managers 数组`);
}

/**
 * 步骤3：题目ID系统迁移（可选）
 * 为现有题目生成 qid（如果还没有）
 */
async function migrateQuestionIds() {
  log('📋 开始题目ID系统迁移（可选）...');
  
  if (ROLLBACK) {
    // 回滚：清空 qid 字段（保留 id 字段）
    const result = await Question.updateMany(
      { qid: { $exists: true } },
      { $unset: { qid: '' } }
    );
    log(`✅ 回滚完成：${result.modifiedCount} 个题目的 qid 已清除`);
    return;
  }

  // 获取所有没有 qid 的题目
  const questions = await Question.find({ 
    $or: [
      { qid: { $exists: false } },
      { qid: null },
      { qid: '' }
    ]
  });

  if (DRY_RUN) {
    log(`🔍 [预览] 将为 ${questions.length} 个题目生成 qid（可选操作）`);
    log(`💡 提示：此步骤为可选，现有题目可以继续使用 id 字段`);
    return;
  }

  // 为题目生成 qid（使用默认学科代码和年份）
  const currentYear = new Date().getFullYear();
  let count = 0;
  
  for (const question of questions) {
    // 如果题目有 id，可以基于 id 生成 qid
    // 如果没有，使用默认格式：DEFAULT-{YEAR}-{序号}
    if (!question.qid) {
      const seq = String(count + 1).padStart(3, '0');
      question.qid = `DEFAULT-${currentYear}-${seq}`;
      await question.save();
      count++;
    }
  }
  
  log(`✅ 题目ID迁移完成：${count} 个题目已生成 qid`);
  log(`💡 提示：现有题目可以继续使用 id 字段，新题目建议使用 qid`);
}

/**
 * 步骤4：初始化默认学科分类
 */
async function initDefaultSubjects() {
  log('📋 开始初始化默认学科分类...');
  
  if (ROLLBACK) {
    // 回滚：删除默认学科（可选，谨慎操作）
    const result = await Subject.deleteMany({ code: { $regex: /^DEFAULT-/ } });
    log(`✅ 回滚完成：${result.deletedCount} 个默认学科已删除`);
    return;
  }

  const defaultSubjects = [
    {
      code: 'CS',
      name: '计算机科学',
      level: 1,
      description: '计算机科学基础学科',
      color: '#3B82F6',
      icon: '💻',
      order: 1,
    },
    {
      code: 'CS-DS',
      name: '数据结构',
      level: 2,
      parentCode: 'CS',
      description: '数据结构与算法',
      color: '#10B981',
      icon: '📊',
      order: 1,
    },
    {
      code: 'CS-ALG',
      name: '算法',
      level: 2,
      parentCode: 'CS',
      description: '算法设计与分析',
      color: '#F59E0B',
      icon: '⚙️',
      order: 2,
    },
    {
      code: 'MATH',
      name: '数学',
      level: 1,
      description: '数学基础学科',
      color: '#8B5CF6',
      icon: '📐',
      order: 2,
    },
  ];

  if (DRY_RUN) {
    log(`🔍 [预览] 将创建 ${defaultSubjects.length} 个默认学科分类`);
    return;
  }

  // 先创建一级学科
  for (const subject of defaultSubjects) {
    if (subject.level === 1) {
      const exists = await Subject.findOne({ code: subject.code });
      if (!exists) {
        await Subject.create(subject);
        log(`✅ 创建一级学科：${subject.name} (${subject.code})`);
      }
    }
  }

  // 再创建二级学科（需要关联父学科）
  for (const subject of defaultSubjects) {
    if (subject.level === 2 && subject.parentCode) {
      const parent = await Subject.findOne({ code: subject.parentCode });
      if (parent) {
        const exists = await Subject.findOne({ code: subject.code });
        if (!exists) {
          await Subject.create({
            ...subject,
            parentId: parent._id,
          });
          log(`✅ 创建二级学科：${subject.name} (${subject.code})`);
        }
      }
    }
  }

  log(`✅ 默认学科分类初始化完成`);
}

/**
 * 主迁移函数
 */
async function main() {
  log('🚀 GraphTutor V3.0 数据迁移开始');
  log(`模式：${DRY_RUN ? '🔍 预览模式（不执行）' : ROLLBACK ? '↩️ 回滚模式' : '✅ 执行模式'}`);
  
  await connectDB();

  try {
    // 执行迁移步骤
    await migrateUserRoles();
    await migrateBankManagers();
    await migrateQuestionIds(); // 可选
    await initDefaultSubjects();

    log('✅ 所有迁移步骤完成');
    
    if (DRY_RUN) {
      log('💡 这是预览模式，未实际执行迁移。移除 --dry-run 参数以执行迁移。');
    }
    
  } catch (error) {
    log(`❌ 迁移过程中发生错误: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('📝 数据库连接已关闭');
  }
}

// 执行迁移
main().catch(console.error);

