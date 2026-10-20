/**
 * GraphTutor - 全局 AI 学习伴侣悬浮入口
 * 支持上下文注入、快捷问题，以及「推荐练习 → 一键开练」
 */

import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAIContext } from '../../context/AIContext';
import { chat } from '../../api/v3/ai';
import { getPageGuide, askForPage } from './pageGuides';
import { GeneratePanel, PlansPanel, TodayPanel, WrongReportPanel, PredictPanel, NoteSummaryPanel } from './AssistantTools';
import { getWrongQuestions } from '../../api/v3/wrongQuestions';
import MarkdownPreview from '../MarkdownPreview';
import LoadingSpinner from '../common/LoadingSpinner';

function pageTypeOf(pathname) {
  return getPageGuide(pathname).type;
}

export default function AIAssistantFab() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pageType: contextPageType, questionId, knowledgeNodeId, brief, mode, noteContent, wrongQuestionIds: contextWrongIds } = useAIContext();
  const pathType = pageTypeOf(location.pathname);
  const contextMatchesPage = !contextPageType || contextPageType === 'other' || contextPageType === pathType;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [panel, setPanel] = useState('chat');
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
    pageType: pathType,
    mode: contextMatchesPage ? mode || 'browse' : 'browse',
    questionId: contextMatchesPage ? questionId || undefined : undefined,
    knowledgeNodeId: contextMatchesPage ? knowledgeNodeId || undefined : undefined,
    brief: contextMatchesPage ? brief || undefined : undefined,
    wrongQuestionIds:
      (contextWrongIds?.length ? contextWrongIds : wrongQuestionIds).length > 0
        ? (contextWrongIds?.length ? contextWrongIds : wrongQuestionIds)
        : undefined,
  });

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    if (!user) {
      setError('请先登录后使用 AI 助手');
      return;
    }

    setError('');
    if (/生成题目|帮我出题|出几道题/.test(text)) {
      setPanel('generate');
      if (!textOverride) setInput('');
      return;
    }
    if (/今日该练|今天练什么|该复习什么/.test(text)) {
      setPanel('today');
      if (!textOverride) setInput('');
      return;
    }
    if (/学习计划|制定计划|查看计划|今天的任务/.test(text)) {
      setPanel('plans');
      if (!textOverride) setInput('');
      return;
    }
    if (/本周错题|错题报告|错题分析/.test(text)) {
      setPanel('report');
      if (!textOverride) setInput('');
      return;
    }
    if (/考前预测|预测卷/.test(text)) {
      setPanel('predict');
      if (!textOverride) setInput('');
      return;
    }
    if (/笔记摘要|总结笔记|摘要当前笔记/.test(text)) {
      setPanel('note');
      if (!textOverride) setInput('');
      return;
    }
    setPanel('chat');
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

  const suggestions = [
    { label: '问当前页', run: () => handleSend(askForPage(location.pathname)) },
    { label: '今日该练', run: () => setPanel('today') },
    { label: '生成题目', run: () => setPanel('generate') },
    { label: '学习计划', run: () => setPanel('plans') },
    { label: '本周错题', run: () => setPanel('report') },
    { label: '考前预测', run: () => setPanel('predict') },
    { label: '笔记摘要', run: () => setPanel('note') },
  ];

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
            {messages.length === 0 && !loading && panel === 'chat' && (
              <div className="space-y-2">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {user
                    ? '可以问这一页、看今天该练什么、生成题目，或把计划说成今天的任务。本周错题、考前预测和笔记摘要也在下面。'
                    : '请先登录后使用 AI 助手。'}
                </p>
              </div>
            )}
            {panel === 'today' && <TodayPanel onClose={() => setOpen(false)} />}
            {panel === 'generate' && <GeneratePanel onClose={() => setOpen(false)} />}
            {panel === 'plans' && <PlansPanel onClose={() => setOpen(false)} />}
            {panel === 'report' && <WrongReportPanel />}
            {panel === 'predict' && <PredictPanel onClose={() => setOpen(false)} />}
            {panel === 'note' && (
              <NoteSummaryPanel noteContent={contextMatchesPage && pathType === 'notes' ? noteContent : ''} />
            )}
            {panel === 'chat' && messages.map((m, i) => (
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
                        <MarkdownPreview text={m.content} />
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
            className="px-3 pt-2 flex flex-wrap gap-1.5 shrink-0 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {suggestions.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={!user || loading}
                onClick={item.run}
                className="px-2.5 py-1 rounded-lg text-xs disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            className="p-3 shrink-0"
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
