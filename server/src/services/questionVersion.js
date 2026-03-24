/**
 * GraphTutor V3.0 - 题目版本控制服务
 * 
 * 功能：管理题目的版本历史，支持版本回滚和对比
 */

import Question from '../models/Question.js';
import QuestionVersion from '../models/QuestionVersion.js';

/**
 * 创建题目版本
 * @param {string} questionId - 题目ID
 * @param {string} userId - 修改人ID
 * @param {Object} changes - 变更内容
 * @param {string} reason - 修改原因
 * @returns {Promise<Object>} 创建的版本记录
 */
export async function createVersion(questionId, userId, changes = {}, reason = '') {
  try {
    // 获取当前题目
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error('题目不存在');
    }

    // 获取当前最大版本号
    const maxVersion = await QuestionVersion.findOne(
      { questionId: questionId },
      { version: 1 }
    )
      .sort({ version: -1 })
      .lean();

    const nextVersion = maxVersion ? maxVersion.version + 1 : 1;

    // 将当前题目内容作为快照
    const contentSnapshot = question.toObject();

    // 标记之前的版本为非当前版本
    await QuestionVersion.updateMany(
      { questionId: questionId, isCurrent: true },
      { $set: { isCurrent: false } }
    );

    // 创建新版本
    const version = await QuestionVersion.create({
      questionId: questionId,
      version: nextVersion,
      content: contentSnapshot,
      changedBy: userId,
      changeReason: reason,
      isCurrent: true,
    });

    return version;
  } catch (error) {
    console.error('createVersion error:', error);
    throw error;
  }
}

/**
 * 获取题目版本历史
 * @param {string} questionId - 题目ID
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 版本历史列表
 */
export async function getVersionHistory(questionId, options = {}) {
  try {
    const { limit = 50, includeContent = false } = options;

    const query = QuestionVersion.find({ questionId: questionId })
      .populate('changedBy', 'name email')
      .sort({ version: -1 })
      .limit(limit);

    if (!includeContent) {
      query.select('-content'); // 不包含内容快照（减少数据量）
    }

    const versions = await query.lean();

    return versions;
  } catch (error) {
    console.error('getVersionHistory error:', error);
    throw error;
  }
}

/**
 * 恢复题目到指定版本
 * @param {string} questionId - 题目ID
 * @param {number} versionId - 版本号
 * @param {string} userId - 操作人ID
 * @returns {Promise<Object>} 恢复后的题目
 */
export async function restoreVersion(questionId, versionId, userId) {
  try {
    // 获取指定版本
    const version = await QuestionVersion.findOne({
      questionId: questionId,
      version: versionId,
    }).lean();

    if (!version) {
      throw new Error('版本不存在');
    }

    // 创建当前版本的快照（保存恢复前的状态）
    await createVersion(questionId, userId, {}, `恢复到版本 ${versionId} 前的备份`);

    // 恢复题目内容
    const restoredContent = version.content;
    delete restoredContent._id;
    delete restoredContent.createdAt;
    delete restoredContent.updatedAt;

    const updated = await Question.findByIdAndUpdate(
      questionId,
      { $set: restoredContent },
      { new: true }
    );

    // 创建恢复操作的版本记录
    await QuestionVersion.create({
      questionId: questionId,
      version: (await QuestionVersion.countDocuments({ questionId: questionId })) + 1,
      content: updated.toObject(),
      changedBy: userId,
      changeReason: `从版本 ${versionId} 恢复`,
      isCurrent: true,
    });

    return updated;
  } catch (error) {
    console.error('restoreVersion error:', error);
    throw error;
  }
}

/**
 * 对比两个版本
 * @param {string} questionId - 题目ID
 * @param {number} versionId1 - 版本1
 * @param {number} versionId2 - 版本2
 * @returns {Promise<Object>} 对比结果
 */
export async function compareVersions(questionId, versionId1, versionId2) {
  try {
    const [version1, version2] = await Promise.all([
      QuestionVersion.findOne({
        questionId: questionId,
        version: versionId1,
      }).lean(),
      QuestionVersion.findOne({
        questionId: questionId,
        version: versionId2,
      }).lean(),
    ]);

    if (!version1 || !version2) {
      throw new Error('版本不存在');
    }

    const content1 = version1.content;
    const content2 = version2.content;

    // 对比字段变化
    const changes = {
      added: {},
      removed: {},
      modified: {},
    };

    // 对比所有字段
    const allKeys = new Set([
      ...Object.keys(content1),
      ...Object.keys(content2),
    ]);

    for (const key of allKeys) {
      const val1 = content1[key];
      const val2 = content2[key];

      if (val1 === undefined && val2 !== undefined) {
        changes.added[key] = val2;
      } else if (val1 !== undefined && val2 === undefined) {
        changes.removed[key] = val1;
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.modified[key] = {
          old: val1,
          new: val2,
        };
      }
    }

    return {
      version1: {
        version: versionId1,
        createdAt: version1.createdAt,
        changedBy: version1.changedBy,
        reason: version1.changeReason,
      },
      version2: {
        version: versionId2,
        createdAt: version2.createdAt,
        changedBy: version2.changedBy,
        reason: version2.changeReason,
      },
      changes,
    };
  } catch (error) {
    console.error('compareVersions error:', error);
    throw error;
  }
}

/**
 * 获取当前版本
 * @param {string} questionId - 题目ID
 * @returns {Promise<Object|null>} 当前版本
 */
export async function getCurrentVersion(questionId) {
  try {
    const version = await QuestionVersion.findOne({
      questionId: questionId,
      isCurrent: true,
    })
      .populate('changedBy', 'name email')
      .lean();

    return version;
  } catch (error) {
    console.error('getCurrentVersion error:', error);
    throw error;
  }
}

