/**
 * GraphTutor V3.0 - 收藏服务
 * 
 * 功能：处理收藏相关的业务逻辑
 */

import Favorite from '../models/Favorite.js';
import FavoriteFolder from '../models/FavoriteFolder.js';
import Question from '../models/Question.js';

/**
 * 添加收藏
 */
export async function addFavorite(userId, questionId, folderId, notes = '', tags = []) {
  // 检查题目是否存在
  const question = await Question.findOne({ _id: questionId }).lean();
  if (!question) {
    question = await Question.findOne({ id: questionId }).lean();
  }
  if (!question) {
    throw new Error('题目不存在');
  }

  // 检查收藏夹是否存在
  const folder = await FavoriteFolder.findOne({ _id: folderId, userId });
  if (!folder) {
    throw new Error('收藏夹不存在');
  }

  // 检查是否已收藏
  const existing = await Favorite.findOne({ userId, questionId, folderId });
  if (existing) {
    throw new Error('题目已在此收藏夹中');
  }

  // 创建收藏
  const favorite = await Favorite.create({
    userId,
    questionId,
    folderId,
    notes: notes || '',
    tags: Array.isArray(tags) ? tags : [],
  });

  // 更新收藏夹题目数量
  await FavoriteFolder.findByIdAndUpdate(folderId, {
    $inc: { questionCount: 1 },
  });

  return favorite;
}

/**
 * 移除收藏
 */
export async function removeFavorite(userId, questionId, folderId) {
  const favorite = await Favorite.findOneAndDelete({
    userId,
    questionId,
    folderId,
  });

  if (!favorite) {
    throw new Error('收藏不存在');
  }

  // 更新收藏夹题目数量
  await FavoriteFolder.findByIdAndUpdate(folderId, {
    $inc: { questionCount: -1 },
  });

  return true;
}

/**
 * 检查是否已收藏
 */
export async function isFavorite(userId, questionId) {
  const favorites = await Favorite.find({ userId, questionId }).lean();
  return favorites.map(f => ({
    folderId: f.folderId,
    favoritedAt: f.favoritedAt,
  }));
}

/**
 * 获取收藏列表
 */
