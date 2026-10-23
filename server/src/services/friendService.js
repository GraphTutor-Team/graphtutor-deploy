/**
 * GraphTutor V3.0 - 好友服务
 * 
 * 作用：处理好友相关的业务逻辑
 * 关联文件：
 *   - models/FriendRequest.js (好友请求模型)
 *   - models/Friendship.js (好友关系模型)
 *   - models/User.js (用户模型)
 *   - routes/v3/friends.js (好友API路由)
 * 技术栈：
 *   - Mongoose ODM
 *   - MongoDB聚合查询
 */

import FriendRequest from '../models/FriendRequest.js';
import Friendship from '../models/Friendship.js';
import User from '../models/User.js';
import { getUserLearningStats } from './userStats.js';

function pageWindow(page, limit, fallbackLimit) {
  const size = Math.min(100, Math.max(1, Number(limit) || fallbackLimit));
  const current = Math.max(1, Number(page) || 1);
  return { page: current, limit: size, skip: (current - 1) * size };
}

/**
 * 发送好友请求
 * @param {string} fromUserId - 发送者ID
 * @param {string} toUserId - 接收者ID
 * @param {string} message - 请求消息（可选）
 * @returns {Promise<Object>} 创建的好友请求
 */
export async function sendFriendRequest(fromUserId, toUserId, message = '') {
  // 检查是否已经是好友
  const existingFriendship = await Friendship.findFriendship(fromUserId, toUserId);
  if (existingFriendship) {
    throw new Error('你们已经是好友了');
  }

  // 检查是否有待处理的请求
  const existingRequest = await FriendRequest.findOne({
    $or: [
      { fromUserId, toUserId, status: 'pending' },
      { fromUserId: toUserId, toUserId: fromUserId, status: 'pending' },
    ],
  });

  if (existingRequest) {
    throw new Error('已存在待处理的好友请求');
  }

  // 检查接收者是否允许好友请求
  const toUser = await User.findById(toUserId);
  if (toUser && !toUser.friendSettings?.allowFriendRequests) {
    throw new Error('该用户不允许接收好友请求');
  }

  // 创建好友请求
  const request = await FriendRequest.create({
    fromUserId,
    toUserId,
    message,
    status: 'pending',
  });

  return request.populate('fromUserId', 'name email avatarUrl');
}

/**
 * 接受好友请求
 * @param {string} requestId - 请求ID
 * @param {string} userId - 接受者ID（用于验证）
 * @returns {Promise<Object>} 创建的好友关系
 */
export async function acceptFriendRequest(requestId, userId) {
  const request = await FriendRequest.findById(requestId);
  
  if (!request) {
    throw new Error('好友请求不存在');
  }

  if (request.toUserId.toString() !== userId) {
    throw new Error('无权操作此请求');
  }

  if (request.status !== 'pending') {
    throw new Error('该请求已处理');
  }

  // 接受请求
  await request.accept();

  // 创建好友关系
  const friendship = await Friendship.createFriendship(
    request.fromUserId,
    request.toUserId
  );

  // 删除其他相关的待处理请求（如果有）
  await FriendRequest.updateMany(
    {
      $or: [
        { fromUserId: request.fromUserId, toUserId: request.toUserId },
        { fromUserId: request.toUserId, toUserId: request.fromUserId },
      ],
      status: 'pending',
      _id: { $ne: requestId },
    },
    { status: 'cancelled' }
  );

  return {
    request,
    friendship: await friendship.populate([
      { path: 'user1Id', select: 'name email avatarUrl' },
      { path: 'user2Id', select: 'name email avatarUrl' },
    ]),
  };
}

/**
 * 拒绝好友请求
 * @param {string} requestId - 请求ID
 * @param {string} userId - 拒绝者ID（用于验证）
 * @returns {Promise<Object>} 更新的请求
 */
