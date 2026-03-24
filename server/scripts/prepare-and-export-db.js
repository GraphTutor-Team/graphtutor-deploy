/**
 * GraphTutor V3.0 - 数据库准备和导出脚本
 * 
 * 功能：
 * 1. 检查所有集合的数据量
 * 2. 为空集合添加示例数据
 * 3. 导出数据库（使用mongodump）
 * 
 * 使用方法：node server/scripts/prepare-and-export-db.js
 */

import mongoose from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入所有模型
import User from '../src/models/User.js';
import Question from '../src/models/Question.js';
import QuestionBank from '../src/models/QuestionBank.js';
import Subject from '../src/models/Subject.js';
import Record from '../src/models/Record.js';
import WrongQuestion from '../src/models/WrongQuestion.js';
import RoleApplication from '../src/models/RoleApplication.js';
import QuizSession from '../src/models/QuizSession.js';
import KnowledgeNode from '../src/models/KnowledgeNode.js';
import GraphNode from '../src/models/GraphNode.js';
import GraphLink from '../src/models/GraphLink.js';
import QuestionVersion from '../src/models/QuestionVersion.js';
import Template from '../src/models/Template.js';
import AIRunLog from '../src/models/AIRunLog.js';
import Group from '../src/models/Group.js';
import LearningGoal from '../src/models/LearningGoal.js';
import Achievement from '../src/models/Achievement.js';
import StudyPlan from '../src/models/StudyPlan.js';
import StudyTask from '../src/models/StudyTask.js';
import StudyCheckIn from '../src/models/StudyCheckIn.js';
import ReviewPlan from '../src/models/ReviewPlan.js';
import Favorite from '../src/models/Favorite.js';
import FavoriteFolder from '../src/models/FavoriteFolder.js';
import Note from '../src/models/Note.js';
import NoteLike from '../src/models/NoteLike.js';
import Quiz from '../src/models/Quiz.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/graphtutor';

// 解析数据库名称
const dbName = MONGODB_URI.split('/').pop().split('?')[0] || 'graphtutor';

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

/**
 * 检查集合数据量
 */
async function checkCollections() {
  console.log('📊 检查集合数据量...\n');
  
  const collections = [
    { name: 'users', model: User },
    { name: 'questions', model: Question },
    { name: 'questionbanks', model: QuestionBank },
    { name: 'subjects', model: Subject },
    { name: 'records', model: Record },
    { name: 'wrongquestions', model: WrongQuestion },
    { name: 'roleapplications', model: RoleApplication },
    { name: 'quizsessions', model: QuizSession },
    { name: 'knowledgenodes', model: KnowledgeNode },
    { name: 'graphnodes', model: GraphNode },
    { name: 'graphlinks', model: GraphLink },
    { name: 'questionversions', model: QuestionVersion },
    { name: 'templates', model: Template },
    { name: 'airunlogs', model: AIRunLog },
    { name: 'groups', model: Group },
    { name: 'learninggoals', model: LearningGoal },
    { name: 'achievements', model: Achievement },
    { name: 'studyplans', model: StudyPlan },
    { name: 'studytasks', model: StudyTask },
    { name: 'studycheckins', model: StudyCheckIn },
    { name: 'reviewplans', model: ReviewPlan },
    { name: 'favorites', model: Favorite },
    { name: 'favoritefolders', model: FavoriteFolder },
    { name: 'notes', model: Note },
    { name: 'notelikes', model: NoteLike },
    { name: 'quizzes', model: Quiz },
  ];

  const stats = {};
  const emptyCollections = [];

  for (const { name, model } of collections) {
    try {
      const count = await model.countDocuments();
      stats[name] = count;
      console.log(`  ${name.padEnd(25)}: ${count} 条`);
      if (count === 0) {
        emptyCollections.push({ name, model });
      }
    } catch (err) {
      console.log(`  ${name.padEnd(25)}: 错误 - ${err.message}`);
    }
  }

  console.log('\n');
  return { stats, emptyCollections };
}

/**
 * 创建示例用户
 */
