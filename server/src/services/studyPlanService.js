/**
 * GraphTutor V3.0 - 学习计划服务
 * 
 * 功能：处理学习计划相关的业务逻辑
 */

import StudyPlan from '../models/StudyPlan.js';
import StudyTask from '../models/StudyTask.js';
import StudyCheckIn from '../models/StudyCheckIn.js';
import { addLearningExp } from './learningAvatarService.js';

// 确保模型被注册（避免循环依赖问题）
import '../models/index.js';

/**
 * 创建学习计划
 */
export async function createStudyPlan(userId, planData) {
  const {
    name,
    description,
    type,
    startDate,
    endDate,
    dailyTarget,
    subjectCodes,
    knowledgeNodeIds,
    reminders,
  } = planData;

  // 验证日期
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start >= end) {
    throw new Error('结束日期必须晚于开始日期');
  }

  // 创建计划
  const plan = await StudyPlan.create({
    userId,
    name,
    description: description || '',
    type: type || 'daily',
    startDate: start,
    endDate: end,
    dailyTarget: dailyTarget || 10,
    subjectCodes: Array.isArray(subjectCodes) ? subjectCodes : [],
    knowledgeNodeIds: Array.isArray(knowledgeNodeIds) ? knowledgeNodeIds : [],
    reminders: reminders || { enabled: false, times: [] },
    status: 'active',
  });

  // 生成每日任务
  await generateDailyTasks(plan);

  // 更新统计信息
  await plan.updateStats();

  return plan;
}

/**
 * 生成每日任务
 */
export async function generateDailyTasks(plan) {
  const tasks = [];
  const start = new Date(plan.startDate);
  const end = new Date(plan.endDate);
  const current = new Date(start);

  while (current <= end) {
    const task = await StudyTask.create({
      userId: plan.userId,
      planId: plan._id,
      date: new Date(current),
      type: 'practice',
      targetCount: plan.dailyTarget,
      completedCount: 0,
      subjectCodes: plan.subjectCodes,
      knowledgeNodeIds: plan.knowledgeNodeIds,
      status: 'pending',
    });
    tasks.push(task);

    current.setDate(current.getDate() + 1);
  }

  return tasks;
}

/**
 * 更新学习计划
 */
export async function updateStudyPlan(userId, planId, updates) {
  const plan = await StudyPlan.findOne({ _id: planId, userId });

  if (!plan) {
    throw new Error('学习计划不存在或无权限');
  }

  if (updates.name !== undefined) {
    plan.name = updates.name;
  }
  if (updates.description !== undefined) {
    plan.description = updates.description;
  }
  if (updates.status !== undefined) {
    plan.status = updates.status;
  }
  if (updates.dailyTarget !== undefined) {
    plan.dailyTarget = updates.dailyTarget;
  }
  if (updates.reminders !== undefined) {
    plan.reminders = updates.reminders;
  }

  await plan.save();
  return plan;
}

/**
 * 删除学习计划
 */
export async function deleteStudyPlan(userId, planId) {
  const plan = await StudyPlan.findOneAndDelete({ _id: planId, userId });

  if (!plan) {
    throw new Error('学习计划不存在或无权限');
  }

  // 删除相关任务和打卡记录
  await Promise.all([
    StudyTask.deleteMany({ planId }),
    StudyCheckIn.deleteMany({ planId }),
  ]);

  return true;
}

/**
 * 获取学习计划列表
 */
