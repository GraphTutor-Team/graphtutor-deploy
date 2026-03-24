/**
 * GraphTutor V3.0 - 学习角色养成服务（学习元宇宙 MVP）
 *
 * 用户选择学习角色，通过答题、打卡等行为获得经验并升级
 */

import User from '../models/User.js';

/** 到达某等级所需累计经验：level 1 = 0, level 2 = 100, level 3 = 250, level 4 = 450... */
const EXP_BASE = 100;
export function getExpRequiredForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(EXP_BASE * (level - 1) * (1 + (level - 1) * 0.5));
}

/** 当前等级升到下一级所需总经验差值 */
export function getExpToNextLevel(level) {
  return getExpRequiredForLevel(level + 1) - getExpRequiredForLevel(level);
}

/** 根据累计经验计算当前等级 */
export function getLevelFromExp(totalExp) {
  let level = 1;
  while (getExpRequiredForLevel(level + 1) <= totalExp) level++;
  return level;
}

/**
 * 增加学习经验并处理升级（learningExp 为累计总经验）
 * @param {string} userId
 * @param {number} amount - 经验值
 * @param {string} [source] - 来源：answer | checkin | plan
 * @returns {Promise<{ level, exp, expToNextLevel, leveledUp }>}
 */
export async function addLearningExp(userId, amount, source = 'answer') {
  if (!userId || amount <= 0) return null;
  const user = await User.findById(userId);
  if (!user) return null;

  const beforeLevel = user.learningLevel ?? getLevelFromExp(user.learningExp ?? 0);
  const totalExp = (user.learningExp ?? 0) + amount;
  const level = getLevelFromExp(totalExp);

  user.learningExp = totalExp;
  user.learningLevel = level;
  await user.save();

  const expToNext = getExpToNextLevel(level);
  const expInLevel = totalExp - getExpRequiredForLevel(level);
  return {
    level,
    exp: expInLevel,
    totalExp,
    expToNextLevel: expToNext,
    leveledUp: level > beforeLevel,
  };
}

/**
 * 获取学习角色展示信息（用于 GET /me 与前端进度条）
 */
export async function getLearningAvatar(userId) {
  const user = await User.findById(userId).select('learningRole learningLevel learningExp').lean();
  if (!user) return null;
  const totalExp = user.learningExp ?? 0;
  const level = user.learningLevel ?? getLevelFromExp(totalExp);
  const expForCurrent = getExpRequiredForLevel(level);
  const expForNext = getExpRequiredForLevel(level + 1);
  const expToNext = expForNext - totalExp;
  const progressInLevel = expForNext > expForCurrent
    ? (totalExp - expForCurrent) / (expForNext - expForCurrent)
    : 0;
  return {
    role: user.learningRole ?? '学者',
    level,
    exp: totalExp - expForCurrent,
    totalExp,
    expToNextLevel: Math.max(0, expToNext),
    progressInLevel: Math.min(1, Math.max(0, progressInLevel)),
  };
}