async function createSampleUsers() {
  console.log('👤 创建示例用户...');
  
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    console.log('  用户已存在，跳过创建\n');
    return await User.findOne().lean();
  }

  const users = [
    {
      email: 'admin@graphtutor.com',
      passwordHash: '$2b$10$example_hash_for_demo_only',
      name: '系统管理员',
      role: 'admin',
      school: '示例大学',
      major: '计算机科学',
      grade: '研究生',
      bio: '系统管理员账号',
    },
    {
      email: 'teacher@graphtutor.com',
      passwordHash: '$2b$10$example_hash_for_demo_only',
      name: '张老师',
      role: 'question_manager',
      school: '示例大学',
      major: '计算机科学',
      grade: '教师',
      bio: '出题负责人账号',
    },
    {
      email: 'student@graphtutor.com',
      passwordHash: '$2b$10$example_hash_for_demo_only',
      name: '李同学',
      role: 'student',
      school: '示例大学',
      major: '计算机科学',
      grade: '大三',
      studentId: '2021001001',
      bio: '学生账号',
    },
  ];

  const createdUsers = await User.insertMany(users);
  console.log(`  ✅ 已创建 ${createdUsers.length} 个示例用户\n`);
  return createdUsers[0];
}

/**
 * 创建示例学科
 */
async function createSampleSubjects() {
  console.log('📚 创建示例学科...');
  
  const existingSubjects = await Subject.countDocuments();
  if (existingSubjects > 0) {
    console.log('  学科已存在，跳过创建\n');
    return await Subject.findOne().lean();
  }

  const subjects = [
    {
      code: 'CS',
      name: '计算机科学',
      level: 1,
      parentId: null,
      description: '计算机科学基础学科',
      order: 1,
      enabled: true,
    },
    {
      code: 'CS-DS',
      name: '数据结构',
      level: 2,
      parentId: null, // 需要先找到CS的ID
      description: '数据结构与算法',
      order: 1,
      enabled: true,
    },
  ];

  // 先创建一级学科
  const cs = await Subject.create(subjects[0]);
  subjects[1].parentId = cs._id;
  await Subject.create(subjects[1]);

  console.log('  ✅ 已创建示例学科\n');
  return cs;
}

/**
 * 创建示例题库
 */
async function createSampleBanks(userId) {
  console.log('📦 创建示例题库...');
  
  const existingBanks = await QuestionBank.countDocuments();
  if (existingBanks > 0) {
    console.log('  题库已存在，跳过创建\n');
    return await QuestionBank.findOne().lean();
  }

  const banks = [
    {
      name: '数据结构基础题库',
      description: '数据结构基础题目集合',
      ownerId: userId,
      managers: [userId],
      isPublic: true,
      isOfficial: false,
      subjectCode: 'CS-DS',
      questionCount: 0,
    },
    {
      name: '官方计算机科学题库',
      description: '官方认证的计算机科学题库',
      ownerId: userId,
      managers: [userId],
      isPublic: true,
      isOfficial: true,
      subjectCode: 'CS',
      questionCount: 0,
    },
  ];

  const createdBanks = await QuestionBank.insertMany(banks);
  console.log(`  ✅ 已创建 ${createdBanks.length} 个示例题库\n`);
  return createdBanks[0];
}

/**
 * 创建示例题目
 */
async function createSampleQuestions(userId, bankId, subjectCode) {
  console.log('❓ 创建示例题目...');
  
  const existingQuestions = await Question.countDocuments();
  if (existingQuestions > 0) {
    console.log('  题目已存在，跳过创建\n');
    return;
  }

  const questions = [
    {
      content: '以下哪个数据结构是先进先出（FIFO）的？',
      type: 'single',
      options: ['栈', '队列', '链表', '树'],
      answerIndex: 1,
      answer: 1,
      difficulty: 2,
      subjectCode: subjectCode,
      bankId: bankId,
      creatorId: userId,
      managerId: userId,
      explain: '队列是先进先出的数据结构',
      source: 'bank',
    },
    {
      content: '以下哪些是线性数据结构？',
      type: 'multiple',
      options: ['数组', '链表', '栈', '队列', '树'],
      answerIndex: [0, 1, 2, 3],
      answer: [0, 1, 2, 3],
      difficulty: 2,
      subjectCode: subjectCode,
      bankId: bankId,
      creatorId: userId,
      managerId: userId,
      explain: '数组、链表、栈、队列都是线性数据结构',
      source: 'bank',
    },
    {
      content: '栈是一种后进先出（LIFO）的数据结构。',
      type: 'judge',
      options: ['正确', '错误'],
      answerIndex: 0,
      answer: 0,
      difficulty: 1,
      subjectCode: subjectCode,
      bankId: bankId,
      creatorId: userId,
      managerId: userId,
      explain: '栈确实是后进先出的数据结构',
      source: 'bank',
    },
  ];

  await Question.insertMany(questions);
  
  // 更新题库题目数量
  await QuestionBank.findByIdAndUpdate(bankId, {
    $inc: { questionCount: questions.length },
  });

  console.log(`  ✅ 已创建 ${questions.length} 个示例题目\n`);
}

