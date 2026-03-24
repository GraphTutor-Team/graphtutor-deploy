/**
 * GraphTutor V3.0 - 讨论详情页面
 * 
 * 功能：查看讨论详情和回复
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDiscussionDetail, addReply, likeDiscussion } from '../api/v3/discussions';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import MarkdownPreview from '../components/MarkdownPreview';

export default function DiscussionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [discussion, setDiscussion] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [likedReplies, setLikedReplies] = useState(new Set());

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
      await likeDiscussion(id);
      loadDiscussion();
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="讨论详情" />
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="p-6">
        <PageHeader title="讨论不存在" />
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
      <PageHeader title="讨论详情" />

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
              {discussion.bountyPoints > 0 && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                  🏅 悬赏 {discussion.bountyPoints} 积分
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">{discussion.title}</h1>
            <div className="text-sm text-slate-600 mb-4">
              {new Date(discussion.createdAt).toLocaleString('zh-CN')}
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
                className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 pt-4 border-t">
          <button
            onClick={handleLike}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-slate-50"
          >
            👍 {discussion.likeCount || 0}
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
                  <div className="text-sm text-slate-600">
                    {new Date(reply.createdAt).toLocaleString('zh-CN')}
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
                    onClick={async () => {
                      if (likedReplies.has(reply._id)) return;
                      try {
                        await likeReply(id, reply._id);
                        setLikedReplies(new Set([...likedReplies, reply._id]));
                        toast.success('点赞成功');
                        loadDiscussion();
                      } catch (err) {
                        console.error('点赞失败:', err);
                        toast.error('点赞失败');
                      }
                    }}
                    disabled={likedReplies.has(reply._id)}
                    className={`text-xs ${likedReplies.has(reply._id) ? 'text-green-600' : 'text-slate-500 hover:text-blue-600'}`}
                  >
                    👍 {reply.likeCount || 0}
                  </button>
                  {(discussion.userId === user?.id || discussion.userId === user?._id) && !reply.isBestAnswer && (
                    <button
                      onClick={async () => {
                        try {
                          await markBestAnswer(id, reply._id);
                          toast.success(discussion.bountyPoints > 0 ? `已采纳，回答者获得 ${discussion.bountyPoints} 积分` : '已标记为最佳答案');
                          loadDiscussion();
                        } catch (err) {
                          console.error('标记失败:', err);
                          toast.error(err.response?.data?.message || '标记失败');
                        }
                      }}
                      className="text-xs text-green-600 hover:underline"
                    >
                      设为最佳答案{discussion.bountyPoints > 0 ? `（回答者将获得 ${discussion.bountyPoints} 积分）` : ''}
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
            {replyingTo ? `回复 ${replyingTo.userId?.slice(-4) || '用户'}` : '发表回复'}
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

