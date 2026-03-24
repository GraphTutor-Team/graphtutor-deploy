/**
 * GraphTutor - 全局 AI 学习伴侣悬浮入口（Phase 0.3 + 1.1）
 * 右下角固定按钮，点击展开对话面板；支持上下文注入与预设问题快捷入口
 */

import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
        const ids = items.map((i) => i.questionId ?? i._id).filter(Boolean);
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
      const { content } = await chat(nextMessages, buildContext());
      setMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch (err) {
      setError(err.message || 'AI 回复失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [];
  if (questionId) suggestions.push({ label: '这道题的解题思路是什么？', text: '这道题的解题思路是什么？' });
  if (knowledgeNodeId) suggestions.push({ label: '总结这个知识点的常考题型', text: '帮我总结这个知识点的常考题型' });
  if (wrongQuestionIds.length > 0) suggestions.push({ label: '根据错题推荐 5 道练习题', text: '根据我的错题，推荐 5 道练习题' });

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        title="AI 学习伴侣"
        aria-label="打开 AI 学习伴侣"
      >
        <span className="text-2xl" aria-hidden>🤖</span>
      </button>

      {/* 对话面板 */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-[100] w-[380px] max-w-[calc(100vw-3rem)] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(480px, 70vh)' }}
        >
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
            <span className="font-semibold text-slate-900 dark:text-slate-100">AI 学习伴侣</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="关闭"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
            {messages.length === 0 && !loading && (
              <div className="space-y-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {user ? '你可以直接输入问题，或点击下方快捷问题：' : '请先登录后使用 AI 助手。'}
                </p>
                {user && suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(s.text)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
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
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownPreview content={m.content} />
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 bg-slate-100 dark:bg-slate-700">
                  <LoadingSpinner className="w-5 h-5" />
                </div>
              </div>
            )}
            <div ref={listEndRef} />
          </div>

          {error && (
            <div className="px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 shrink-0">
              {error}
            </div>
          )}

          <div className="p-3 border-t border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={user ? '输入问题…' : '请先登录'}
                disabled={!user || loading}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!user || loading || !input.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
