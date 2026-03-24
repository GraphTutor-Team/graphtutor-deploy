/**
 * 一次性脚本：创建「默认题库」，并把没有 bankId 的题目归入其中。
 *
 * 使用方法（在 server 目录）：
 *   node scripts/initDefaultBank.js
 */

import mongoose from 'mongoose';
import { connectDB } from '../src/db.js';
import Question from '../src/models/Question.js';
import QuestionBank from '../src/models/QuestionBank.js';

async function main() {
  // 1. 连接 MongoDB
  await connectDB();

  // 2. 创建或查找默认题库
  const bank = await QuestionBank.findOneAndUpdate(
    { key: 'default' },
    {
      name: '默认题库',
      key: 'default',
      description: '未显式指定题库的旧题目统一归到这里',
      isPublic: true,
    },
    { upsert: true, new: true }
  );

  // 3. 把没有 bankId 的题目统一归入默认题库
  const result = await Question.updateMany(
    {
      $or: [
        { bankId: { $exists: false } },
        { bankId: null },
      ],
    },
    { $set: { bankId: bank._id } }
  );

  console.log('✅ 默认题库创建/更新完成，ID =', bank._id.toString());
  console.log('✅ 已更新题目数量 =', result.modifiedCount ?? result.nModified);

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ initDefaultBank 脚本执行失败:', err);
  process.exit(1);
});
