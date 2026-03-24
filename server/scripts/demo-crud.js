/**
 * GraphTutor V3.0 - CRUD操作演示脚本
 * 
 * 功能：演示CRUD操作示例
 * 使用方法：node server/scripts/demo-crud.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Question from '../src/models/Question.js';
import QuestionBank from '../src/models/QuestionBank.js';
import User from '../src/models/User.js';

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

async function demoCRUD() {
  console.log('='.repeat(70));
  console.log('GraphTutor V3.0 - CRUD操作演示');
  console.log('='.repeat(70));
  console.log('');

  try {
    // ========== READ (查询) ==========
    console.log('📖 1. READ操作 - 查询题目');
    console.log('-'.repeat(70));
    
    // 查询示例1：按难度查询
    const questions1 = await Question.find({ difficulty: { $gte: 3 } })
      .limit(3)
      .select('content difficulty subjectCode')
      .lean();
    console.log(`查询结果：找到 ${questions1.length} 道题目（难度 >= 3）`);
    questions1.forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q.content.substring(0, 50)}... (难度: ${q.difficulty})`);
    });

    // 查询示例2：按学科查询
    const questions2 = await Question.find({ subjectCode: 'CS-DS' })
      .limit(3)
      .select('content subjectCode')
      .lean();
    console.log(`\n查询结果：找到 ${questions2.length} 道题目（学科: CS-DS）`);

    // 聚合查询示例
    console.log('\n📊 聚合查询 - 统计各难度题目数量');
    console.log('-'.repeat(70));
    const difficultyStats = await Question.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    difficultyStats.forEach(stat => {
      console.log(`  难度 ${stat._id}: ${stat.count} 道题目`);
    });

    // ========== CREATE (插入) ==========
    console.log('\n\n➕ 2. CREATE操作 - 插入题目');
    console.log('-'.repeat(70));
    
    const testQuestion = {
      content: '【测试题目】MongoDB是什么类型的数据库？',
      type: 'single',
      options: ['关系型数据库', 'NoSQL数据库', '图数据库', '时序数据库'],
      answerIndex: 1,
      answer: 1,
      difficulty: 1,
      subjectCode: 'CS',
      explain: 'MongoDB是NoSQL文档数据库',
      source: 'bank',
    };

    const inserted = await Question.create(testQuestion);
    console.log('✅ 插入成功！');
    console.log(`  题目ID: ${inserted._id}`);
    console.log(`  题目内容: ${inserted.content}`);

    // ========== UPDATE (更新) ==========
    console.log('\n\n✏️  3. UPDATE操作 - 更新题目');
    console.log('-'.repeat(70));
    
    const updated = await Question.findByIdAndUpdate(
      inserted._id,
      { 
        $set: { 
          difficulty: 2,
          tags: ['测试', 'MongoDB'],
          updatedAt: new Date(),
        } 
      },
      { new: true }
    );
    console.log('✅ 更新成功！');
    console.log(`  新难度: ${updated.difficulty}`);
    console.log(`  新标签: ${updated.tags.join(', ')}`);

    // ========== DELETE (删除) ==========
    console.log('\n\n🗑️  4. DELETE操作 - 删除题目');
    console.log('-'.repeat(70));
    
    await Question.findByIdAndDelete(inserted._id);
    console.log('✅ 删除成功！');
    console.log(`  已删除题目ID: ${inserted._id}`);

    // ========== 复杂查询示例 ==========
    console.log('\n\n🔍 5. 复杂查询示例');
    console.log('-'.repeat(70));
    
    // 查询题库统计
    const bankStats = await QuestionBank.aggregate([
      {
        $lookup: {
          from: 'questions',
          localField: '_id',
          foreignField: 'bankId',
          as: 'questions',
        },
      },
      {
        $project: {
          name: 1,
          questionCount: { $size: '$questions' },
          isOfficial: 1,
        },
      },
      { $limit: 5 },
    ]);

    console.log('题库统计（前5个）：');
    bankStats.forEach((bank, idx) => {
      console.log(`  ${idx + 1}. ${bank.name}: ${bank.questionCount} 道题目 ${bank.isOfficial ? '(官方)' : ''}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ CRUD操作演示完成！');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ 操作失败:', error.message);
    throw error;
  }
}

async function main() {
  await connectDB();
  await demoCRUD();
  await mongoose.connection.close();
  console.log('\n🔌 数据库连接已关闭');
}

main().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});

