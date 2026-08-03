/**
 * GraphTutor - 全局 AI 学习伴侣悬浮入口
 * 支持上下文注入、快捷问题，以及「推荐练习 → 一键开练」
 */

import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAIContext } from '../../context/AIContext';
import { chat } from '../../api/v3/ai';
import { getWrongQuestions } from '../../api/v3/wrongQuestions';
import MarkdownPreview from '../MarkdownPreview';
import LoadingSpinner from '../common/LoadingSpinner';

function getPageType(pathname) {
  if (pathname.includes('/questions/') && pathname.includes('/detail')) return 'question_detail';
  if (pathname === '/quiz' || pathname.startsWith('/quiz')) return 'quiz';
  if (pathname === '/exam') return 'exam';
  if (pathname === '/review' || pathname.startsWith('/review')) return 'review';
  if (pathname === '/home') return 'home';
  if (pathname.includes('/analytics') || pathname.includes('/statistics')) return 'analytics';
  return 'other';
}

export default function AIAssistantFab() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { questionId, knowledgeNodeId } = useAIContext();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wrongQuestionIds, setWrongQuestionIds] = useState([]);
  const listEndRef = useRef(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!open || !user) return;
    getWrongQuestions({ limit: 20 })
      .then((data) => {
        const items = data?.items ?? data?.data?.items ?? [];
        const ids = items.map((i) => i.questionId ?? i._id).filter(Boolean).map(String);
        setWrongQuestionIds(ids.slice(0, 20));
      })
      .catch(() => setWrongQuestionIds([]));
  }, [open, user]);

  const buildContext = () => ({
    pageType: getPageType(location.pathname),
    questionId: questionId || undefined,
    knowledgeNodeId: knowledgeNodeId || undefined,
    wrongQuestionIds: wrongQuestionIds.length > 0 ? wrongQuestionIds : undefined,
  });

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    if (!user) {
      setError('请先登录后使用 AI 助手');
      return;
    }

    setError('');
    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    if (!textOverride) setInput('');
    setLoading(true);

    try {
      const nextMessages = [...messages, userMessage];
      const data = await chat(nextMessages, buildContext());
      const content = data?.content || '';
      const recommendedQuestionIds = Array.isArray(data?.recommendedQuestionIds)
        ? data.recommendedQuestionIds.map(String).filter(Boolean)
        : [];
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content,
          ...(recommendedQuestionIds.length > 0 ? { recommendedQuestionIds } : {}),
        },
      ]);
    } catch (err) {
      setError(err.message || 'AI 回复失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const startPractice = (questionIds) => {
    if (!questionIds?.length) return;
    setOpen(false);
    navigate('/quiz', {
      state: {
        practiceQuestionIds: questionIds,
        practiceSource: 'ai',
      },
    });
  };

  const suggestions = [];
  if (questionId) suggestions.push({ label: '这道题的解题思路是什么？', text: '这道题的解题思路是什么？' });
  if (knowledgeNodeId) suggestions.push({ label: '总结这个知识点的常考题型', text: '帮我总结这个知识点的常考题型' });
  if (wrongQuestionIds.length > 0) {
    suggestions.push({ label: '根据错题推荐 5 道练习题', text: '根据我的错题，推荐 5 道练习题' });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full text-white shadow-md flex items-center justify-center transition-colors text-sm font-bold tracking-wide"
        style={{ backgroundColor: 'var(--color-primary-deep)' }}
        title="AI 学习伴侣"
        aria-label="打开 AI 学习伴侣"
      >
        AI
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-[100] w-[380px] max-w-[calc(100vw-3rem)] rounded-xl shadow-md border flex flex-col overflow-hidden"
          style={{
            maxHeight: 'min(480px, 70vh)',
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <div
            className="px-4 py-3 border-b flex items-center justify-between shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="font-semibold">AI 学习伴侣</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)]"
              style={{ color: 'var(--color-text-tertiary)' }}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
            {messages.length === 0 && !loading && (
              <div className="space-y-2">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {user
                    ? '可以直接提问，或点快捷问题。推荐练习后可一键开练。'
                    : '请先登录后使用 AI 助手。'}
                </p>
                {user && suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(s.text)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user' ? 'text-white' : ''
                  }`}
                  style={
                    m.role === 'user'
                      ? { backgroundColor: 'var(--color-primary-deep)' }
                      : {
                          backgroundColor: 'var(--color-bg-secondary)',
                          color: 'var(--color-text-primary)',
                        }
                  }
                >
                  {m.role === 'assistant' ? (
                    <div className="space-y-2">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownPreview content={m.content} />
                      </div>
                      {m.recommendedQuestionIds?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => startPractice(m.recommendedQuestionIds)}
                          className="btn btn-primary w-full text-xs !py-1.5"
                        >
                          开始练习这 {m.recommendedQuestionIds.length} 题
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                >
                  <LoadingSpinner className="w-5 h-5" />
                </div>
              </div>
            )}
            <div ref={listEndRef} />
          </div>

          {error && (
            <div
              className="px-3 py-2 text-sm shrink-0"
              style={{
                color: 'var(--color-error)',
                backgroundColor: 'var(--color-error-light)',
              }}
            >
              {error}
            </div>
          )}

          <div
            className="p-3 border-t shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={user ? '输入问题…' : '请先登录'}
                disabled={!user || loading}
                className="input flex-1 !py-2 text-sm disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!user || loading || !input.trim()}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
