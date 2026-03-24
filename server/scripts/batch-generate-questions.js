/**
 * GraphTutor V3.0 - 批量AI生成题目脚本
 * 
 * 功能：使用AI为多个学科批量生成题目
 * 运行方式：node server/scripts/batch-generate-questions.js
 * 
 * 配置说明：
 * - 需要配置环境变量 LLM_API_KEY 或 OPENAI_API_KEY
 * - 可以配置 LLM_BASE_URL（默认使用 OpenAI）
 * - 可以配置 LLM_MODEL（默认 gpt-4o-mini）
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Subject from '../src/models/Subject.js';
import Question from '../src/models/Question.js';
import QuestionBank from '../src/models/QuestionBank.js';
import User from '../src/models/User.js';
import { generateQuestions } from '../src/services/ai/openAIService.js';
import { generateQuestionId } from '../src/utils/questionIdService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/graphtutor';

// 生成配置：每个学科生成多少题目，难度分布
const GENERATION_CONFIG = {
  // 每个二级学科生成题目的配置
  perSubject: {
    count: 10, // 每个学科生成10道题
    difficulties: [1, 2, 3, 4, 5], // 难度分布：每种难度生成2道题
  },
  
  // 每个三级学科生成题目的配置
  perSubSubject: {
    count: 5, // 每个三级学科生成5道题
    difficulties: [2, 3, 4], // 难度分布：中等难度为主
  },
  
  // 是否只生成二级学科（跳过三级学科）
  onlyLevel2: false,
  
  // 是否创建新题库（如果为false，则使用默认题库或创建通用题库）
  createNewBank: true,
  
  // 题库名称前缀
  bankNamePrefix: 'AI生成题库',
};

/**
 * 批量生成题目
 */