/**
 * 创建示例答题记录
 */
async function createSampleRecords(userId, questionId) {
  console.log('📝 创建示例答题记录...');
  
  const existingRecords = await Record.countDocuments();
  if (existingRecords > 0) {
    console.log('  答题记录已存在，跳过创建\n');
    return;
  }

  const records = [
    {
      userId: userId,
      questionId: questionId,
      isCorrect: true,
      answerIndex: 1,
      correctIndex: 1,
      timeSpentMs: 5000,
    },
    {
      userId: userId,
      questionId: questionId,
      isCorrect: false,
      answerIndex: 0,
      correctIndex: 1,
      timeSpentMs: 8000,
    },
  ];

  await Record.insertMany(records);
  console.log(`  ✅ 已创建 ${records.length} 条示例答题记录\n`);
}

/**
 * 创建示例错题
 */
async function createSampleWrongQuestions(userId, questionId) {
  console.log('❌ 创建示例错题...');
  
  const existingWrongQuestions = await WrongQuestion.countDocuments();
  if (existingWrongQuestions > 0) {
    console.log('  错题已存在，跳过创建\n');
    return;
  }

  const wrongQuestion = {
    userId: userId,
    questionId: questionId,
    subjectCode: 'CS-DS',
    category: '数据结构',
    tags: ['队列', '基础'],
    mastery: 50,
    masteryStatus: 'learning',
    errorCount: 2,
    reviewCount: 1,
    firstErrorAt: new Date(),
    lastErrorAt: new Date(),
  };

  await WrongQuestion.create(wrongQuestion);
  console.log('  ✅ 已创建示例错题\n');
}

/**
 * 创建示例学习计划
 */
