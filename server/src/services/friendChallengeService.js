/**
 * GraphTutor V3.0 - 好友挑战服务
 * 
 * 功能：处理好友挑战相关的业务逻辑
 */

import FriendChallenge from '../models/FriendChallenge.js';
import Friendship from '../models/Friendship.js';
import Record from '../models/Record.js';
import { createNotification } from './notificationService.js';

async function notifyChallenge(userId, title, content, challengeId) {
  try {
    await createNotification({
      userId: String(userId),
      type: 'system',
      title,
      content,
      relatedId: String(challengeId),
      link: '/friend-challenges',
    });
  } catch (err) {
    console.warn('好友挑战通知失败:', err.message);
  }
}

/**
 * 创建好友挑战
 */
export async function createFriendChallenge(creatorId, participantId, challengeData) {
  // 验证是否为好友关系
  const friendship = await Friendship.findOne({
    $or: [
      { user1Id: creatorId, user2Id: participantId, status: 'active' },
      { user1Id: participantId, user2Id: creatorId, status: 'active' },
    ],
  });

  if (!friendship) {
    throw new Error('只能向好友发起挑战');
  }

  // 验证结束时间
  if (new Date(challengeData.endDate) <= new Date()) {
    throw new Error('结束时间必须晚于当前时间');
  }

  const challenge = new FriendChallenge({
    creatorId,
    participantId,
    ...challengeData,
    status: 'pending',
  });

  await challenge.save();
  await challenge.populate('creatorId', 'name email avatarUrl');
  await challenge.populate('participantId', 'name email avatarUrl');
  const creatorName = challenge.creatorId?.name || '好友';
  await notifyChallenge(
    participantId,
    '收到好友挑战',
    `${creatorName} 邀请你参加「${challenge.title}」，目标是答对 ${challenge.target} 题。到好友挑战页接受后才开始计进度。`,
    challenge._id,
  );
  return challenge;
}

/**
 * 接受挑战
 */
export async function acceptChallenge(challengeId, userId) {
  const challenge = await FriendChallenge.findById(challengeId);
  if (!challenge) {
    throw new Error('挑战不存在');
  }

  if (challenge.participantId.toString() !== userId.toString()) {
    throw new Error('无权接受此挑战');
  }

  if (challenge.status !== 'pending') {
    throw new Error('挑战状态不正确');
  }

  challenge.status = 'active';
  challenge.startDate = new Date();
  await challenge.save();

  await challenge.populate('creatorId', 'name email avatarUrl');
  await challenge.populate('participantId', 'name email avatarUrl');
  const participantName = challenge.participantId?.name || '好友';
  await notifyChallenge(
    challenge.creatorId?._id || challenge.creatorId,
    '挑战已被接受',
    `${participantName} 接受了「${challenge.title}」。从现在起，答对的题会计入进度。`,
    challenge._id,
  );
  return challenge;
}

/**
 * 拒绝或取消挑战
 */
export async function cancelChallenge(challengeId, userId) {
  const challenge = await FriendChallenge.findById(challengeId);
  if (!challenge) {
    throw new Error('挑战不存在');
  }

  const isCreator = challenge.creatorId.toString() === userId.toString();
  const isParticipant = challenge.participantId.toString() === userId.toString();

  if (!isCreator && !isParticipant) {
    throw new Error('无权操作此挑战');
  }

  if (challenge.status === 'completed' || challenge.status === 'failed') {
    throw new Error('无法取消已完成的挑战');
  }

  challenge.status = 'cancelled';
  await challenge.save();

  return challenge;
}

/**
 * 获取用户的挑战列表
 */