export async function getFavorites(userId, options = {}) {
  const {
    folderId,
    tags,
    searchKeyword,
    page = 1,
    limit = 20,
    sortBy = 'favoritedAt',
    sortOrder = 'desc',
  } = options;

  const query = { userId };

  if (folderId) {
    query.folderId = folderId;
  }
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  const skip = (page - 1) * limit;
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [favorites, total] = await Promise.all([
    Favorite.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('folderId', 'name color icon')
      .lean(),
    Favorite.countDocuments(query),
  ]);

  // 获取题目详情
  const questionIds = favorites.map(f => f.questionId);
  const questions = await Question.find({
    _id: { $in: questionIds },
  }).lean();

  const questionMap = new Map(questions.map(q => [String(q._id), q]));

  // 合并数据
  let result = favorites.map(fav => {
    const question = questionMap.get(String(fav.questionId));
    return {
      ...fav,
      question: question || null,
    };
  });

  // 如果有关键词搜索，在内存中过滤
  if (searchKeyword) {
    const keyword = searchKeyword.toLowerCase();
    result = result.filter(item => {
      const question = item.question;
      if (!question) return false;
      const content = (question.content || '').toLowerCase();
      const explain = (question.explain || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      return content.includes(keyword) || explain.includes(keyword) || notes.includes(keyword);
    });
  }

  return {
    items: result,
    total: searchKeyword ? result.length : total,
    page,
    limit,
    totalPages: Math.ceil((searchKeyword ? result.length : total) / limit),
  };
}

/**
 * 移动收藏到其他收藏夹
 */
export async function moveFavorite(userId, questionId, fromFolderId, toFolderId) {
  const favorite = await Favorite.findOne({
    userId,
    questionId,
    folderId: fromFolderId,
  });

  if (!favorite) {
    throw new Error('收藏不存在');
  }

  // 检查目标收藏夹是否存在
  const toFolder = await FavoriteFolder.findOne({ _id: toFolderId, userId });
  if (!toFolder) {
    throw new Error('目标收藏夹不存在');
  }

  // 检查目标收藏夹中是否已存在
  const existing = await Favorite.findOne({
    userId,
    questionId,
    folderId: toFolderId,
  });
  if (existing) {
    throw new Error('题目已在目标收藏夹中');
  }

  // 更新收藏夹
  favorite.folderId = toFolderId;
  await favorite.save();

  // 更新收藏夹题目数量
  await Promise.all([
    FavoriteFolder.findByIdAndUpdate(fromFolderId, {
      $inc: { questionCount: -1 },
    }),
    FavoriteFolder.findByIdAndUpdate(toFolderId, {
      $inc: { questionCount: 1 },
    }),
  ]);

  return favorite;
}

/**
 * 复制收藏到其他收藏夹
 */
export async function copyFavorite(userId, questionId, fromFolderId, toFolderId) {
  // 检查目标收藏夹是否存在
  const toFolder = await FavoriteFolder.findOne({ _id: toFolderId, userId });
  if (!toFolder) {
    throw new Error('目标收藏夹不存在');
  }

  // 检查目标收藏夹中是否已存在
  const existing = await Favorite.findOne({
    userId,
    questionId,
    folderId: toFolderId,
  });
  if (existing) {
    throw new Error('题目已在目标收藏夹中');
  }

  // 获取原收藏
  const original = await Favorite.findOne({
    userId,
    questionId,
    folderId: fromFolderId,
  });

  if (!original) {
    throw new Error('原收藏不存在');
  }

  // 创建新收藏
  const favorite = await Favorite.create({
    userId,
    questionId,
    folderId: toFolderId,
    notes: original.notes,
    tags: original.tags,
  });

  // 更新收藏夹题目数量
  await FavoriteFolder.findByIdAndUpdate(toFolderId, {
    $inc: { questionCount: 1 },
  });

  return favorite;
}

/**
 * 更新收藏备注和标签
 */
export async function updateFavorite(userId, questionId, folderId, updates) {
  const favorite = await Favorite.findOneAndUpdate(
    { userId, questionId, folderId },
    {
      notes: updates.notes !== undefined ? updates.notes : undefined,
      tags: updates.tags !== undefined ? updates.tags : undefined,
    },
    { new: true }
  );

  if (!favorite) {
    throw new Error('收藏不存在');
  }

  return favorite;
}

/**
 * 获取收藏统计
 */
export async function getFavoriteStats(userId) {
  return await Favorite.getUserStats(userId);
}

/**
 * 批量删除收藏
 */
export async function batchRemoveFavorites(userId, questionIds, folderId) {
  const result = await Favorite.deleteMany({
    userId,
    questionId: { $in: questionIds },
    folderId,
  });

  // 更新收藏夹题目数量
  if (result.deletedCount > 0) {
    await FavoriteFolder.findByIdAndUpdate(folderId, {
      $inc: { questionCount: -result.deletedCount },
    });
  }

  return result.deletedCount;
}

/**
 * 批量移动收藏
 */
export async function batchMoveFavorites(userId, questionIds, fromFolderId, toFolderId) {
  const result = await Favorite.updateMany(
    { userId, questionId: { $in: questionIds }, folderId: fromFolderId },
    { folderId: toFolderId }
  );

  // 更新收藏夹题目数量
  if (result.modifiedCount > 0) {
    await Promise.all([
      FavoriteFolder.findByIdAndUpdate(fromFolderId, {
        $inc: { questionCount: -result.modifiedCount },
      }),
      FavoriteFolder.findByIdAndUpdate(toFolderId, {
        $inc: { questionCount: result.modifiedCount },
      }),
    ]);
  }

  return result.modifiedCount;
}

