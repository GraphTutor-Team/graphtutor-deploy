/**
 * GraphTutor V3.0 - 显示集合统计脚本
 * 
 * 功能：快速显示所有集合的数据量统计
 * 使用方法：node server/scripts/show-collections-stats.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

async function showStats() {
  console.log('='.repeat(70));
  console.log('GraphTutor V3.0 - 数据库集合统计');
  console.log('='.repeat(70));
  console.log('');

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

  let total = 0;
  for (const { name, model } of collections) {
    try {
      const count = await model.countDocuments();
      total += count;
      const status = count > 0 ? '✅' : '⚠️';
      console.log(`${status} ${name.padEnd(25)}: ${count.toString().padStart(8)} 条`);
    } catch (err) {
      console.log(`❌ ${name.padEnd(25)}: 错误 - ${err.message}`);
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log(`总计: ${total} 条数据`);
  console.log('='.repeat(70));
}

async function main() {
  await connectDB();
  await showStats();
  await mongoose.connection.close();
  console.log('\n🔌 数据库连接已关闭');
}

main();