export async function getUserChallenges(userId, options = {}) {
  const { status, type, page = 1, limit = 20 } = options;
  const query = {
    $or: [
      { creatorId: userId },
      { participantId: userId },
    ],
  };

  if (status) query.status = status;
  if (type) query.type = type;

  const skip = (page - 1) * limit;
  const [challenges, total] = await Promise.all([
    FriendChallenge.find(query)
      .populate('creatorId', 'name email avatarUrl')
      .populate('participantId', 'name email avatarUrl')
      .populate('winner', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FriendChallenge.countDocuments(query),
  ]);

  return {
    items: challenges,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取两个用户之间的挑战
 */
export async function getChallengesBetweenUsers(userId1, userId2) {
  return FriendChallenge.find({
    $or: [
      { creatorId: userId1, participantId: userId2 },
      { creatorId: userId2, participantId: userId1 },
    ],
  })
    .populate('creatorId', 'name email avatarUrl')
    .populate('participantId', 'name email avatarUrl')
    .populate('winner', 'name email')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * 更新挑战进度
 */
export async function updateChallengeProgress(challengeId, userId) {
  const challenge = await FriendChallenge.findById(challengeId);
  if (!challenge) {
    throw new Error('挑战不存在');
  }

  if (challenge.status !== 'active') {
    throw new Error('挑战未激活');
  }

  // 计算用户在挑战时间范围内的答题数量
  const startDate = challenge.startDate;
  const endDate = challenge.endDate;

  const isCreator = challenge.creatorId.toString() === userId.toString();
  const isParticipant = challenge.participantId.toString() === userId.toString();

  if (!isCreator && !isParticipant) {
    throw new Error('无权更新此挑战');
  }

  // 查询用户在挑战时间范围内的答题记录（只计正确题）
  const progress = await Record.countDocuments({
    userId,
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
    isCorrect: true,
  });

  // 更新进度
  if (isCreator) {
    challenge.creatorProgress = Math.min(progress, challenge.target);
  } else {
    challenge.participantProgress = Math.min(progress, challenge.target);
  }

  // 检查是否完成
  if (challenge.creatorProgress >= challenge.target && 
      challenge.participantProgress >= challenge.target) {
    challenge.status = 'completed';
    challenge.completedAt = new Date();
    // 判断获胜者
    if (challenge.creatorProgress > challenge.participantProgress) {
      challenge.winner = challenge.creatorId;
    } else if (challenge.participantProgress > challenge.creatorProgress) {
      challenge.winner = challenge.participantId;
    }
  } else if (new Date() > challenge.endDate) {
    // 超时未完成
    challenge.status = 'failed';
  }

  await challenge.save();

  return await FriendChallenge.findById(challenge._id)
    .populate('creatorId', 'name email avatarUrl')
    .populate('participantId', 'name email avatarUrl')
    .populate('winner', 'name email')
    .lean();
}

/**
 * 同步当前用户所有进行中挑战的进度（练习/考试交卷后调用）
 */
export async function syncActiveChallengeProgress(userId) {
  const challenges = await FriendChallenge.find({
    status: 'active',
    $or: [{ creatorId: userId }, { participantId: userId }],
  }).select('_id').lean();

  const updated = [];
  for (const item of challenges) {
    try {
      const challenge = await updateChallengeProgress(item._id, userId);
      updated.push({
        id: challenge._id || challenge.id || item._id,
        status: challenge.status,
        creatorProgress: challenge.creatorProgress,
        participantProgress: challenge.participantProgress,
        target: challenge.target,
      });
    } catch (err) {
      console.warn('[friendChallenge] sync one failed:', item._id, err.message);
    }
  }

  return {
    updatedCount: updated.length,
    challenges: updated,
  };
}

/**
 * 获取挑战统计
 */
export async function getChallengeStats(userId) {
  const [total, active, completed, won, lost] = await Promise.all([
    FriendChallenge.countDocuments({
      $or: [
        { creatorId: userId },
        { participantId: userId },
      ],
    }),
    FriendChallenge.countDocuments({
      $or: [
        { creatorId: userId },
        { participantId: userId },
      ],
      status: 'active',
    }),
    FriendChallenge.countDocuments({
      $or: [
        { creatorId: userId },
        { participantId: userId },
      ],
      status: 'completed',
    }),
    FriendChallenge.countDocuments({
      winner: userId,
      status: 'completed',
    }),
    FriendChallenge.countDocuments({
      $or: [
        { creatorId: userId },
        { participantId: userId },
      ],
      status: 'completed',
      winner: { $ne: userId, $nin: [null] },
    }),
  ]);

  return {
    total,
    active,
    completed,
    won,
    lost,
    winRate: completed > 0 ? (won / completed * 100).toFixed(1) : 0,
  };
}

