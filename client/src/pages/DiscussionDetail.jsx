/**
 * GraphTutor V3.0 - 讨论详情页面
 * 
 * 功能：查看讨论详情和回复
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDiscussionDetail, addReply, likeDiscussion, likeReply, markBestAnswer } from '../api/v3/discussions';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import SocialHubNav from '../components/SocialHubNav';
import MarkdownPreview from '../components/MarkdownPreview';
import AuthorLink from '../components/AuthorLink';
import { bountyIsOpen, bountyText } from '../utils/bountyStatus';

export default function DiscussionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [discussion, setDiscussion] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    if (id) {
      loadDiscussion();
    }
  }, [id]);

  const loadDiscussion = async () => {
    try {
      setLoading(true);
      const result = await getDiscussionDetail(id);
      setDiscussion(result.data);
      setReplies(result.data.replies || []);
    } catch (err) {
      console.error('加载讨论失败:', err);
      toast.error('加载讨论失败');
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async () => {
    if (!replyContent.trim()) {
      toast.error('请输入回复内容');
      return;
    }

    try {
      const result = await addReply(id, replyContent, replyingTo?._id || null);
      toast.success('回复成功');
      setReplyContent('');
      setReplyingTo(null);
      loadDiscussion();
    } catch (err) {
      console.error('回复失败:', err);
      toast.error(err.response?.data?.message || '回复失败');
    }
  };

  const handleLike = async () => {
    try {
      const result = await likeDiscussion(id);
      if (result?.data) {
        setDiscussion((prev) => ({ ...prev, ...result.data }));
      } else {
        loadDiscussion();
      }
    } catch (err) {
      console.error('点赞失败:', err);
      toast.error(err.response?.data?.message || '点赞失败');
    }
  };

  const handleLikeReply = async (replyId) => {
    try {
      const result = await likeReply(id, replyId);
      if (result?.data) {
        setReplies((prev) =>
          prev.map((r) => (r._id === replyId ? { ...r, ...result.data } : r))
        );
      } else {
        loadDiscussion();
      }
    } catch (err) {
      console.error('点赞失败:', err);
      toast.error(err.response?.data?.message || '点赞失败');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="讨论详情" backTo="/community" />
        <SocialHubNav />
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="p-6">
        <PageHeader title="讨论不存在" backTo="/community" />
        <SocialHubNav />
        <div className="text-center py-12">
          <button
            onClick={() => navigate('/community')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回社区
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader title="讨论详情" backTo="/community" />
      <SocialHubNav />

      {/* 讨论内容 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                {discussion.type === 'question' ? '题目讨论' :
                 discussion.type === 'knowledge' ? '知识点讨论' : '一般讨论'}
              </span>
              {discussion.isPinned && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                  置顶
                </span>
              )}
              {discussion.isResolved && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  已解决
                </span>
              )}
              {bountyText(discussion) && (
                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
                  {bountyText(discussion)}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">{discussion.title}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-600 mb-4">
              {discussion.author && (
                <AuthorLink author={discussion.author} className="flex items-center gap-2">
                  {discussion.author.avatarUrl ? (
                    <img
                      src={discussion.author.avatarUrl}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="h-7 w-7 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                      {(discussion.author.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="font-medium text-slate-800">{discussion.author.name}</span>
                </AuthorLink>
              )}
              <span>{new Date(discussion.createdAt).toLocaleString('zh-CN')}</span>
            </div>
          </div>
        </div>

        <div className="prose max-w-none mb-4">
          <MarkdownPreview text={discussion.content} />
        </div>

        {discussion.tags && discussion.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {discussion.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 pt-4 border-t">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-slate-50 ${
              discussion.likedByMe ? 'border-blue-400 bg-blue-50 text-blue-700' : ''
            }`}
          >
            👍 {discussion.likeCount || 0}
            {discussion.likedByMe ? ' · 已赞' : ''}
          </button>
          <span className="text-sm text-slate-600">
            👁️ {discussion.viewCount || 0} | 💬 {discussion.replyCount || 0}
          </span>
          {discussion.questionId && (
            <Link
              to={`/questions/${discussion.questionId}/detail`}
              className="text-sm text-blue-600 hover:underline"
            >
              查看题目 →
            </Link>
          )}
        </div>
      </div>

      {/* 回复列表 */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-lg font-bold mb-4">回复 ({replies.length})</h2>
        {replies.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            暂无回复，成为第一个回复的人吧！
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map((reply) => (
              <div
                key={reply._id}
                className={`p-4 border rounded-lg ${
                  reply.isBestAnswer ? 'bg-green-50 border-green-300' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    {reply.author ? (
                      <AuthorLink
                        author={reply.author}
                        className="flex items-center gap-1.5 font-medium text-slate-800"
                      >
                        {reply.author.avatarUrl ? (
                          <img src={reply.author.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <span className="h-6 w-6 rounded-full bg-slate-400 text-white text-xs flex items-center justify-center">
                            {(reply.author.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                        {reply.author.name}
                      </AuthorLink>
                    ) : (
                      <span>用户</span>
                    )}
                    <span>·</span>
                    <span>{new Date(reply.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  {reply.isBestAnswer && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      最佳答案
                    </span>
                  )}
                </div>
                <div className="prose max-w-none">
                  <MarkdownPreview text={reply.content} />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setReplyingTo(reply)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    回复
                  </button>
                  <button
                    onClick={() => handleLikeReply(reply._id)}
                    className={`text-xs ${reply.likedByMe ? 'text-blue-600 font-medium' : 'text-slate-500 hover:text-blue-600'}`}
                  >
                    👍 {reply.likeCount || 0}{reply.likedByMe ? ' · 已赞' : ''}
                  </button>
                  {(discussion.userId === user?.id || discussion.userId === user?._id) && !reply.isBestAnswer && discussion.bountyStatus !== 'awarded' && (
                    <button
                      onClick={async () => {
                        try {
                          const result = await markBestAnswer(id, reply._id);
                          const awarded = result?.data?.awardedPoints || 0;
                          toast.success(awarded > 0 ? `已采纳，回答者获得 ${awarded} 积分` : '已标记为最佳答案');
                          loadDiscussion();
                        } catch (err) {
                          console.error('标记失败:', err);
                          toast.error(err.response?.data?.message || '标记失败');
                        }
                      }}
                      className="text-xs text-green-600 hover:underline"
                    >
                      设为最佳答案{bountyIsOpen(discussion) ? `（回答者将获得 ${discussion.bountyPoints} 积分）` : ''}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 回复表单 */}
      {user && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-bold mb-4">
            {replyingTo ? `回复 ${replyingTo.author?.name || '用户'}` : '发表回复'}
          </h3>
          {replyingTo && (
            <div className="mb-3 p-2 bg-slate-50 rounded text-sm text-slate-600">
              回复：{replyingTo.content.substring(0, 50)}...
              <button
                onClick={() => setReplyingTo(null)}
                className="ml-2 text-blue-600 hover:underline"
              >
                取消
              </button>
            </div>
          )}
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mb-3"
            rows="6"
            placeholder="请输入回复内容（支持Markdown）"
          />
          <div className="flex justify-end">
            <button
              onClick={handleAddReply}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              发表回复
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

