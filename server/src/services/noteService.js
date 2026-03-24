/**
 * GraphTutor V3.0 - 笔记服务
 * 
 * 功能：处理笔记相关的业务逻辑
 */

import Note from '../models/Note.js';
import NoteLike from '../models/NoteLike.js';
import NoteFavorite from '../models/NoteFavorite.js';
import Question from '../models/Question.js';
import crypto from 'crypto';

/**
 * 创建笔记
 */
export async function createNote(userId, noteData) {
  const { type, questionId, knowledgeNodeId, title, content, summary, tags, isPublic } = noteData;

  // 验证类型和关联ID
  if (type === 'question' && !questionId) {
    throw new Error('题目笔记必须关联题目ID');
  }
  if (type === 'knowledge' && !knowledgeNodeId) {
    throw new Error('知识点笔记必须关联知识点ID');
  }

  // 验证题目是否存在
  if (questionId) {
    const question = await Question.findOne({ _id: questionId }).lean();
    if (!question) {
      const questionById = await Question.findOne({ id: questionId }).lean();
      if (!questionById) {
        throw new Error('题目不存在');
      }
    }
  }

  // 检查是否已存在相同类型的笔记
  if (type === 'question' && questionId) {
    const existing = await Note.findOne({ userId, type: 'question', questionId });
    if (existing) {
      throw new Error('该题目已有笔记，请编辑现有笔记');
    }
  }

  const note = await Note.create({
    userId,
    type,
    questionId: questionId || null,
    knowledgeNodeId: knowledgeNodeId || null,
    title,
    content,
    summary: typeof summary === 'string' ? summary.slice(0, 500) : '',
    tags: Array.isArray(tags) ? tags : [],
    isPublic: isPublic || false,
    lastEditedAt: new Date(),
  });

  return note;
}

/**
 * 更新笔记
 */
export async function updateNote(userId, noteId, updates) {
  const note = await Note.findOne({ _id: noteId, userId });

  if (!note) {
    throw new Error('笔记不存在或无权限');
  }

  if (updates.title !== undefined) {
    note.title = updates.title;
  }
  if (updates.content !== undefined) {
    note.content = updates.content;
  }
  if (updates.tags !== undefined) {
    note.tags = Array.isArray(updates.tags) ? updates.tags : [];
  }
  if (updates.isPublic !== undefined) {
    note.isPublic = updates.isPublic;
  }
  if (updates.summary !== undefined) {
    note.summary = typeof updates.summary === 'string' ? updates.summary.slice(0, 500) : '';
  }

  note.lastEditedAt = new Date();

  await note.save();
  return note;
}

/**
 * 删除笔记
 */
export async function deleteNote(userId, noteId) {
  const note = await Note.findOneAndDelete({ _id: noteId, userId });

  if (!note) {
    throw new Error('笔记不存在或无权限');
  }

  // 删除相关的点赞记录
  await NoteLike.deleteMany({ noteId });

  return true;
}

/**
 * 获取笔记详情
 */
export async function getNoteDetail(noteId, userId = null) {
  const note = await Note.findById(noteId).lean();

  if (!note) {
    throw new Error('笔记不存在');
  }

  // 检查权限
  if (!note.isPublic && note.userId !== userId) {
    throw new Error('无权限访问此笔记');
  }

  // 如果是公开笔记，增加浏览次数
  if (note.isPublic && userId && userId !== note.userId) {
    await Note.findByIdAndUpdate(noteId, { $inc: { viewCount: 1 } });
  }

  // 检查当前用户是否已点赞和收藏
  let isLiked = false;
  let isFavorited = false;
  if (userId) {
    const [like, favorite] = await Promise.all([
      NoteLike.findOne({ userId, noteId }),
      NoteFavorite.findOne({ userId, noteId }),
    ]);
    isLiked = !!like;
    isFavorited = !!favorite;
  }

  return {
    ...note,
    isLiked,
    isFavorited,
  };
}

/**
 * 搜索笔记
 */
export async function searchNotes(userId, query, options = {}) {
  return await Note.searchNotes(userId, query, options);
}

/**
 * 获取用户的笔记列表
 */
export async function getUserNotes(userId, options = {}) {
  return await searchNotes(userId, null, { ...options, userId });
}

/**
 * 获取题目的笔记
 */
export async function getQuestionNote(userId, questionId) {
  const note = await Note.findOne({ userId, type: 'question', questionId }).lean();
  return note;
}

/**
 * 获取知识点的笔记列表
 */
export async function getKnowledgeNotes(userId, knowledgeNodeId) {
  const notes = await Note.find({
    userId,
    type: 'knowledge',
    knowledgeNodeId,
  })
    .sort({ createdAt: -1 })
    .lean();
  return notes;
}

/**
 * 点赞笔记
 */
export async function likeNote(userId, noteId) {
  const note = await Note.findById(noteId);

  if (!note) {
    throw new Error('笔记不存在');
  }

  if (!note.isPublic) {
    throw new Error('只能点赞公开笔记');
  }

  // 检查是否已点赞
  const existing = await NoteLike.findOne({ userId, noteId });
  if (existing) {
    throw new Error('已点赞');
  }

  // 创建点赞记录
  await NoteLike.create({ userId, noteId });

  // 更新笔记点赞数
  note.likeCount += 1;
  await note.save();

  return true;
}

/**
 * 取消点赞
 */
export async function unlikeNote(userId, noteId) {
  const like = await NoteLike.findOneAndDelete({ userId, noteId });

  if (!like) {
    throw new Error('未点赞');
  }

  // 更新笔记点赞数
  const note = await Note.findById(noteId);
  if (note) {
    note.likeCount = Math.max(0, note.likeCount - 1);
    await note.save();
  }

  return true;
}

