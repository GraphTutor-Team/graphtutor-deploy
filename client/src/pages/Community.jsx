/**
 * GraphTutor V3.0 - 学习社区页面
 * 
 * 功能：题目讨论、心得分享、问答互助
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SocialHubNav from '../components/SocialHubNav';
import AuthorLink from '../components/AuthorLink';
import { toast } from '../utils/toast';
import { getDiscussions, createDiscussion } from '../api/v3/discussions';
import LoginPrompt from '../components/common/LoginPrompt';

export default function Community() {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all'); // all, question, knowledge, general
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'general',
    questionId: '',
    knowledgeNodeId: '',
    title: '',
    content: '',
    tags: [],
    bountyPoints: 0,
  });
  const [bountyOnly, setBountyOnly] = useState(false);

  useEffect(() => {
    loadDiscussions();
  }, [selectedType, searchKeyword, bountyOnly]);

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedType !== 'all') params.type = selectedType;
      if (searchKeyword) params.searchKeyword = searchKeyword;
      if (bountyOnly) params.bountyOnly = 'true';

      const result = await getDiscussions(params);
      setDiscussions(result.data?.items || []);
    } catch (err) {
      console.error('加载讨论失败:', err);
      toast.error('加载讨论失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscussion = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入标题');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('请输入内容');
      return;
    }

    try {
      await createDiscussion(formData);
      toast.success('发布成功');
      setShowCreateModal(false);
      setFormData({
        type: 'general',
        questionId: '',
        knowledgeNodeId: '',
        title: '',
        content: '',
        tags: [],
        bountyPoints: 0,
      });
      loadDiscussions();
    } catch (err) {
      console.error('发布失败:', err);
      toast.error(err.response?.data?.message || '发布失败');
    }
  };

  if (!user) {
    return (
      <LoginPrompt
        title="登录后参与社区"
        description="登录后可浏览讨论、发帖求助，也可以先看使用教程或去练习。"
      />
    );
  }

  return (
    <div className="page-shell">
      <PageHeader title="学习社区" subtitle="题目讨论、心得分享、问答互助" />

      <SocialHubNav />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link to="/learning-posts" className="btn btn-outline">
          学习动态
        </Link>
        <Link to="/leaderboard" className="btn btn-outline">
          排行榜
        </Link>
      </div>

      {/* 筛选和搜索 */}
      <div className="surface !p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {['all', 'question', 'knowledge', 'general'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {type === 'all' ? '全部' :
                 type === 'question' ? '题目讨论' :
                 type === 'knowledge' ? '知识点讨论' : '一般讨论'}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="搜索讨论..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="input flex-1 min-w-[200px]"
          />
          <button
            type="button"
            onClick={() => setBountyOnly(!bountyOnly)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${bountyOnly ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200'}`}
          >
            悬赏
          </button>
          {user?.points != null && (
            <span className="text-sm text-slate-600 dark:text-slate-400">我的积分：{user.points}</span>
          )}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            + 发布讨论
          </button>
        </div>
      </div>

      {/* 讨论列表 */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">加载中...</div>
      ) : discussions.length === 0 ? (
        <div className="surface text-center !py-12">
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">暂无讨论</div>
          <div className="text-sm text-slate-500 mb-4">成为第一个发布讨论的人吧</div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              发布讨论
            </button>
            <Link to="/home?guide=1" className="btn btn-outline">
              使用教程
            </Link>
            <Link to="/quiz" className="btn btn-outline">
              去练习
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map((discussion) => (
            <div
              key={discussion._id}
              className="surface hover:border-blue-200 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {discussion.author && (
                      <AuthorLink
                        author={discussion.author}
                        className="flex items-center gap-1.5 text-sm text-slate-700"
                      >
                        {discussion.author.avatarUrl ? (
                          <img
                            src={discussion.author.avatarUrl}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <span className="h-6 w-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                            {(discussion.author.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="font-medium">{discussion.author.name}</span>
                      </AuthorLink>
                    )}
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
                        🏅 悬赏 {discussion.bountyPoints}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {new Date(discussion.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    <Link
                      to={`/community/${discussion._id}`}
                      className="hover:text-blue-600 cursor-pointer"
                    >
                      {discussion.title}
                    </Link>
                  </h3>
                  <div className="text-slate-700 mb-3 line-clamp-2">
                    {discussion.content}
                  </div>
                  {discussion.tags && discussion.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
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
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>👁️ {discussion.viewCount || 0}</span>
                    <span>💬 {discussion.replyCount || 0}</span>
                    <span>👍 {discussion.likeCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 发布讨论模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">发布讨论</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">讨论类型 *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="general">一般讨论</option>
                  <option value="question">题目讨论</option>
                  <option value="knowledge">知识点讨论</option>
                </select>
              </div>
              {formData.type === 'question' && (
                <div>
                  <label className="block text-sm font-medium mb-1">题目ID</label>
                  <input
                    type="text"
                    value={formData.questionId}
                    onChange={(e) => setFormData({ ...formData, questionId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="输入题目ID（可选）"
                  />
                </div>
              )}
              {formData.type === 'knowledge' && (
                <div>
                  <label className="block text-sm font-medium mb-1">知识点ID</label>
                  <input
                    type="text"
                    value={formData.knowledgeNodeId}
                    onChange={(e) => setFormData({ ...formData, knowledgeNodeId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="输入知识点ID（可选）"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="请输入标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">内容 *（支持Markdown）</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="8"
                  placeholder="请输入内容"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">悬赏积分（可选，采纳答案后转给回答者）</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={formData.bountyPoints || ''}
                  onChange={(e) => setFormData({ ...formData, bountyPoints: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0"
                />
                {user?.points != null && (
                  <p className="text-xs text-slate-500 mt-1">当前积分：{user.points}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                    setFormData({ ...formData, tags });
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="例如：数学, 难题, 求助"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    type: 'general',
                    questionId: '',
                    knowledgeNodeId: '',
                    title: '',
                    content: '',
                    tags: [],
                    bountyPoints: 0,
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateDiscussion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                发布
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

