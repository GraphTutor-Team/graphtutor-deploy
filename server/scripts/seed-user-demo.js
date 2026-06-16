/**
 * GraphTutor 目标用户演示数据 · 一键导入
 *
 * 包含：题库演示数据（可选）+ 好友/笔记/错题/计划/打卡/复习计划/目标/
 *       收藏/答题记录/成就/通知/私信/动态/社区讨论
 *
 * 用法（项目根目录）：
 *   SEED_TARGET_EMAIL=your@email.com npm run seed:user-demo --prefix server
 *
 * Docker：
 *   docker compose exec -e SEED_TARGET_EMAIL=your@email.com server node scripts/seed-user-demo.js
 *
 * 环境变量：
 *   MONGODB_URI              MongoDB 连接
 *   SEED_TARGET_EMAIL        已有账号的邮箱（必填，不会修改你的密码）
 *   SEED_TARGET_PASSWORD     仅当该邮箱尚未注册时才需要（一般不用填）
 *   SEED_UPDATE_PROFILE=1    覆盖昵称/等级/积分（默认不改动已有账号资料）
 *   SEED_DEMO_PASSWORD       演示好友密码（默认 DemoFriend2026!）
 *   SEED_SKIP_DEMO_CONTENT=1 跳过题库/学科演示数据导入
 *   SEED_PENDING_ONLY=1      好友仅发待处理请求
 *   SEED_SECTIONS=social,learning  只跑部分模块（逗号分隔，默认全部）
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Question from '../src/models/Question.js';
import Friendship from '../src/models/Friendship.js';
import FriendRequest from '../src/models/FriendRequest.js';
import Note from '../src/models/Note.js';
import WrongQuestion from '../src/models/WrongQuestion.js';
import StudyPlan from '../src/models/StudyPlan.js';
import StudyCheckIn from '../src/models/StudyCheckIn.js';
import ReviewPlan from '../src/models/ReviewPlan.js';
import LearningGoal from '../src/models/LearningGoal.js';
import FavoriteFolder from '../src/models/FavoriteFolder.js';
import Favorite from '../src/models/Favorite.js';
import Record from '../src/models/Record.js';
import Achievement from '../src/models/Achievement.js';
import Notification from '../src/models/Notification.js';
import Message from '../src/models/Message.js';
import LearningPost from '../src/models/LearningPost.js';
import Discussion from '../src/models/Discussion.js';
import DiscussionReply from '../src/models/DiscussionReply.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/graphtutor';
const TARGET_EMAIL = (process.env.SEED_TARGET_EMAIL || '').trim().toLowerCase();
const TARGET_PASSWORD = process.env.SEED_TARGET_PASSWORD || '';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'DemoFriend2026!';
const PENDING_ONLY = process.env.SEED_PENDING_ONLY === '1';
const SKIP_DEMO = process.env.SEED_SKIP_DEMO_CONTENT === '1';
const UPDATE_PROFILE = process.env.SEED_UPDATE_PROFILE === '1';
const ALL_SECTIONS = [
  'social', 'wrong', 'plan', 'review', 'goals',
  'favorites', 'records', 'achievements', 'notifications',
  'messages', 'posts', 'discussions',
];
const SECTIONS = (process.env.SEED_SECTIONS || ALL_SECTIONS.join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function loadConfig() {
  const file = path.join(SERVER_ROOT, 'data/demo-user-content.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function maskUri(uri) {
  return uri.replace(/\/\/.*@/, '//***@');
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function shouldRun(section) {
  return SECTIONS.includes(section);
}

function runDemoContentSeed() {
  if (SKIP_DEMO) {
    console.log('⏭  跳过题库演示数据（SEED_SKIP_DEMO_CONTENT=1）');
    return;
  }
  console.log('0️⃣  导入学科 / 题库 / 演示题目…');
  const r = spawnSync(process.execPath, ['scripts/seed-demo-content.js'], {
    cwd: SERVER_ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error('题库演示数据导入失败，请检查 seed-demo-content.js');
  }
}

async function ensureTargetUser() {
  const user = await User.findOne({ email: TARGET_EMAIL });
  if (user) {
    console.log(`✓ 使用已有账号：${TARGET_EMAIL} (${user._id})`);
    console.log('  （不会修改你的密码；资料默认保持不变）');
    return { user, existed: true };
  }
  if (!TARGET_PASSWORD || TARGET_PASSWORD.length < 6) {
    throw new Error(
      `未找到邮箱 ${TARGET_EMAIL}。请先在 Web/小程序注册并登录一次，再运行本脚本。`
    );
  }
  const passwordHash = await bcrypt.hash(TARGET_PASSWORD, 10);
  const created = await User.create({
    email: TARGET_EMAIL,
    passwordHash,
    name: TARGET_EMAIL.split('@')[0],
    role: 'student',
  });
  console.log(`✓ 已新建账号：${TARGET_EMAIL}（因库中不存在且提供了 SEED_TARGET_PASSWORD）`);
  return { user: created, existed: false };
}

async function updateTargetProfile(userId, profile) {
  if (!profile) return;
  await User.updateOne({ _id: userId }, {
    $set: {
      name: profile.name,
      school: profile.school,
      grade: profile.grade,
      major: profile.major,
      learningRole: profile.learningRole,
      learningLevel: profile.learningLevel,
      learningExp: profile.learningExp,
      points: profile.points,
    },
  });
  console.log(`  ✓ 更新资料：${profile.name} · Lv.${profile.learningLevel} · ${profile.points} 积分`);
}

async function upsertDemoUser(friend, passwordHash) {
  const email = friend.email.trim().toLowerCase();
  let user = await User.findOne({ email });
  const profile = {
    name: friend.name,
    school: friend.school || '',
    grade: friend.grade || '',
    major: friend.major || '',
    role: 'student',
    passwordHash,
  };
  if (user) {
    await User.updateOne({ _id: user._id }, { $set: profile });
    return user;
  }
  user = await User.create({ email, ...profile });
  return user;
}

async function seedSocial(targetId, config, demoUsers) {
  const pendingCount = PENDING_ONLY
    ? demoUsers.length
    : Math.min(config.pendingRequestCount || 0, demoUsers.length);
  const messages = config.friendRequestMessages || [];
  let friends = 0;
  let requests = 0;

  for (let i = 0; i < demoUsers.length; i += 1) {
    const demo = demoUsers[i];
    if (i < pendingCount) {
      const exists = await FriendRequest.findOne({
        fromUserId: demo._id,
        toUserId: targetId,
        status: 'pending',
      });
      if (!exists) {
        await FriendRequest.create({
          fromUserId: demo._id,
          toUserId: targetId,
          message: messages[i % messages.length],
          status: 'pending',
        });
        requests += 1;
      }
      continue;
    }
    if (PENDING_ONLY) continue;
    const existing = await Friendship.findFriendship(targetId, demo._id);
    if (!existing) {
      await Friendship.createFriendship(targetId, demo._id);
      friends += 1;
    }
  }

  let notes = 0;
  for (const note of config.notesForTarget || []) {
    const filter = { userId: String(targetId), title: note.title };
    const payload = {
      userId: String(targetId),
      type: note.type || 'general',
      title: note.title,
      content: note.content,
      summary: note.summary || '',
      tags: note.tags || [],
      isPublic: !!note.isPublic,
      knowledgeNodeId: note.knowledgeNodeId,
      lastEditedAt: new Date(),
    };
    if (await Note.findOne(filter)) {
      await Note.updateOne(filter, { $set: payload });
    } else {
      await Note.create(payload);
    }
    notes += 1;
  }

  const emailMap = new Map(demoUsers.map((u) => [u.email, u]));
  for (const note of config.notesFromFriends || []) {
    const author = emailMap.get(note.friendEmail?.trim().toLowerCase());
    if (!author) continue;
    const filter = { userId: String(author._id), title: note.title };
    const payload = {
      userId: String(author._id),
      type: note.type || 'general',
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      isPublic: !!note.isPublic,
      lastEditedAt: new Date(),
    };
    if (await Note.findOne(filter)) {
      await Note.updateOne(filter, { $set: payload });
    } else {
      await Note.create(payload);
    }
    notes += 1;
  }

  console.log(`  好友 +${friends} · 待处理请求 +${requests} · 笔记 ${notes} 篇`);
}

async function seedWrongQuestions(userId, count) {
  const questions = await Question.find({}).sort({ createdAt: 1 }).limit(count).lean();
  if (!questions.length) {
    console.warn('  ⚠ 无题目可写入错题本，请先导入 demo 题库');
    return 0;
  }
  const statuses = ['unmastered', 'unmastered', 'learning', 'learning', 'mastered'];
  let n = 0;
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const qid = String(q._id);
    const status = statuses[i % statuses.length];
    const mastery = status === 'mastered' ? 90 : status === 'learning' ? 45 : 10;
    const nextReview = i < 6 ? daysAgo(0) : daysAgo(-2);
    await WrongQuestion.findOneAndUpdate(
      { userId: String(userId), questionId: qid },
      {
        $set: {
          userId: String(userId),
          questionId: qid,
          subjectCode: q.subjectCode,
          knowledgeNodeId: q.knowledgeNodeId,
          category: i % 2 === 0 ? '数据结构' : '未分类',
          tags: ['演示', 'seed'],
          mastery,
          masteryStatus: status,
          errorCount: 1 + (i % 3),
          reviewCount: i % 4,
          lastErrorAt: daysAgo(i % 5),
          nextReviewAt: nextReview,
          isMastered: status === 'mastered',
        },
      },
      { upsert: true, new: true }
    );
    n += 1;
  }
  console.log(`  ✓ 错题本 ${n} 条（含到期复习）`);
  return n;
}

async function seedStudyPlan(userId, config) {
  const spec = config.studyPlan;
  if (!spec) return null;
  const uid = String(userId);
  const start = dayStart(daysAgo(30));
  const end = dayStart(daysAgo(-60));

  let plan = await StudyPlan.findOne({ userId: uid, name: spec.name });
  const payload = {
    userId: uid,
    name: spec.name,
    description: spec.description || '',
    type: spec.type || 'daily',
    startDate: start,
    endDate: end,
    dailyTarget: spec.dailyTarget || 10,
    subjectCodes: spec.subjectCodes || [],
    status: 'active',
    stats: spec.stats || {},
  };
  if (plan) {
    await StudyPlan.updateOne({ _id: plan._id }, { $set: payload });
  } else {
    plan = await StudyPlan.create(payload);
  }

  const moods = ['great', 'good', 'normal', 'good', 'great', 'normal', 'good'];
  for (let i = 0; i < (spec.checkInDaysBack || 7); i += 1) {
    const date = dayStart(daysAgo(i));
    await StudyCheckIn.findOneAndUpdate(
      { userId: uid, planId: plan._id, date },
      {
        $set: {
          userId: uid,
          planId: plan._id,
          date,
          studyDuration: 20 + i * 5,
          completedQuestions: 10 + i * 2,
          correctQuestions: 8 + i,
          mood: moods[i % moods.length],
          summary: i === 0 ? '今日小程序打卡' : `第 ${i + 1} 天学习记录`,
        },
      },
      { upsert: true }
    );
  }
  console.log(`  ✓ 学习计划「${spec.name}」+ ${spec.checkInDaysBack || 7} 天打卡`);
  return plan;
}

async function seedReviewPlan(userId, config) {
  const spec = config.reviewPlan;
  if (!spec) return;
  const uid = String(userId);
  await ReviewPlan.findOneAndUpdate(
    { userId: uid, name: spec.name },
    {
      $set: {
        userId: uid,
        name: spec.name,
        description: spec.description || '',
        type: spec.type || 'daily',
        strategy: spec.strategy || 'due',
        dailyCount: spec.dailyCount || 10,
        status: 'active',
      },
    },
    { upsert: true }
  );
  console.log(`  ✓ 复习计划「${spec.name}」`);
}

async function seedGoals(userId, goals) {
  const uid = String(userId);
  let n = 0;
  for (const g of goals || []) {
    const end = dayStart(daysAgo(-30));
    await LearningGoal.findOneAndUpdate(
      { userId: uid, title: g.title },
      {
        $set: {
          userId: uid,
          title: g.title,
          description: g.description || '',
          type: g.type || 'custom',
          targetType: g.targetType,
          targetValue: g.targetValue,
          currentValue: g.currentValue ?? 0,
          startDate: daysAgo(7),
          endDate: end,
          subjectCode: g.subjectCode,
          status: g.currentValue >= g.targetValue ? 'completed' : 'active',
        },
      },
      { upsert: true }
    );
    n += 1;
  }
  console.log(`  ✓ 学习目标 ${n} 个`);
}

async function seedFavorites(userId, folders, questionLimit = 8) {
  const uid = String(userId);
  const questions = await Question.find({}).limit(questionLimit).lean();
  if (!questions.length) return;

  const folderIds = [];
  for (const f of folders || [{ name: '默认收藏', isDefault: true }]) {
    let folder = await FavoriteFolder.findOne({ userId: uid, name: f.name });
    if (folder) {
      await FavoriteFolder.updateOne({ _id: folder._id }, { $set: f });
    } else {
      folder = await FavoriteFolder.create({ userId: uid, ...f });
    }
    folderIds.push(folder._id);
  }

  let count = 0;
  for (let i = 0; i < questions.length; i += 1) {
    const folderId = folderIds[i % folderIds.length];
    const qid = String(questions[i]._id);
    await Favorite.findOneAndUpdate(
      { userId: uid, questionId: qid, folderId },
      { $set: { userId: uid, questionId: qid, folderId, favoritedAt: daysAgo(i % 10) } },
      { upsert: true }
    );
    count += 1;
  }
  for (const folderId of folderIds) {
    const c = await Favorite.countDocuments({ folderId });
    await FavoriteFolder.updateOne({ _id: folderId }, { $set: { questionCount: c } });
  }
  console.log(`  ✓ 收藏夹 ${folderIds.length} 个 · 收藏题目 ${count} 道`);
}

async function seedRecords(userId, count, daysBack) {
  const questions = await Question.find({}).limit(count).lean();
  if (!questions.length) return 0;
  const uid = String(userId);
  let n = 0;
  for (let i = 0; i < Math.min(count, questions.length * 3); i += 1) {
    const q = questions[i % questions.length];
    const isCorrect = i % 10 !== 3 && i % 10 !== 7;
    const createdAt = daysAgo(i % daysBack);
    const filter = {
      userId: uid,
      questionId: String(q._id),
      createdAt: {
        $gte: dayStart(createdAt),
        $lt: new Date(dayStart(createdAt).getTime() + 86400000),
      },
    };
    const exists = await Record.findOne(filter);
    if (exists) continue;
    await Record.create({
      userId: uid,
      questionId: String(q._id),
      knowledgeNodeId: q.knowledgeNodeId,
      isCorrect,
      answerIndex: isCorrect ? (q.answerIndex ?? 0) : 1,
      correctIndex: q.answerIndex ?? 0,
      timeSpentMs: 15000 + (i % 5) * 5000,
      createdAt,
    });
    n += 1;
  }
  console.log(`  ✓ 答题记录 ${n} 条（近 ${daysBack} 天，供统计页）`);
  return n;
}

async function seedAchievements(userId, list) {
  const uid = String(userId);
  let n = 0;
  for (const a of list || []) {
    const exists = await Achievement.findOne({ userId: uid, type: a.type });
    if (exists) continue;
    await Achievement.create({
      userId: uid,
      type: a.type,
      title: a.title,
      description: a.description,
      icon: a.icon || '🏆',
      unlockedAt: daysAgo(n * 2),
    });
    n += 1;
  }
  console.log(`  ✓ 成就 ${n} 个（已有类型跳过）`);
}

async function seedNotifications(userId, list) {
  const uid = String(userId);
  let n = 0;
  for (const item of list || []) {
    const filter = { userId: uid, title: item.title };
    if (await Notification.findOne(filter)) continue;
    await Notification.create({
      userId: uid,
      type: item.type,
      title: item.title,
      content: item.content,
      isRead: !!item.isRead,
      link: item.link,
      relatedType: item.relatedType || null,
    });
    n += 1;
  }
  console.log(`  ✓ 通知 ${n} 条`);
}

async function seedMessages(targetId, demoUsers, list) {
  const uid = String(targetId);
  const emailMap = new Map(demoUsers.map((u) => [u.email, u]));
  const items = list || [];
  let n = 0;
  for (let i = 0; i < items.length; i += 1) {
    const msg = items[i];
    const friend = emailMap.get(msg.friendEmail?.trim().toLowerCase());
    if (!friend) continue;
    const senderId = msg.fromFriend ? String(friend._id) : uid;
    const receiverId = msg.fromFriend ? uid : String(friend._id);
    const dup = await Message.findOne({
      senderId,
      receiverId,
      content: msg.content,
      isDeletedBySender: false,
      isDeletedByReceiver: false,
    });
    if (dup) continue;
    // 按 JSON 顺序：先发的更早，后发的更新（每条间隔 2 小时）
    const hoursAgo = (items.length - 1 - i) * 2;
    await Message.create({
      senderId,
      receiverId,
      content: msg.content,
      type: 'text',
      isRead: msg.fromFriend ? false : true,
      createdAt: new Date(Date.now() - hoursAgo * 3600000 - i * 60000),
    });
    n += 1;
  }
  console.log(`  ✓ 私信 ${n} 条`);
}

async function seedPosts(targetId, demoUsers, list) {
  const emailMap = new Map(demoUsers.map((u) => [u.email, u]));
  emailMap.set('target', { _id: targetId });
  let n = 0;
  for (const p of list || []) {
    const author = emailMap.get(p.author === 'target' ? 'target' : p.author?.trim().toLowerCase());
    if (!author) continue;
    const filter = { authorId: author._id, content: p.content };
    if (await LearningPost.findOne(filter)) continue;
    await LearningPost.create({
      authorId: author._id,
      type: p.type || 'text',
      title: p.title || '',
      content: p.content,
      visibility: 'public',
      likeCount: n % 3,
    });
    n += 1;
  }
  console.log(`  ✓ 学习动态 ${n} 条`);
}

async function seedDiscussions(targetId, demoUsers, list) {
  const uid = String(targetId);
  const emailMap = new Map(demoUsers.map((u) => [u.email, u]));
  emailMap.set('target', { _id: targetId });

  let n = 0;
  for (const d of list || []) {
    let disc = await Discussion.findOne({ title: d.title });
    const author = emailMap.get(d.author === 'target' ? 'target' : d.author?.trim().toLowerCase());
    if (!author) continue;
    if (!disc) {
      disc = await Discussion.create({
        userId: String(author._id),
        type: d.type || 'general',
        title: d.title,
        content: d.content,
        tags: d.tags || [],
      });
      n += 1;
    }
    for (const r of d.replies || []) {
      const replier = emailMap.get(r.author === 'target' ? 'target' : r.author?.trim().toLowerCase());
      if (!replier) continue;
      const exists = await DiscussionReply.findOne({
        discussionId: disc._id,
        userId: String(replier._id),
        content: r.content,
      });
      if (exists) continue;
      await DiscussionReply.create({
        discussionId: disc._id,
        userId: String(replier._id),
        content: r.content,
      });
    }
  }
  console.log(`  ✓ 社区讨论 ${n} 条（含回复）`);
}

async function printSummary(targetId) {
  const uid = String(targetId);
  const [
    friends, pending, notes, wrong, plans, reviews, goals,
    folders, records, achievements, notifications, messages,
  ] = await Promise.all([
    Friendship.countDocuments({ $or: [{ user1Id: targetId }, { user2Id: targetId }], status: 'active' }),
    FriendRequest.countDocuments({ toUserId: targetId, status: 'pending' }),
    Note.countDocuments({ userId: uid }),
    WrongQuestion.countDocuments({ userId: uid }),
    StudyPlan.countDocuments({ userId: uid, status: 'active' }),
    ReviewPlan.countDocuments({ userId: uid, status: 'active' }),
    LearningGoal.countDocuments({ userId: uid, status: 'active' }),
    FavoriteFolder.countDocuments({ userId: uid }),
    Record.countDocuments({ userId: uid }),
    Achievement.countDocuments({ userId: uid }),
    Notification.countDocuments({ userId: uid, isDeleted: false }),
    Message.countDocuments({ $or: [{ senderId: uid }, { receiverId: uid }] }),
  ]);

  console.log('\n📊 目标账号数据汇总');
  console.log(`   好友 ${friends} · 待处理请求 ${pending}`);
  console.log(`   笔记 ${notes} · 错题 ${wrong} · 收藏夹 ${folders}`);
  console.log(`   学习计划 ${plans} · 复习计划 ${reviews} · 目标 ${goals}`);
  console.log(`   答题记录 ${records} · 成就 ${achievements}`);
  console.log(`   通知 ${notifications} · 私信 ${messages}`);
}

async function main() {
  if (!TARGET_EMAIL) {
    console.error('❌ 请设置 SEED_TARGET_EMAIL');
    process.exit(1);
  }

  console.log('🚀 GraphTutor 目标用户演示数据 · 一键导入\n');
  console.log(`MongoDB: ${maskUri(MONGODB_URI)}`);
  console.log(`目标账号: ${TARGET_EMAIL}`);
  console.log(`模块: ${SECTIONS.join(', ')}\n`);

  runDemoContentSeed();

  await mongoose.connect(MONGODB_URI);
  const config = loadConfig();
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const { user: targetUser, existed: targetExisted } = await ensureTargetUser();
  const targetId = targetUser._id;

  console.log('\n1️⃣  演示好友账号（仅用于加好友/私信，不是你的登录账号）…');
  const demoUsers = [];
  for (const f of config.demoFriends || []) {
    demoUsers.push(await upsertDemoUser(f, demoPasswordHash));
  }
  console.log(`  ✓ ${demoUsers.length} 个演示好友 demo.friend.*@graphtutor.local`);

  if (UPDATE_PROFILE && config.targetProfile) {
    console.log('\n2️⃣  更新目标账号资料 / 等级 / 积分（SEED_UPDATE_PROFILE=1）…');
    await updateTargetProfile(targetId, config.targetProfile);
  } else if (targetExisted) {
    console.log('\n2️⃣  跳过资料修改（保留你现有昵称、等级、积分）');
  } else if (config.targetProfile) {
    console.log('\n2️⃣  新账号默认资料…');
    await updateTargetProfile(targetId, config.targetProfile);
  }

  if (shouldRun('social')) {
    console.log('\n3️⃣  好友 / 笔记…');
    await seedSocial(targetId, config, demoUsers);
  }

  if (shouldRun('wrong')) {
    console.log('\n4️⃣  错题本…');
    await seedWrongQuestions(targetId, config.wrongQuestionCount || 10);
  }

  if (shouldRun('plan')) {
    console.log('\n5️⃣  学习计划 / 打卡…');
    await seedStudyPlan(targetId, config);
  }

  if (shouldRun('review')) {
    console.log('\n6️⃣  复习计划…');
    await seedReviewPlan(targetId, config);
  }

  if (shouldRun('goals')) {
    console.log('\n7️⃣  学习目标…');
    await seedGoals(targetId, config.learningGoals);
  }

  if (shouldRun('favorites')) {
    console.log('\n8️⃣  收藏夹…');
    await seedFavorites(targetId, config.favoriteFolders);
  }

  if (shouldRun('records')) {
    console.log('\n9️⃣  答题记录（学习统计）…');
    await seedRecords(targetId, config.recordCount || 40, config.recordDaysBack || 14);
  }

  if (shouldRun('achievements')) {
    console.log('\n🔟 成就…');
    await seedAchievements(targetId, config.achievements);
  }

  if (shouldRun('notifications')) {
    console.log('\n1️⃣1️⃣ 通知…');
    await seedNotifications(targetId, config.notifications);
  }

  if (shouldRun('messages')) {
    console.log('\n1️⃣2️⃣ 私信…');
    await seedMessages(targetId, demoUsers, config.messages);
  }

  if (shouldRun('posts')) {
    console.log('\n1️⃣3️⃣ 学习动态…');
    await seedPosts(targetId, demoUsers, config.learningPosts);
  }

  if (shouldRun('discussions')) {
    console.log('\n1️⃣4️⃣ 社区讨论…');
    await seedDiscussions(targetId, demoUsers, config.discussions);
  }

  await printSummary(targetId);

  console.log('\n✅ 全部完成');
  console.log(`💡 用你的账号 ${TARGET_EMAIL} 登录 Web / 小程序即可查看导入的数据。`);
  console.log('💡 演示好友账号仅用于填充好友列表，无需登录它们。');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 导入失败:', err.message || err);
  process.exit(1);
});