/**
 * 收藏笔记
 */
export async function favoriteNote(userId, noteId) {
  const note = await Note.findById(noteId);

  if (!note) {
    throw new Error('笔记不存在');
  }

  if (!note.isPublic) {
    throw new Error('只能收藏公开笔记');
  }

  // 检查是否已收藏
  const existing = await NoteFavorite.findOne({ userId, noteId });
  if (existing) {
    throw new Error('已收藏');
  }

  // 创建收藏记录
  await NoteFavorite.create({ userId, noteId });

  // 更新笔记收藏数
  note.favoriteCount = (note.favoriteCount || 0) + 1;
  await note.save();

  return true;
}

/**
 * 取消收藏笔记
 */
export async function unfavoriteNote(userId, noteId) {
  const favorite = await NoteFavorite.findOneAndDelete({ userId, noteId });

  if (!favorite) {
    throw new Error('未收藏');
  }

  // 更新笔记收藏数
  const note = await Note.findById(noteId);
  if (note) {
    note.favoriteCount = Math.max(0, (note.favoriteCount || 0) - 1);
    await note.save();
  }

  return true;
}

/**
 * 检查用户是否已收藏笔记
 */
export async function isNoteFavorited(userId, noteId) {
  const favorite = await NoteFavorite.findOne({ userId, noteId });
  return !!favorite;
}

/**
 * 获取用户收藏的笔记列表
 */
export async function getFavoriteNotes(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * limit;
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [favorites, total] = await Promise.all([
    NoteFavorite.find({ userId })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('noteId')
      .lean(),
    NoteFavorite.countDocuments({ userId }),
  ]);

  // 过滤掉已删除的笔记
  const notes = favorites
    .map(f => f.noteId)
    .filter(note => note && note.isPublic);

  return {
    items: notes,
    total: notes.length,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 生成分享链接
 */
export async function generateShareLink(userId, noteId) {
  const note = await Note.findOne({ _id: noteId, userId });

  if (!note) {
    throw new Error('笔记不存在或无权限');
  }

  // 如果笔记不是公开的，先设置为公开
  if (!note.isPublic) {
    note.isPublic = true;
  }

  // 生成分享token
  note.generateShareToken();
  await note.save();

  return {
    shareToken: note.shareToken,
    shareUrl: `/notes/share/${note.shareToken}`,
    expiresAt: note.shareExpiresAt,
  };
}

/**
 * 通过分享token获取笔记
 */
export async function getNoteByShareToken(shareToken) {
  const note = await Note.findOne({ shareToken });

  if (!note) {
    throw new Error('分享链接不存在');
  }

  // 检查分享链接是否有效
  if (!note.shareToken || !note.shareExpiresAt) {
    throw new Error('分享链接无效');
  }
  if (new Date() >= note.shareExpiresAt) {
    throw new Error('分享链接已过期');
  }

  // 增加浏览次数
  note.viewCount = (note.viewCount || 0) + 1;
  await note.save();

  // 填充用户信息
  const User = (await import('../models/User.js')).default;
  const populatedNote = await Note.findById(note._id)
    .populate('userId', 'name email')
    .lean();

  return populatedNote;
}

/**
 * 获取笔记统计
 */
export async function getNoteStats(userId) {
  const [total, byType, byTag] = await Promise.all([
    Note.countDocuments({ userId }),
    Note.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]),
    Note.aggregate([
      { $match: { userId } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    total,
    byType: byType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    popularTags: byTag,
  };
}

/**
 * 导出笔记为Markdown
 */
export async function exportNoteAsMarkdown(noteId, userId) {
  const note = await Note.findOne({ _id: noteId, userId }).lean();

  if (!note) {
    throw new Error('笔记不存在或无权限');
  }

  const metadata = [
    `# ${note.title}`,
    '',
    `**类型**: ${note.type === 'question' ? '题目笔记' : '知识点笔记'}`,
    `**创建时间**: ${new Date(note.createdAt).toLocaleString()}`,
    `**最后编辑**: ${new Date(note.lastEditedAt).toLocaleString()}`,
  ];

  if (note.questionId) {
    metadata.push(`**题目ID**: ${note.questionId}`);
  }
  if (note.knowledgeNodeId) {
    metadata.push(`**知识点ID**: ${note.knowledgeNodeId}`);
  }
  if (note.tags && note.tags.length > 0) {
    metadata.push(`**标签**: ${note.tags.join(', ')}`);
  }

  metadata.push('', '---', '');

  const markdown = [
    ...metadata,
    note.content,
  ].join('\n');

  return markdown;
}

/**
 * 批量导出笔记为Markdown
 */
export async function exportNotesAsMarkdown(userId, noteIds = null) {
  const query = { userId };
  if (noteIds && noteIds.length > 0) {
    query._id = { $in: noteIds };
  }

  const notes = await Note.find(query).sort({ createdAt: -1 }).lean();

  const sections = notes.map((note, index) => {
    const metadata = [
      `# ${note.title}`,
      '',
      `**类型**: ${note.type === 'question' ? '题目笔记' : '知识点笔记'}`,
      `**创建时间**: ${new Date(note.createdAt).toLocaleString()}`,
      `**最后编辑**: ${new Date(note.lastEditedAt).toLocaleString()}`,
    ];

    if (note.questionId) {
      metadata.push(`**题目ID**: ${note.questionId}`);
    }
    if (note.knowledgeNodeId) {
      metadata.push(`**知识点ID**: ${note.knowledgeNodeId}`);
    }
    if (note.tags && note.tags.length > 0) {
      metadata.push(`**标签**: ${note.tags.join(', ')}`);
    }

    metadata.push('', '---', '');

    return [
      ...metadata,
      note.content,
    ].join('\n');
  });

  return sections.join('\n\n');
}

