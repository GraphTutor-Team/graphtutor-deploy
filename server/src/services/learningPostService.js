/**
 * GraphTutor V3.0 - 学习动态服务
 * 
 * 功能：处理学习动态相关的业务逻辑
 */

import LearningPost from '../models/LearningPost.js';
import LearningPostComment from '../models/LearningPostComment.js';
import Friendship from '../models/Friendship.js';

/**
 * 创建学习动态
 */
export async function createLearningPost(userId, postData) {
  const post = new LearningPost({
    authorId: userId,
    ...postData,
  });

  await post.save();
  return await post.populate('authorId', 'name email avatar');
}

/**
 * 获取动态列表
 */
export async function getLearningPosts(userId, options = {}) {
  const { page = 1, limit = 20, type, visibility, authorId } = options;
  const skip = (page - 1) * limit;

  const query = {
    deleted: false,
  };

  // 如果指定了作者，只返回该作者的动态
  if (authorId) {
    query.authorId = authorId;
    // 作者自己的动态，可以查看所有可见性
  } else {
    // 获取好友动态和公开动态
    const friendships = await Friendship.find({
      $or: [
        { user1Id: userId, status: 'active' },
        { user2Id: userId, status: 'active' },
      ],
    }).lean();

    const friendIds = friendships.map((f) =>
      f.user1Id.toString() === userId ? f.user2Id : f.user1Id
    );
    friendIds.push(userId); // 包括自己

    query.$or = [
      { visibility: 'public' },
      { visibility: 'friends', authorId: { $in: friendIds } },
      { authorId: userId }, // 自己的动态
    ];
  }

  if (type) query.type = type;
  if (visibility && authorId === userId) query.visibility = visibility;

  const [posts, total] = await Promise.all([
    LearningPost.find(query)
      .populate('authorId', 'name email avatar')
      .populate('relatedData.achievementId', 'name icon description')
      .populate('relatedData.challengeId', 'title target status')
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LearningPost.countDocuments(query),
  ]);

  return {
    items: posts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取动态详情
 */
export async function getLearningPostById(postId, userId) {
  const post = await LearningPost.findOne({
    _id: postId,
    deleted: false,
  })
    .populate('authorId', 'name email avatar')
    .populate('relatedData.achievementId', 'name icon description')
    .populate('relatedData.challengeId', 'title target status')
    .lean();

  if (!post) {
    throw new Error('动态不存在');
  }

  // 检查可见性权限
  if (post.visibility === 'private' && post.authorId._id.toString() !== userId) {
    throw new Error('无权查看此动态');
  }

  if (post.visibility === 'friends') {
    const friendship = await Friendship.findOne({
      $or: [
        { user1Id: userId, user2Id: post.authorId._id, status: 'active' },
        { user1Id: post.authorId._id, user2Id: userId, status: 'active' },
      ],
    });

    if (!friendship && post.authorId._id.toString() !== userId) {
      throw new Error('无权查看此动态');
    }
  }

  return post;
}

/**
 * 点赞/取消点赞动态
 */
export async function toggleLikePost(postId, userId) {
  const post = await LearningPost.findById(postId);
  if (!post) {
    throw new Error('动态不存在');
  }

  await post.like(userId);
  return await LearningPost.findById(postId)
    .populate('authorId', 'name email avatar')
    .populate('relatedData.achievementId', 'name icon description')
    .lean();
}

/**
 * 分享动态
 */
export async function sharePost(postId) {
  const post = await LearningPost.findById(postId);
  if (!post) {
    throw new Error('动态不存在');
  }

  await post.incrementShare();
  return post;
}

/**
 * 删除动态
 */
export async function deleteLearningPost(postId, userId) {
  const post = await LearningPost.findById(postId);
  if (!post) {
    throw new Error('动态不存在');
  }

  if (post.authorId.toString() !== userId) {
    throw new Error('无权删除此动态');
  }

  post.deleted = true;
  post.deletedAt = new Date();
  await post.save();

  return post;
}

/**
 * 创建评论
 */
export async function createComment(postId, userId, commentData) {
  const post = await LearningPost.findById(postId);
  if (!post) {
    throw new Error('动态不存在');
  }

  const comment = new LearningPostComment({
    postId,
    authorId: userId,
    ...commentData,
  });

  await comment.save();

  // 更新动态评论数
  post.commentCount += 1;
  await post.save();

  return await comment.populate('authorId', 'name email avatar');
}

/**
 * 获取评论列表
 */
export async function getComments(postId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    LearningPostComment.find({
      postId,
      parentId: null, // 只获取顶级评论
      deleted: false,
    })
      .populate('authorId', 'name email avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LearningPostComment.countDocuments({
      postId,
      parentId: null,
      deleted: false,
    }),
  ]);

  // 获取每个评论的回复
  for (const comment of comments) {
    const replies = await LearningPostComment.find({
      parentId: comment._id,
      deleted: false,
    })
      .populate('authorId', 'name email avatar')
      .sort({ createdAt: 1 })
      .limit(5)
      .lean();
    comment.replies = replies;
  }

  return {
    items: comments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 点赞/取消点赞评论
 */
export async function toggleLikeComment(commentId, userId) {
  const comment = await LearningPostComment.findById(commentId);
  if (!comment) {
    throw new Error('评论不存在');
  }

  await comment.like(userId);
  return await LearningPostComment.findById(commentId)
    .populate('authorId', 'name email avatar')
    .lean();
}

/**
 * 删除评论
 */
export async function deleteComment(commentId, userId) {
  const comment = await LearningPostComment.findById(commentId);
  if (!comment) {
    throw new Error('评论不存在');
  }

  if (comment.authorId.toString() !== userId) {
    throw new Error('无权删除此评论');
  }

  comment.deleted = true;
  comment.deletedAt = new Date();
  await comment.save();

  // 更新动态评论数
  const post = await LearningPost.findById(comment.postId);
  if (post) {
    post.commentCount = Math.max(0, post.commentCount - 1);
    await post.save();
  }

  return comment;
}