async function batchGenerateQuestions() {
  try {
    console.log('🚀 开始批量AI生成题目...\n');
    console.log('正在连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 检查AI配置
    if (!process.env.LLM_API_KEY && !process.env.OPENAI_API_KEY) {
      console.error('❌ 错误：未配置 AI API密钥\n');
      console.log('📝 配置方法：');
      console.log('   1. 在项目根目录创建 .env 文件');
      console.log('   2. 添加以下配置之一：\n');
      console.log('      # 方式1：使用 OpenAI');
      console.log('      OPENAI_API_KEY=your-api-key-here\n');
      console.log('      # 方式2：使用兼容API（如千问、LM Studio等）');
      console.log('      LLM_API_KEY=your-api-key-here');
      console.log('      LLM_BASE_URL=http://localhost:1234/v1  # 可选');
      console.log('      LLM_MODEL=gpt-4o-mini  # 可选\n');
      console.log('   3. 重新运行脚本\n');
      console.log('💡 提示：也可以直接在命令行设置环境变量：');
      console.log('   Windows PowerShell: $env:OPENAI_API_KEY="your-key"; node server\\scripts\\batch-generate-questions.js');
      console.log('   Linux/Mac: OPENAI_API_KEY=your-key node server/scripts/batch-generate-questions.js\n');
      process.exit(1);
    }

    // 获取管理员用户（用于创建题目）
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ 错误：未找到管理员用户');
      process.exit(1);
    }
    console.log(`✅ 使用管理员账户: ${adminUser.username}\n`);

    // 获取所有启用的学科（二级和三级）
    const subjects = await Subject.find({ enabled: true })
      .sort({ level: 1, order: 1 })
      .lean();

    if (subjects.length === 0) {
      console.error('❌ 错误：未找到任何学科');
      process.exit(1);
    }

    console.log(`📚 找到 ${subjects.length} 个学科\n`);

    // 统计信息
    const stats = {
      totalSubjects: 0,
      totalGenerated: 0,
      totalFailed: 0,
      bySubject: {},
      byDifficulty: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    // 创建或获取题库
    let defaultBank = null;
    if (GENERATION_CONFIG.createNewBank) {
      const bankName = `${GENERATION_CONFIG.bankNamePrefix} - ${new Date().toLocaleDateString('zh-CN')}`;
      defaultBank = await QuestionBank.findOne({ name: bankName });
      if (!defaultBank) {
        defaultBank = await QuestionBank.create({
          name: bankName,
          key: `ai-generated-${Date.now()}`,
          description: 'AI自动生成的题目题库',
          ownerId: adminUser._id,
          isPublic: true,
          questionCount: 0,
        });
        console.log(`✅ 创建题库: ${bankName}\n`);
      } else {
        console.log(`✅ 使用现有题库: ${bankName}\n`);
      }
    } else {
      // 使用默认题库或创建通用题库
      defaultBank = await QuestionBank.findOne({ name: '默认题库' });
      if (!defaultBank) {
        defaultBank = await QuestionBank.create({
          name: '默认题库',
          key: 'default',
          description: '系统默认题库',
          ownerId: adminUser._id,
          isPublic: true,
          questionCount: 0,
        });
      }
    }

    // 按层级处理学科
    const level2Subjects = subjects.filter(s => s.level === 2);
    const level3Subjects = subjects.filter(s => s.level === 3);

    console.log(`📊 学科统计:`);
    console.log(`   一级学科: ${subjects.filter(s => s.level === 1).length} 个`);
    console.log(`   二级学科: ${level2Subjects.length} 个`);
    console.log(`   三级学科: ${level3Subjects.length} 个\n`);

    // 处理二级学科
    console.log('🔄 开始处理二级学科...\n');
    for (const subject of level2Subjects) {
      await generateForSubject(subject, GENERATION_CONFIG.perSubject, defaultBank, adminUser._id, stats);
    }

    // 处理三级学科（如果启用）
    if (!GENERATION_CONFIG.onlyLevel2 && level3Subjects.length > 0) {
      console.log('\n🔄 开始处理三级学科...\n');
      for (const subject of level3Subjects) {
        await generateForSubject(subject, GENERATION_CONFIG.perSubSubject, defaultBank, adminUser._id, stats);
      }
    }

    // 更新题库题目数量
    if (defaultBank) {
      const actualCount = await Question.countDocuments({ bankId: defaultBank._id });
      await QuestionBank.findByIdAndUpdate(defaultBank._id, {
        questionCount: actualCount,
      });
      console.log(`\n✅ 题库 "${defaultBank.name}" 题目数量已更新: ${actualCount}`);
    }

    // 输出统计信息
    console.log('\n📊 ========== 生成统计 ==========');
    console.log(`   处理学科数: ${stats.totalSubjects}`);
    console.log(`   成功生成: ${stats.totalGenerated} 道题`);
    console.log(`   失败: ${stats.totalFailed} 道题`);
    console.log(`\n   难度分布:`);
    for (let d = 1; d <= 5; d++) {
      console.log(`     难度 ${d}: ${stats.byDifficulty[d]} 道题`);
    }
    console.log(`\n   按学科统计:`);
    for (const [code, count] of Object.entries(stats.bySubject)) {
      console.log(`     ${code}: ${count} 道题`);
    }

    console.log('\n✨ 批量生成完成！');

  } catch (error) {
    console.error('\n❌ 批量生成失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
  }
}

/**
 * 为单个学科生成题目
 */
async function generateForSubject(subject, config, bank, userId, stats) {
  const { count, difficulties } = config;
  
  try {
    console.log(`📝 ${subject.icon || '📚'} ${subject.code} - ${subject.name}`);
    
    stats.totalSubjects++;
    stats.bySubject[subject.code] = 0;

    // 计算每种难度生成多少题
    const questionsPerDifficulty = Math.floor(count / difficulties.length);
    const remainder = count % difficulties.length;

    let generated = 0;
    let failed = 0;

    // 为每种难度生成题目
    for (let i = 0; i < difficulties.length; i++) {
      const difficulty = difficulties[i];
      const qCount = questionsPerDifficulty + (i < remainder ? 1 : 0);
      
      if (qCount <= 0) continue;

      try {
        // 调用AI生成题目
        const questions = await generateQuestions(
          {
            subjectCode: subject.code,
            subjectName: subject.name,
            difficulty: difficulty,
            count: qCount,
            knowledgePoint: subject.description || '',
          },
          userId.toString()
        );

        // 保存题目到数据库
        for (const q of questions) {
          try {
            // 生成qid
            let qid = null;
            try {
              qid = await generateQuestionId(subject.code);
            } catch (error) {
              console.warn(`      ⚠️  生成qid失败: ${error.message}`);
            }

            // 创建题目对象
            const questionData = {
              type: 'single',
              content: q.content,
              options: q.options,
              answerIndex: q.answerIndex,
              answer: q.answerIndex,
              subjectCode: subject.code,
              bankId: bank._id,
              difficulty: q.difficulty || difficulty,
              explain: q.explain || '',
              managerId: userId,
              source: 'ai',
            };

            if (qid) {
              questionData.qid = qid;
            }

            const question = await Question.create(questionData);
            generated++;
            stats.totalGenerated++;
            stats.byDifficulty[difficulty]++;
            stats.bySubject[subject.code]++;

            console.log(`      ✅ [难度${difficulty}] ${q.content.substring(0, 40)}...`);
          } catch (error) {
            failed++;
            stats.totalFailed++;
            console.error(`      ❌ 保存题目失败: ${error.message}`);
          }
        }

        // 添加延迟，避免API限流
        await sleep(1000);
      } catch (error) {
        failed += qCount;
        stats.totalFailed += qCount;
        console.error(`      ❌ 生成题目失败 (难度${difficulty}): ${error.message}`);
      }
    }

    console.log(`      📊 完成: 成功 ${generated} 道，失败 ${failed} 道\n`);

  } catch (error) {
    console.error(`      ❌ 处理学科失败: ${error.message}\n`);
    stats.totalFailed += count;
  }
}

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 执行脚本
batchGenerateQuestions()
  .then(() => {
    console.log('\n🎉 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 脚本执行失败:', error);
    process.exit(1);
  });

