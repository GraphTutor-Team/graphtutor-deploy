/**
 * GraphTutor V3.0 - 学习动态卡片组件
 * 
 * 功能：显示单个学习动态
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  toggleLikePost,
  sharePost,
  deleteLearningPost,
  getComments,
  createComment,
  toggleLikeComment,
  deleteComment,
} from '../api/v3/learningPosts';
import { toast } from '../utils/toast';
import Icon from './common/Icon';
import AuthorLink from './AuthorLink';

export default function LearningPostCard({ post, onUpdate }) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    // 检查是否已点赞
    const liked = post.likes?.some(
      (like) => like.userId?._id === user?.id || like.userId === user?.id
    );
    setIsLiked(liked);
    setLikeCount(post.likeCount || 0);
  }, [post, user]);

  const handleLike = async () => {
    try {
      setLoading(true);
      const res = await toggleLikePost(post._id);
      setIsLiked(!isLiked);
      setLikeCount(res.data?.likeCount || likeCount);
    } catch (err) {
      console.error('点赞失败:', err);
      toast.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await sharePost(post._id);
      toast.success('分享成功');
    } catch (err) {
      console.error('分享失败:', err);
      toast.error('分享失败');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这条动态吗？')) return;
    try {
      await deleteLearningPost(post._id);
      toast.success('动态已删除');
      onUpdate?.();
    } catch (err) {
      console.error('删除失败:', err);
      toast.error(err.response?.data?.message || '删除失败');
    }
  };

  const loadComments = async () => {
    if (comments.length > 0) return; // 已加载过
    try {
      setCommentLoading(true);
      const res = await getComments(post._id);
      setComments(res.data?.items || []);
    } catch (err) {
      console.error('加载评论失败:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleShowComments = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      setCommentLoading(true);
      const res = await createComment(post._id, { content: commentContent });
      setComments((prev) => [res.data?.data, ...prev]);
      setCommentContent('');
      toast.success('评论成功');
    } catch (err) {
      console.error('评论失败:', err);
      toast.error('评论失败');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const res = await toggleLikeComment(commentId);
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? res.data?.data : c))
      );
    } catch (err) {
      console.error('点赞评论失败:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('确定要删除这条评论吗？')) return;
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      toast.success('评论已删除');
    } catch (err) {
      console.error('删除评论失败:', err);
      toast.error('删除失败');
    }
  };

  const authorId = typeof post.authorId === 'object' 
    ? post.authorId?._id || post.authorId
    : post.authorId;
  const isAuthor = authorId?.toString() === user?.id;
  const authorName = typeof post.authorId === 'object'
    ? post.authorId?.name || post.authorId?.email || '未知用户'
    : '未知用户';
  const authorAvatar = typeof post.authorId === 'object' ? post.authorId?.avatarUrl : null;

  return (
    <div className="card p-6  transition-shadow">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <AuthorLink author={post.authorId} className="flex items-center space-x-3 min-w-0">
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt={authorName}
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {authorName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(post.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>
        </AuthorLink>
        {isAuthor && (
          <button
            onClick={handleDelete}
            className="text-slate-400 hover:text-red-600"
          >
            <Icon name="trash-2" className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 内容 */}
      {post.title && (
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {post.title}
        </h3>
      )}
      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-4">
        {post.content}
      </p>

      {/* 图片 */}
      {post.images && post.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {post.images.map((img, idx) => (
            <img
              key={idx}
              src={img.url}
              alt={img.alt || `图片${idx + 1}`}
              className="rounded-lg w-full h-48 object-cover"
            />
          ))}
        </div>
      )}

      {/* 关联数据 */}
      {post.relatedData?.achievementId && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Icon name="award" className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              解锁成就：{post.relatedData.achievementId.name}
            </span>
          </div>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex items-center space-x-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleLike}
          disabled={loading}
          className={`flex items-center space-x-2 ${
            isLiked ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'
          } hover:text-red-600`}
        >
          <Icon name={isLiked ? 'heart' : 'heart'} className="h-5 w-5" />
          <span>{likeCount}</span>
        </button>
        <button
          onClick={handleShowComments}
          className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-blue-600"
        >
          <Icon name="message-circle" className="h-5 w-5" />
          <span>{post.commentCount || 0}</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-blue-600"
        >
          <Icon name="share-2" className="h-5 w-5" />
          <span>{post.shareCount || 0}</span>
        </button>
      </div>

      {/* 评论区域 */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          {/* 评论输入 */}
          <form onSubmit={handleSubmitComment} className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="写下你的评论..."
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={commentLoading || !commentContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </form>

          {/* 评论列表 */}
          {commentLoading && comments.length === 0 ? (
            <div className="text-center py-4 text-slate-500">加载中...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-slate-500">暂无评论</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => {
                const commentAuthorId = typeof comment.authorId === 'object'
                  ? comment.authorId?._id || comment.authorId
                  : comment.authorId;
                const isCommentAuthor = commentAuthorId?.toString() === user?.id;
                const commentAuthorName = typeof comment.authorId === 'object'
                  ? comment.authorId?.name || comment.authorId?.email || '未知用户'
                  : '未知用户';
                const commentAuthorAvatar = typeof comment.authorId === 'object'
                  ? comment.authorId?.avatarUrl
                  : null;
                const isCommentLiked = comment.likes?.some(
                  (like) => like.userId?._id === user?.id || like.userId === user?.id
                );

                return (
                  <div key={comment._id} className="flex items-start space-x-3">
                    {commentAuthorAvatar ? (
                      <img
                        src={commentAuthorAvatar}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {commentAuthorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <AuthorLink
                          author={comment.authorId}
                          className="font-semibold text-sm text-slate-900 dark:text-slate-100"
                        >
                          {commentAuthorName}
                        </AuthorLink>
                        <span className="text-xs text-slate-500">
                          {new Date(comment.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {comment.content}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <button
                          onClick={() => handleLikeComment(comment._id)}
                          className={`text-xs ${
                            isCommentLiked ? 'text-red-600' : 'text-slate-500'
                          }`}
                        >
                          点赞 {comment.likeCount || 0}
                        </button>
                        {isCommentAuthor && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-xs text-red-600"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