export async function getStudyPlans(userId, options = {}) {
  const { status, page = 1, limit = 20 } = options;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const [plans, total] = await Promise.all([
    StudyPlan.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    StudyPlan.countDocuments(query),
  ]);

  return {
    items: plans,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取学习计划详情
 */
export async function getStudyPlanDetail(userId, planId) {
  const plan = await StudyPlan.findOne({ _id: planId, userId }).lean();

  if (!plan) {
    throw new Error('学习计划不存在或无权限');
  }

  // 更新统计信息
  const planDoc = await StudyPlan.findById(planId);
  await planDoc.updateStats();
  const updatedPlan = await StudyPlan.findById(planId).lean();

  return updatedPlan;
}

/**
 * 获取某日的任务
 */
export async function getDailyTask(userId, planId, date) {
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);

  const task = await StudyTask.findOne({
    userId,
    planId,
    date: {
      $gte: taskDate,
      $lt: new Date(taskDate.getTime() + 24 * 60 * 60 * 1000),
    },
  }).lean();

  return task;
}

/**
 * 更新任务进度
 */
export async function updateTaskProgress(userId, taskId, completedCount) {
  const task = await StudyTask.findOne({ _id: taskId, userId });

  if (!task) {
    throw new Error('任务不存在或无权限');
  }

  task.completedCount = completedCount;
  if (completedCount >= task.targetCount) {
    task.status = 'completed';
    task.completedAt = new Date();
  } else if (completedCount > 0) {
    task.status = 'in_progress';
  }

  await task.save();

  // 更新计划统计
  const plan = await StudyPlan.findById(task.planId);
  if (plan) {
    await plan.updateStats();
  }

  return task;
}

/**
 * 打卡
 */
export async function checkIn(userId, planId, checkInData) {
  const { date, studyDuration, completedQuestions, correctQuestions, mood, summary, images } = checkInData;

  const checkInDate = new Date(date);
  checkInDate.setHours(0, 0, 0, 0);

  // 检查是否已打卡
  const existing = await StudyCheckIn.findOne({
    userId,
    planId,
    date: {
      $gte: checkInDate,
      $lt: new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  if (existing) {
    // 更新现有打卡记录
    existing.studyDuration = studyDuration || existing.studyDuration;
    existing.completedQuestions = completedQuestions || existing.completedQuestions;
    existing.correctQuestions = correctQuestions || existing.correctQuestions;
    existing.mood = mood || existing.mood;
    existing.summary = summary || existing.summary;
    existing.images = images || existing.images;
    await existing.save();
    return existing;
  }

  // 创建新打卡记录
  const checkIn = await StudyCheckIn.create({
    userId,
    planId,
    date: checkInDate,
    studyDuration: studyDuration || 0,
    completedQuestions: completedQuestions || 0,
    correctQuestions: correctQuestions || 0,
    mood: mood || 'normal',
    summary: summary || '',
    images: images || [],
  });

  // 学习角色经验：每日首次打卡 +15
  addLearningExp(userId, 15, 'checkin').catch(err => {
    console.error('学习经验更新失败:', err);
  });

  // 更新任务状态
  const task = await StudyTask.findOne({
    userId,
    planId,
    date: {
      $gte: checkInDate,
      $lt: new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  if (task) {
    task.completedCount = completedQuestions || 0;
    if (task.completedCount >= task.targetCount) {
      task.status = 'completed';
      task.completedAt = new Date();
    } else if (task.completedCount > 0) {
      task.status = 'in_progress';
    }
    await task.save();
  }

  // 更新计划统计
  const plan = await StudyPlan.findById(planId);
  if (plan) {
    await plan.updateStats();
  }

  return checkIn;
}

/**
 * 获取打卡记录
 */
export async function getCheckIns(userId, planId, options = {}) {
  const { startDate, endDate, page = 1, limit = 30 } = options;

  const query = { userId, planId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(startDate);
    }
    if (endDate) {
      query.date.$lte = new Date(endDate);
    }
  }

  const skip = (page - 1) * limit;
  const [checkIns, total] = await Promise.all([
    StudyCheckIn.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    StudyCheckIn.countDocuments(query),
  ]);

  return {
    items: checkIns,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取日历视图数据
 */
export async function getCalendarView(userId, planId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [tasks, checkIns] = await Promise.all([
    StudyTask.find({
      userId,
      planId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean(),
    StudyCheckIn.find({
      userId,
      planId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean(),
  ]);

  // 构建日历数据
  const calendarData = {};
  tasks.forEach(task => {
    const dateKey = new Date(task.date).toISOString().split('T')[0];
    calendarData[dateKey] = {
      ...calendarData[dateKey],
      task: {
        targetCount: task.targetCount,
        completedCount: task.completedCount,
        status: task.status,
      },
    };
  });

  checkIns.forEach(checkIn => {
    const dateKey = new Date(checkIn.date).toISOString().split('T')[0];
    calendarData[dateKey] = {
      ...calendarData[dateKey],
      checkIn: {
        studyDuration: checkIn.studyDuration,
        completedQuestions: checkIn.completedQuestions,
        mood: checkIn.mood,
      },
    };
  });

  return calendarData;
}

/**
 * 获取学习统计
 */
export async function getStudyStats(userId, options = {}) {
  const { startDate, endDate } = options;

  const query = { userId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(startDate);
    }
    if (endDate) {
      query.date.$lte = new Date(endDate);
    }
  }

  const stats = await StudyCheckIn.getUserCheckInStats(
    userId,
    startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate ? new Date(endDate) : new Date()
  );

  return stats;
}

