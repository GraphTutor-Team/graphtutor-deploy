/**
 * 为讨论/回复批量附加作者信息（name / avatarUrl）
 * userId 为字符串，无法直接 populate ObjectId ref
 */

import User from '../models/User.js';

/**
 * @param {Array<Object>} docs
 * @param {string} [userIdField='userId']
 * @returns {Promise<Array<Object>>}
 */
export async function attachAuthors(docs, userIdField = 'userId') {
  if (!Array.isArray(docs) || docs.length === 0) return docs || [];

  const ids = [...new Set(docs.map((d) => String(d[userIdField] || '')).filter(Boolean))];
  if (ids.length === 0) {
    return docs.map((d) => ({ ...d, author: null }));
  }

  const users = await User.find({ _id: { $in: ids } })
    .select('name avatarUrl email')
    .lean();

  const map = Object.fromEntries(
    users.map((u) => [
      String(u._id),
      {
        _id: u._id,
        name: u.name || u.email?.split('@')[0] || '用户',
        avatarUrl: u.avatarUrl || null,
      },
    ])
  );

  return docs.map((d) => ({
    ...d,
    author: map[String(d[userIdField])] || null,
  }));
}

/**
 * @param {Object} doc
 * @param {string} currentUserId
 * @returns {Object}
 */
export function withLikedByMe(doc, currentUserId) {
  if (!doc) return doc;
  const likedBy = Array.isArray(doc.likedBy) ? doc.likedBy.map(String) : [];
  return {
    ...doc,
    likedByMe: currentUserId ? likedBy.includes(String(currentUserId)) : false,
  };
}