export async function rejectFriendRequest(requestId, userId) {
  const request = await FriendRequest.findById(requestId);
  
  if (!request) {
    throw new Error('好友请求不存在');
  }

  if (request.toUserId.toString() !== userId) {
    throw new Error('无权操作此请求');
  }

  if (request.status !== 'pending') {
    throw new Error('该请求已处理');
  }

  await request.reject();
  return request;
}

/**
 * 取消好友请求
 * @param {string} requestId - 请求ID
 * @param {string} userId - 取消者ID（用于验证）
 * @returns {Promise<Object>} 更新的请求
 */
export async function cancelFriendRequest(requestId, userId) {
  const request = await FriendRequest.findById(requestId);
  
  if (!request) {
    throw new Error('好友请求不存在');
  }

  if (request.fromUserId.toString() !== userId) {
    throw new Error('只能取消自己发送的请求');
  }

  if (request.status !== 'pending') {
    throw new Error('该请求已处理，无法取消');
  }

  await request.cancel();
  return request;
}

/**
 * 获取好友列表
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Object>} 好友列表
 */
export async function getFriendsList(userId, options = {}) {
  const { status = 'active' } = options;
  const { page, limit, skip } = pageWindow(options.page, options.limit, 20);

  const friendships = await Friendship.find({
    $or: [
      { user1Id: userId, status },
      { user2Id: userId, status },
    ],
  })
    .populate('user1Id', 'name email avatarUrl school major grade bio')
    .populate('user2Id', 'name email avatarUrl school major grade bio')
    .sort({ lastInteractionAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // 格式化好友列表，返回对方用户信息
  const friends = friendships.map(friendship => {
    const friend = friendship.user1Id._id.toString() === userId.toString()
      ? friendship.user2Id
      : friendship.user1Id;
    
    return {
      ...friend,
      friendshipId: friendship._id,
      createdAt: friendship.createdAt,
      lastInteractionAt: friendship.lastInteractionAt,
    };
  });

  const total = await Friendship.countDocuments({
    $or: [
      { user1Id: userId, status },
      { user2Id: userId, status },
    ],
  });

  return {
    items: friends,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取好友请求列表
 * @param {string} userId - 用户ID
 * @param {string} type - 类型：received（收到的）、sent（发送的）
 * @param {Object} options - 查询选项
 * @returns {Promise<Object>} 请求列表
 */
export async function getFriendRequests(userId, type = 'received', options = {}) {
  const { status = 'pending' } = options;
  const { page, limit, skip } = pageWindow(options.page, options.limit, 20);

  const query = { status };
  if (type === 'received') {
    query.toUserId = userId;
  } else {
    query.fromUserId = userId;
  }

  const requests = await FriendRequest.find(query)
    .populate('fromUserId', 'name email avatarUrl')
    .populate('toUserId', 'name email avatarUrl')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await FriendRequest.countDocuments(query);

  return {
    items: requests,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 删除好友
 * @param {string} userId - 用户ID
 * @param {string} friendId - 好友ID
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteFriend(userId, friendId) {
  const friendship = await Friendship.findFriendship(userId, friendId);
  
  if (!friendship) {
    throw new Error('你们不是好友');
  }

  await Friendship.deleteOne({ _id: friendship._id });
  
  return { success: true };
}

/**
 * 屏蔽好友
 * @param {string} userId - 用户ID
 * @param {string} friendId - 好友ID
 * @returns {Promise<Object>} 屏蔽结果
 */
export async function blockFriend(userId, friendId) {
  const friendship = await Friendship.findFriendship(userId, friendId);
  
  if (!friendship) {
    // 如果不是好友，创建屏蔽关系
    const newFriendship = await Friendship.createFriendship(userId, friendId);
    await newFriendship.block(userId);
    return newFriendship;
  }

  await friendship.block(userId);
  return friendship;
}

/**
 * 检查两个用户是否是好友
 * @param {string} userId1 - 用户1 ID
 * @param {string} userId2 - 用户2 ID
 * @returns {Promise<boolean>} 是否是好友
 */
export async function areFriends(userId1, userId2) {
  const friendship = await Friendship.findFriendship(userId1, userId2);
  return !!friendship && friendship.status === 'active';
}

/**
 * 获取共同好友
 * @param {string} userId1 - 用户1 ID
 * @param {string} userId2 - 用户2 ID
 * @returns {Promise<Array>} 共同好友列表
 */
export async function getMutualFriends(userId1, userId2) {
  // 获取用户1的好友ID列表
  const user1Friendships = await Friendship.find({
    $or: [
      { user1Id: userId1, status: 'active' },
      { user2Id: userId1, status: 'active' },
    ],
  }).lean();

  const user1FriendIds = user1Friendships.map(f => 
    f.user1Id.toString() === userId1.toString() ? f.user2Id : f.user1Id
  );

  // 获取用户2的好友ID列表
  const user2Friendships = await Friendship.find({
    $or: [
      { user1Id: userId2, status: 'active' },
      { user2Id: userId2, status: 'active' },
    ],
  }).lean();

  const user2FriendIds = user2Friendships.map(f => 
    f.user1Id.toString() === userId2.toString() ? f.user2Id : f.user1Id
  );

  // 找出共同好友
  const mutualFriendIds = user1FriendIds.filter(id => 
    user2FriendIds.some(id2 => id.toString() === id2.toString())
  );

  // 获取共同好友的详细信息
  const mutualFriends = await User.find({
    _id: { $in: mutualFriendIds },
  }).select('name email avatarUrl school major grade').lean();

  return mutualFriends;
}

/**
 * 搜索用户（用于好友发现）
 * @param {string} userId - 当前用户ID
 * @param {string} keyword - 搜索关键词（姓名、邮箱）
 * @param {Object} options - 查询选项
 * @returns {Promise<Object>} 搜索结果
 */
export async function searchUsers(userId, keyword, options = {}) {
  const { page, limit, skip } = pageWindow(options.page, options.limit, 20);

  if (!keyword || keyword.trim().length === 0) {
    return { items: [], total: 0, page, limit, totalPages: 0 };
  }

  // 构建搜索条件
  const searchRegex = new RegExp(keyword.trim(), 'i');
  const searchQuery = {
    $or: [
      { name: searchRegex },
      { email: searchRegex },
      { school: searchRegex },
      { major: searchRegex },
    ],
    _id: { $ne: userId }, // 排除自己
  };

  // 获取当前用户的好友ID列表
  const friendships = await Friendship.find({
    $or: [
      { user1Id: userId, status: 'active' },
      { user2Id: userId, status: 'active' },
    ],
  }).lean();

  const friendIds = friendships.map(f => 
    f.user1Id.toString() === userId.toString() ? f.user2Id : f.user1Id
  );

  // 获取待处理的好友请求
  const pendingRequests = await FriendRequest.find({
    $or: [
      { fromUserId: userId, status: 'pending' },
      { toUserId: userId, status: 'pending' },
    ],
  }).lean();

  const pendingUserIds = pendingRequests.map(r => 
    r.fromUserId.toString() === userId.toString() ? r.toUserId : r.fromUserId
  );

  // 搜索用户
  const users = await User.find(searchQuery)
    .select('name email avatarUrl school major grade bio')
    .skip(skip)
    .limit(limit)
    .lean();

  // 添加关系状态
  const usersWithStatus = users.map(user => {
    const isFriend = friendIds.some(id => id.toString() === user._id.toString());
    const hasPendingRequest = pendingUserIds.some(id => id.toString() === user._id.toString());
    
    let relationship = 'none';
    if (isFriend) {
      relationship = 'friend';
    } else if (hasPendingRequest) {
      const request = pendingRequests.find(r => 
        (r.fromUserId.toString() === userId && r.toUserId.toString() === user._id.toString()) ||
        (r.toUserId.toString() === userId && r.fromUserId.toString() === user._id.toString())
      );
      relationship = request.fromUserId.toString() === userId ? 'request_sent' : 'request_received';
    }

    return {
      ...user,
      relationship,
    };
  });

  const total = await User.countDocuments(searchQuery);

  return {
    items: usersWithStatus,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取推荐好友
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} 推荐好友列表
 */
export async function getRecommendedFriends(userId, options = {}) {
  const { limit = 10 } = options;

  // 获取当前用户的好友ID列表
  const friendships = await Friendship.find({
    $or: [
      { user1Id: userId, status: 'active' },
      { user2Id: userId, status: 'active' },
    ],
  }).lean();

  const friendIds = friendships.map(f => 
    f.user1Id.toString() === userId.toString() ? f.user2Id : f.user1Id
  );
  friendIds.push(userId); // 排除自己和已有好友

  // 获取待处理的好友请求
  const pendingRequests = await FriendRequest.find({
    $or: [
      { fromUserId: userId, status: 'pending' },
      { toUserId: userId, status: 'pending' },
    ],
  }).lean();

  const pendingUserIds = pendingRequests.map(r => 
    r.fromUserId.toString() === userId.toString() ? r.toUserId : r.fromUserId
  );

  // 获取用户信息（用于匹配推荐条件）
  const user = await User.findById(userId).lean();

  // 推荐策略1：相同学校或专业
  const sameSchoolOrMajor = await User.find({
    _id: { $nin: [...friendIds, ...pendingUserIds] },
    $or: [
      user.school ? { school: user.school } : {},
      user.major ? { major: user.major } : {},
    ],
  })
    .select('name email avatarUrl school major grade bio')
    .limit(limit)
    .lean();

  // 推荐策略2：共同好友多的用户
  // 获取好友的好友（排除自己和已有好友）
  const friendsOfFriends = await Friendship.aggregate([
    {
      $match: {
        $or: [
          { user1Id: { $in: friendIds }, status: 'active' },
          { user2Id: { $in: friendIds }, status: 'active' },
        ],
      },
    },
    {
      $project: {
        friendId: {
          $cond: {
            if: { $eq: ['$user1Id', userId] },
            then: '$user2Id',
            else: '$user1Id',
          },
        },
      },
    },
    {
      $group: {
        _id: '$friendId',
        mutualCount: { $sum: 1 },
      },
    },
    {
      $match: {
        _id: { $nin: [...friendIds, ...pendingUserIds] },
      },
    },
    {
      $sort: { mutualCount: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  const recommendedIds = [
    ...sameSchoolOrMajor.map(u => u._id),
    ...friendsOfFriends.map(f => f._id),
  ].slice(0, limit);

  // 获取推荐用户详细信息
  const recommendedUsers = await User.find({
    _id: { $in: recommendedIds },
  })
    .select('name email avatarUrl school major grade bio')
    .lean();

  // 添加共同好友数量
  const usersWithMutualCount = await Promise.all(
    recommendedUsers.map(async (user) => {
      const mutualFriends = await getMutualFriends(userId, user._id);
      return {
        ...user,
        mutualFriendsCount: mutualFriends.length,
      };
    })
  );

  // 按共同好友数量排序
  usersWithMutualCount.sort((a, b) => b.mutualFriendsCount - a.mutualFriendsCount);

  return usersWithMutualCount;
}


/**
 * 获取共同学习内容
 * @param {string} userId1 - 用户1 ID
 * @param {string} userId2 - 用户2 ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Object>} 共同学习内容
 */
export async function getCommonLearningContent(userId1, userId2, options = {}) {
  // 检查是否是好友
  const isFriend = await areFriends(userId1, userId2);
  if (!isFriend) {
    throw new Error('只能查看好友的共同学习内容');
  }

  const { limit = 20 } = options;

  // 获取共同练习的题目
  const Record = (await import('../models/Record.js')).default;
  const commonQuestions = await Record.aggregate([
    {
      $match: {
        userId: { $in: [userId1, userId2] },
      },
    },
    {
      $group: {
        _id: '$questionId',
        users: { $addToSet: '$userId' },
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        users: { $size: 2 }, // 两个用户都练习过
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: 'questions',
        localField: '_id',
        foreignField: '_id',
        as: 'question',
      },
    },
    {
      $unwind: {
        path: '$question',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        questionId: '$_id',
        question: {
          title: '$question.title',
          type: '$question.type',
          difficulty: '$question.difficulty',
        },
        practiceCount: '$count',
      },
    },
  ]);

  // 获取共同的知识点（通过题目关联）
  const Question = (await import('../models/Question.js')).default;
  const questionIds = commonQuestions.map(q => q.questionId);
  const commonKnowledgeNodes = await Record.aggregate([
    {
      $match: {
        userId: { $in: [userId1, userId2] },
        questionId: { $in: questionIds },
      },
    },
    {
      $lookup: {
        from: 'questions',
        localField: 'questionId',
        foreignField: '_id',
        as: 'question',
      },
    },
    {
      $unwind: {
        path: '$question',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$question.knowledgeNodeIds',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$question.knowledgeNodeIds',
        users: { $addToSet: '$userId' },
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        users: { $size: 2 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: 'knowledgenodes',
        localField: '_id',
        foreignField: '_id',
        as: 'node',
      },
    },
    {
      $unwind: {
        path: '$node',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        nodeId: '$_id',
        node: {
          name: '$node.name',
          code: '$node.code',
        },
        practiceCount: '$count',
      },
    },
  ]);

  return {
    commonQuestions: commonQuestions.slice(0, limit),
    commonKnowledgeNodes: commonKnowledgeNodes.slice(0, limit),
    totalCommonQuestions: commonQuestions.length,
    totalCommonNodes: commonKnowledgeNodes.length,
  };
}

/**
 * 获取好友学习统计
 * @param {string} userId - 当前用户ID
 * @param {string} friendId - 好友ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Object>} 好友学习统计
 */
export async function getFriendLearningStats(userId, friendId, options = {}) {
  // 检查是否是好友
  const isFriend = await areFriends(userId, friendId);
  if (!isFriend) {
    throw new Error('你们不是好友，无法查看学习数据');
  }

  // 检查好友是否允许显示学习数据
  const friend = await User.findById(friendId).lean();
  if (friend && !friend.friendSettings?.showLearningData) {
    throw new Error('该好友不允许查看学习数据');
  }

  // 获取好友学习统计
  const stats = await getUserLearningStats(friendId, options);
  return stats;
}

/**
 * 获取两个用户的学习数据对比
 * @param {string} userId1 - 用户1 ID
 * @param {string} userId2 - 用户2 ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Object>} 学习数据对比
 */
export async function compareLearningData(userId1, userId2, options = {}) {
  // 检查是否是好友
  const isFriend = await areFriends(userId1, userId2);
  if (!isFriend) {
    throw new Error('你们不是好友，无法对比学习数据');
  }

  // 检查双方是否允许显示学习数据
  const [user1, user2] = await Promise.all([
    User.findById(userId1).lean(),
    User.findById(userId2).lean(),
  ]);

  if (user1 && !user1.friendSettings?.showLearningData) {
    throw new Error('你未允许好友查看学习数据');
  }
  if (user2 && !user2.friendSettings?.showLearningData) {
    throw new Error('该好友不允许查看学习数据');
  }

  // 获取双方学习统计
  const [stats1, stats2] = await Promise.all([
    getUserLearningStats(userId1, options),
    getUserLearningStats(userId2, options),
  ]);

  // 计算对比数据
  const comparison = {
    records: {
      user1: stats1.records,
      user2: stats2.records,
      difference: {
        total: stats1.records.total - stats2.records.total,
        correct: stats1.records.correct - stats2.records.correct,
        accuracy: stats1.records.accuracy - stats2.records.accuracy,
        totalTimeMinutes: stats1.records.totalTimeMinutes - stats2.records.totalTimeMinutes,
      },
    },
    wrongQuestions: {
      user1: stats1.wrongQuestions,
      user2: stats2.wrongQuestions,
      difference: {
        total: stats1.wrongQuestions.total - stats2.wrongQuestions.total,
        mastered: stats1.wrongQuestions.mastered - stats2.wrongQuestions.mastered,
      },
    },
    checkIn: {
      user1: stats1.checkIn,
      user2: stats2.checkIn,
      difference: {
        totalDays: stats1.checkIn.totalDays - stats2.checkIn.totalDays,
        totalDuration: stats1.checkIn.totalDuration - stats2.checkIn.totalDuration,
        totalQuestions: stats1.checkIn.totalQuestions - stats2.checkIn.totalQuestions,
      },
    },
    goals: {
      user1: stats1.goals,
      user2: stats2.goals,
    },
    notes: {
      user1: stats1.notes,
      user2: stats2.notes,
      difference: stats1.notes - stats2.notes,
    },
  };

  return {
    user1: {
      id: userId1,
      name: stats1.userName,
    },
    user2: {
      id: userId2,
      name: stats2.userName,
    },
    period: stats1.period,
    comparison,
  };
}

/**
 * 获取好友排行榜
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} 好友排行榜
 */
export async function getFriendsLeaderboard(userId, options = {}) {
  const { type = 'total', period = 'all', limit = 50 } = options;

  // 获取用户的好友ID列表
  const friendships = await Friendship.find({
    $or: [
      { user1Id: userId, status: 'active' },
      { user2Id: userId, status: 'active' },
    ],
  }).lean();

  const friendIds = friendships.map(f => 
    f.user1Id.toString() === userId.toString() ? f.user2Id : f.user1Id
  );
  friendIds.push(userId); // 包含自己

  // 导入排行榜服务
  const leaderboardModule = await import('../routes/v3/leaderboard.js');
  
  // 获取完整排行榜
  let leaderboard = [];
  const dateFilter = getDateFilter(period);

  const Record = (await import('../models/Record.js')).default;
  
  switch (type) {
    case 'questions':
      leaderboard = await getQuestionsLeaderboardForFriends(friendIds, dateFilter, limit);
      break;
    case 'accuracy':
      leaderboard = await getAccuracyLeaderboardForFriends(friendIds, dateFilter, limit);
      break;
    case 'total':
    default:
      leaderboard = await getTotalLeaderboardForFriends(friendIds, dateFilter, limit);
      break;
  }

  // 标记当前用户
  return leaderboard.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    isMe: item.userId.toString() === userId.toString(),
  }));
}

/**
 * 获取日期过滤器
 */
function getDateFilter(period) {
  if (period === 'week') {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return { createdAt: { $gte: startOfWeek } };
  }
  if (period === 'month') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return { createdAt: { $gte: startOfMonth } };
  }
  return {}; // all
}

/**
 * 获取好友综合排行榜
 */
async function getTotalLeaderboardForFriends(friendIds, dateFilter, limit) {
  const Record = (await import('../models/Record.js')).default;
  const User = (await import('../models/User.js')).default;

  const pipeline = [
    {
      $match: {
        userId: { $in: friendIds },
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: '$userId',
        totalQuestions: { $sum: 1 },
        correctQuestions: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        totalScore: {
          $sum: {
            $cond: ['$isCorrect', 10, -2],
          },
        },
      },
    },
    {
      $project: {
        userId: '$_id',
        totalQuestions: 1,
        correctQuestions: 1,
        accuracy: {
          $cond: [
            { $gt: ['$totalQuestions', 0] },
            { $multiply: [{ $divide: ['$correctQuestions', '$totalQuestions'] }, 100] },
            0,
          ],
        },
        score: '$totalScore',
      },
    },
    { $sort: { score: -1, accuracy: -1 } },
    { $limit: limit },
  ];

  const results = await Record.aggregate(pipeline);
  const userIds = results.map(r => r.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  return results.map(r => ({
    userId: r.userId,
    name: userMap.get(r.userId.toString())?.name || `用户${r.userId.toString().slice(-4)}`,
    score: r.score || 0,
    totalQuestions: r.totalQuestions || 0,
    accuracy: r.accuracy || 0,
  }));
}

/**
 * 获取好友答题量排行榜
 */
async function getQuestionsLeaderboardForFriends(friendIds, dateFilter, limit) {
  const Record = (await import('../models/Record.js')).default;
  const User = (await import('../models/User.js')).default;

  const pipeline = [
    {
      $match: {
        userId: { $in: friendIds },
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: '$userId',
        total: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: limit },
  ];

  const results = await Record.aggregate(pipeline);
  const userIds = results.map(r => r._id);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  return results.map(r => ({
    userId: r._id,
    name: userMap.get(r._id.toString())?.name || `用户${r._id.toString().slice(-4)}`,
    score: r.total || 0,
  }));
}

/**
 * 获取好友正确率排行榜
 */
async function getAccuracyLeaderboardForFriends(friendIds, dateFilter, limit) {
  const Record = (await import('../models/Record.js')).default;
  const User = (await import('../models/User.js')).default;

  const pipeline = [
    {
      $match: {
        userId: { $in: friendIds },
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: '$userId',
        total: { $sum: 1 },
        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
      },
    },
    {
      $project: {
        userId: '$_id',
        accuracy: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
            0,
          ],
        },
        total: 1,
      },
    },
    { $match: { total: { $gte: 20 } } },
    { $sort: { accuracy: -1, total: -1 } },
    { $limit: limit },
  ];

  const results = await Record.aggregate(pipeline);
  const userIds = results.map(r => r.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  return results.map(r => ({
    userId: r.userId,
    name: userMap.get(r.userId.toString())?.name || `用户${r.userId.toString().slice(-4)}`,
    score: Math.round(r.accuracy * 100) / 100,
    total: r.total,
  }));
}

/**
 * 获取用户公开资料（含与当前用户的关系）
 * @param {string} viewerId
 * @param {string} targetUserId
 */
export async function getPublicUserProfile(viewerId, targetUserId) {
  if (!targetUserId) {
    throw new Error('用户 ID 无效');
  }
  const target = await User.findById(targetUserId)
    .select('name avatarUrl school major grade bio friendSettings')
    .lean();
  if (!target) {
    const err = new Error('用户不存在');
    err.status = 404;
    throw err;
  }

  const isSelf = viewerId && String(viewerId) === String(target._id);
  let relationship = 'none';
  if (isSelf) {
    relationship = 'self';
  } else if (viewerId) {
    const isFriend = await areFriends(viewerId, target._id);
    if (isFriend) {
      relationship = 'friend';
    } else {
      const pending = await FriendRequest.findOne({
        status: 'pending',
        $or: [
          { fromUserId: viewerId, toUserId: target._id },
          { fromUserId: target._id, toUserId: viewerId },
        ],
      }).lean();
      if (pending) {
        relationship = String(pending.fromUserId) === String(viewerId)
          ? 'request_sent'
          : 'request_received';
      }
    }
  }

  const showFull =
    isSelf || relationship === 'friend' || target.friendSettings?.showProfile !== false;

  const profile = {
    _id: target._id,
    name: target.name || '用户',
    avatarUrl: target.avatarUrl || null,
    relationship,
    allowFriendRequests: target.friendSettings?.allowFriendRequests !== false,
  };

  if (showFull) {
    profile.school = target.school || null;
    profile.major = target.major || null;
    profile.grade = target.grade || null;
    profile.bio = target.bio || null;
  } else {
    profile.profileRestricted = true;
  }

  return profile;
}
