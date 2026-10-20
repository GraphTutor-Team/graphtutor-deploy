import { useEffect } from 'react';
import { useAIContext } from '../context/AIContext';

/**
 * 把当前页面的学习现场交给全局 AI 伴侣。离开页面时清空，避免串到下一页。
 */
export function usePageAI({
  pageType = 'other',
  mode = 'browse',
  brief = '',
  questionId = null,
  knowledgeNodeId = null,
  noteContent = '',
}) {
  const { setAIContext } = useAIContext();

  useEffect(() => {
    setAIContext({
      pageType,
      mode,
      brief,
      questionId,
      knowledgeNodeId,
      noteContent,
    });
    return () => {
      setAIContext({
        pageType: 'other',
        mode: 'browse',
        brief: '',
        questionId: null,
        knowledgeNodeId: null,
        noteContent: '',
      });
    };
  }, [pageType, mode, brief, questionId, knowledgeNodeId, noteContent, setAIContext]);
}