async function createSampleStudyPlan(userId) {
  console.log('📅 创建示例学习计划...');
  
  const existingPlans = await StudyPlan.countDocuments();
  if (existingPlans > 0) {
    console.log('  学习计划已存在，跳过创建\n');
    return;
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const plan = {
    userId: userId,
    name: '数据结构学习计划',
    description: '30天数据结构学习计划',
    type: 'daily',
    startDate: startDate,
    endDate: endDate,
    dailyTarget: 10,
    subjectCodes: ['CS-DS'],
    status: 'active',
    stats: {
      totalDays: 30,
      completedDays: 5,
      totalQuestions: 300,
      completedQuestions: 50,
      currentStreak: 5,
      longestStreak: 5,
    },
  };

  await StudyPlan.create(plan);
  console.log('  ✅ 已创建示例学习计划\n');
}

/**
 * 创建示例角色申请
 */
async function createSampleRoleApplication(userId) {
  console.log('📋 创建示例角色申请...');
  
  const existingApps = await RoleApplication.countDocuments();
  if (existingApps > 0) {
    console.log('  角色申请已存在，跳过创建\n');
    return;
  }

  const app = {
    userId: userId,
    requestedRole: 'question_manager',
    reason: '希望成为出题负责人，为系统贡献更多优质题目',
    status: 'pending',
  };

  await RoleApplication.create(app);
  console.log('  ✅ 已创建示例角色申请\n');
}

/**
 * 创建示例群组
 */
async function createSampleGroup(userId) {
  console.log('👥 创建示例群组...');
  
  const existingGroups = await Group.countDocuments();
  if (existingGroups > 0) {
    console.log('  群组已存在，跳过创建\n');
    return;
  }

  const group = await Group.create({
    name: '数据结构学习小组',
    description: '一起学习数据结构的群组',
    ownerId: userId,
    type: 'study',
    members: [{
      userId: userId,
      role: 'teacher',
      status: 'active',
    }],
    settings: {
      isPublic: true,
      allowStudentInvite: true,
    },
  });

  console.log('  ✅ 已创建示例群组\n');
  return group._id;
}

/**
 * 创建示例收藏夹和收藏
 */
async function createSampleFavorites(userId, questionId) {
  console.log('⭐ 创建示例收藏...');
  
  const existingFolders = await FavoriteFolder.countDocuments();
  if (existingFolders > 0) {
    console.log('  收藏已存在，跳过创建\n');
    return;
  }

  const folder = await FavoriteFolder.create({
    userId: userId,
    name: '我的收藏',
    description: '收藏的题目',
    isDefault: true,
    questionCount: 1,
  });

  await Favorite.create({
    userId: userId,
    questionId: questionId,
    folderId: folder._id,
    notes: '这道题很重要',
    tags: ['重要', '基础'],
  });

  console.log('  ✅ 已创建示例收藏\n');
}

/**
 * 创建示例笔记
 */
async function createSampleNotes(userId, questionId) {
  console.log('📝 创建示例笔记...');
  
  const existingNotes = await Note.countDocuments();
  if (existingNotes > 0) {
    console.log('  笔记已存在，跳过创建\n');
    return;
  }

  const note = await Note.create({
    userId: userId,
    type: 'question',
    questionId: questionId,
    title: '队列知识点总结',
    content: '队列是一种先进先出（FIFO）的数据结构，常用于实现广度优先搜索等算法。',
    tags: ['队列', '数据结构', '基础'],
    isPublic: false,
  });

  console.log('  ✅ 已创建示例笔记\n');
  return note._id;
}

/**
 * 创建示例学习目标
 */
async function createSampleLearningGoal(userId) {
  console.log('🎯 创建示例学习目标...');
  
  const existingGoals = await LearningGoal.countDocuments();
  if (existingGoals > 0) {
    console.log('  学习目标已存在，跳过创建\n');
    return;
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  await LearningGoal.create({
    userId: userId.toString(),
    title: '掌握数据结构基础',
    description: '完成数据结构基础课程的学习',
    type: 'monthly',
    targetType: 'questions',
    targetValue: 100,
    currentValue: 50,
    subjectCode: 'CS-DS',
    status: 'active',
    startDate: new Date(),
    endDate: endDate,
  });

  console.log('  ✅ 已创建示例学习目标\n');
}

/**
 * 创建示例成就
 */
async function createSampleAchievement(userId) {
  console.log('🏆 创建示例成就...');
  
  const existingAchievements = await Achievement.countDocuments();
  if (existingAchievements > 0) {
    console.log('  成就已存在，跳过创建\n');
    return;
  }

  await Achievement.create({
    userId: userId.toString(),
    type: 'first_answer',
    title: '初出茅庐',
    description: '完成第一道题目',
    icon: '🎯',
    unlockedAt: new Date(),
  });

  console.log('  ✅ 已创建示例成就\n');
}

/**
 * 创建示例复习计划
 */
async function createSampleReviewPlan(userId) {
  console.log('📚 创建示例复习计划...');
  
  const existingPlans = await ReviewPlan.countDocuments();
  if (existingPlans > 0) {
    console.log('  复习计划已存在，跳过创建\n');
    return;
  }

  await ReviewPlan.create({
    userId: userId.toString(),
    name: '错题复习计划',
    description: '每周复习错题',
    type: 'weekly',
    strategy: 'due',
    targetType: 'count',
    targetValue: 20,
    dailyCount: 5,
    subjectCode: 'CS-DS',
    status: 'active',
  });

  console.log('  ✅ 已创建示例复习计划\n');
}

/**
 * 填充空集合
 */
async function fillEmptyCollections(emptyCollections, sampleData) {
  console.log('📝 填充空集合...\n');

  const { userId, bankId, questionId, subjectCode } = sampleData;

  for (const { name, model } of emptyCollections) {
    try {
      switch (name) {
        case 'users':
          await createSampleUsers();
          break;
        case 'subjects':
          await createSampleSubjects();
          break;
        case 'questionbanks':
          await createSampleBanks(userId);
          break;
        case 'questions':
          await createSampleQuestions(userId, bankId, subjectCode);
          break;
        case 'records':
          await createSampleRecords(userId, questionId);
          break;
        case 'wrongquestions':
          await createSampleWrongQuestions(userId, questionId);
          break;
        case 'studyplans':
          await createSampleStudyPlan(userId);
          break;
        case 'roleapplications':
          await createSampleRoleApplication(userId);
          break;
        case 'groups':
          await createSampleGroup(userId);
          break;
        case 'favorites':
        case 'favoritefolders':
          await createSampleFavorites(userId, questionId);
          break;
        case 'notes':
          await createSampleNotes(userId, questionId);
          break;
        case 'learninggoals':
          await createSampleLearningGoal(userId);
          break;
        case 'achievements':
          await createSampleAchievement(userId);
          break;
        case 'reviewplans':
          await createSampleReviewPlan(userId);
          break;
        default:
          console.log(`  ⚠️  跳过 ${name}（未实现填充逻辑）`);
      }
    } catch (err) {
      console.error(`  ❌ 填充 ${name} 失败:`, err.message);
    }
  }
}

/**
 * 导出数据库
 */
async function exportDatabase() {
  console.log('💾 开始导出数据库...\n');

  const outputDir = path.resolve(__dirname, '../../nusql/GraphTutor_MongoDB_资料包/backup');
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupPath = path.join(outputDir, `graphtutor_${dateStr}`);

  // 确保输出目录存在
  await fs.mkdir(outputDir, { recursive: true });

  try {
    // 使用mongodump导出
    const mongodumpCmd = `mongodump --host 127.0.0.1:27017 --db ${dbName} --out "${backupPath}"`;
    console.log(`执行命令: ${mongodumpCmd}\n`);
    
    const { stdout, stderr } = await execAsync(mongodumpCmd);
    
    if (stderr && !stderr.includes('writing')) {
      console.warn('⚠️  警告:', stderr);
    }

    console.log('✅ 数据库导出成功');
    console.log(`📁 导出路径: ${backupPath}\n`);

    // 列出导出的文件
    const files = await fs.readdir(backupPath);
    console.log('📄 导出的集合:');
    for (const file of files) {
      if (file === dbName) {
        const collectionDir = path.join(backupPath, file);
        const collections = await fs.readdir(collectionDir);
        collections.forEach(col => {
          console.log(`  - ${col}`);
        });
      }
    }

    return backupPath;
  } catch (err) {
    console.error('❌ 导出失败:', err.message);
    throw err;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 GraphTutor V3.0 数据库准备和导出工具\n');
  console.log('='.repeat(60));
  console.log(`数据库: ${dbName}`);
  console.log(`连接: ${MONGODB_URI}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. 连接数据库
    await connectDB();

    // 2. 检查集合
    const { stats, emptyCollections } = await checkCollections();

    // 3. 准备示例数据
    let sampleData = {};
    
    if (emptyCollections.length > 0) {
      console.log(`\n⚠️  发现 ${emptyCollections.length} 个空集合，准备填充示例数据...\n`);
      
      // 先创建基础数据
      const user = await createSampleUsers();
      const subject = await createSampleSubjects();
      const bank = await createSampleBanks(user._id);
      const question = await Question.findOne().lean();
      
      sampleData = {
        userId: user._id,
        bankId: bank._id,
        questionId: question?._id,
        subjectCode: subject?.code || 'CS-DS',
      };

      // 填充空集合
      await fillEmptyCollections(emptyCollections, sampleData);
      
      // 再次检查
      console.log('\n📊 填充后的集合统计:\n');
      await checkCollections();
    } else {
      console.log('✅ 所有集合都有数据，无需填充\n');
    }

    // 4. 导出数据库
    const backupPath = await exportDatabase();

    console.log('\n✅ 完成！');
    console.log(`📁 备份路径: ${backupPath}`);
    console.log('\n💡 提示: 可以使用以下命令恢复数据库:');
    console.log(`   mongorestore --host 127.0.0.1:27017 --db ${dbName} "${backupPath}/${dbName}"`);

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

main();

