/**
 * 作者资料跳转：本人 → /profile，他人 → /users/:id（公开资料）
 */
export function resolveAuthorId(author) {
  if (author == null) return null;
  if (typeof author === 'object') {
    return author._id || author.id || null;
  }
  return author;
}

export function getAuthorProfilePath(author, currentUser) {
  const id = resolveAuthorId(author);
  if (!id) return null;
  const me = currentUser?.id || currentUser?._id;
  if (me && String(id) === String(me)) return '/profile';
  return `/users/${id}`;
}
