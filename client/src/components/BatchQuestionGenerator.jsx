/**
 * GraphTutor V3.0 - 批量题目生成器组件
 * 
 * 功能：一键批量生成题目，无需手动添加
 */

import { useState, useEffect } from 'react';
import { generateQuestions } from '../api/v3/ai';
import { batchCreateQuestions } from '../api/v3/questions';
import { getBanks } from '../api/v3/questionBanks';
import { getSubjectTree } from '../api/v3/subjects';
import { toast } from '../utils/toast';
import { LoadingSpinner, ProgressBar, Badge } from './common';

export default function BatchQuestionGenerator({ defaultBankId, defaultSubjectCode, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  
  const [config, setConfig] = useState({
    subjectCode: defaultSubjectCode || '',
    subjectName: '',
    bankId: defaultBankId || '',
    difficulty: 3,
    count: 10,
    knowledgePoint: '',
  });

  const [banks, setBanks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [quickTemplates, setQuickTemplates] = useState([
    {
      name: '快速生成10道题',
      config: { count: 10, difficulty: 3 },
    },
    {
      name: '生成20道中等难度题',
      config: { count: 20, difficulty: 3 },
    },
    {
      name: '生成30道简单题',
      config: { count: 30, difficulty: 2 },
    },
    {
      name: '生成50道综合题',
      config: { count: 50, difficulty: 3 },
    },
  ]);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [banksData, subjectsData] = await Promise.all([
        getBanks({ limit: 100 }).catch(() => ({ data: [] })),
        getSubjectTree().catch(() => []),
      ]);
      setBanks(banksData.data || []);
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error('加载选项失败:', err);
    }
  };

  const handleQuickGenerate = async (template) => {
    const newConfig = {
      ...config,
      ...template.config,
    };
    await handleGenerate(newConfig);
  };

  const handleGenerate = async (customConfig = null) => {
    const finalConfig = customConfig || config;
    
    if (!finalConfig.subjectCode && !finalConfig.subjectName) {
      toast.error('请选择学科或输入学科名称');
      return;
    }

    if (!finalConfig.bankId) {
      toast.error('请选择题库');
      return;
    }

    try {
      setLoading(true);
      setProgress(0);
      setGeneratedCount(0);

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // 1. 生成题目
      const generateResult = await generateQuestions({
        subjectCode: finalConfig.subjectCode,
        subjectName: finalConfig.subjectName || '',
        difficulty: finalConfig.difficulty,
        count: finalConfig.count,
        knowledgePoint: finalConfig.knowledgePoint || '',
        async: false,
      });

      const questions = generateResult.questions || [];
      
      if (questions.length === 0) {
        clearInterval(progressInterval);
        toast.warning('未生成任何题目');
        return;
      }

      // 2. 将题目添加到题库
      setProgress(70);
      const questionsToSave = questions.map(q => {
        // 确定正确答案索引
        let correctIndex = 0;
        if (q.correctIndex !== undefined && q.correctIndex !== null) {
          correctIndex = q.correctIndex;
        } else if (q.answerIndex !== undefined && q.answerIndex !== null) {
          correctIndex = q.answerIndex;
        } else if (q.answer !== undefined && q.answer !== null) {
          // 如果有答案文本，尝试在选项中查找
          const answerIndex = q.options?.findIndex(opt => opt === q.answer || opt.includes(q.answer));
          if (answerIndex >= 0) {
            correctIndex = answerIndex;
          }
        }

        return {
          content: q.content || q.question || '',
          options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['选项A', '选项B', '选项C', '选项D'],
          answer: q.answer || q.options?.[correctIndex] || '',
          answerIndex: correctIndex,
          bankId: finalConfig.bankId,
          subjectCode: finalConfig.subjectCode || q.subjectCode || '',
          difficulty: finalConfig.difficulty || q.difficulty || 3,
          type: q.type || 'single',
          explain: q.explanation || q.explain || '',
          knowledgeNodeId: q.knowledgeNodeId || finalConfig.knowledgePoint || '',
        };
      });

      try {
        const saveResult = await batchCreateQuestions({
          questions: questionsToSave,
          bankId: finalConfig.bankId,
        });
        clearInterval(progressInterval);
        setProgress(100);

        const savedCount = saveResult.successCount || saveResult.created || questions.length;
        setGeneratedCount(savedCount);

        if (savedCount > 0) {
          toast.success(`成功生成并保存 ${savedCount} 道题目到题库！`);
          if (onSuccess) {
            onSuccess(questions);
          }
        } else {
          toast.warning('题目已生成，但保存失败');
        }
      } catch (saveErr) {
        clearInterval(progressInterval);
        console.error('保存题目失败:', saveErr);
        toast.error('题目已生成，但保存到题库失败: ' + (saveErr.message || '未知错误'));
        // 即使保存失败，也返回生成的题目供用户查看
        setGeneratedCount(questions.length);
      }
    } catch (err) {
      console.error('生成题目失败:', err);
      toast.error('生成题目失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
      setTimeout(() => {
        setProgress(0);
        setGeneratedCount(0);
      }, 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
      <h3 className="text-xl font-bold mb-4">🤖 批量题目生成器</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        使用AI自动生成题目，无需手动添加。选择学科和题库，一键生成多道题目。
      </p>

      {/* 快速模板 */}
      <div className="mb-6">
        <div className="text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">
          快速模板
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {quickTemplates.map((template, index) => (
            <button
              key={index}
              onClick={() => handleQuickGenerate(template)}
              disabled={loading || !config.bankId}
              className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* 配置表单 */}
      <div className="space-y-4 mb-6">
        {/* 学科选择 */}
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            学科
          </label>
          <select
            value={config.subjectCode}
            onChange={(e) => setConfig({ ...config, subjectCode: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            disabled={loading}
          >
            <option value="">请选择学科</option>
            {subjects.map((subject) => (
              <option key={subject.code} value={subject.code}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {/* 题库选择 */}
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            题库 <span className="text-red-500">*</span>
          </label>
          <select
            value={config.bankId}
            onChange={(e) => setConfig({ ...config, bankId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            disabled={loading}
            required
          >
            <option value="">请选择题库</option>
            {banks.map((bank) => (
              <option key={bank._id} value={bank._id}>
                {bank.name} ({bank.questionCount || 0}题)
              </option>
            ))}
          </select>
        </div>

        {/* 题目数量和难度 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              生成数量
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.count}
              onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              难度 (1-5)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={config.difficulty}
              onChange={(e) => setConfig({ ...config, difficulty: parseInt(e.target.value) || 3 })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              disabled={loading}
            />
          </div>
        </div>

        {/* 知识点（可选） */}
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            知识点（可选）
          </label>
          <input
            type="text"
            value={config.knowledgePoint}
            onChange={(e) => setConfig({ ...config, knowledgePoint: e.target.value })}
            placeholder="输入知识点，帮助AI生成更精准的题目"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            disabled={loading}
          />
        </div>
      </div>

      {/* 进度显示 */}
      {loading && (
        <div className="mb-4">
          <ProgressBar value={progress} variant="primary" showLabel={false} />
          <div className="text-sm text-center text-slate-600 dark:text-slate-400 mt-2">
            正在生成题目...
          </div>
        </div>
      )}

      {/* 生成结果 */}
      {generatedCount > 0 && !loading && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="success">{generatedCount}</Badge>
            <span className="text-sm text-green-700 dark:text-green-300">
              道题目已成功生成并添加到题库
            </span>
          </div>
        </div>
      )}

      {/* 生成按钮 */}
      <button
        onClick={() => handleGenerate()}
        disabled={loading || !config.bankId}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" text="" />
            <span>生成中...</span>
          </>
        ) : (
          <>
            <span>✨</span>
            <span>开始生成题目</span>
          </>
        )}
      </button>

      {/* 提示信息 */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xs text-blue-700 dark:text-blue-300">
          💡 <strong>提示：</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>AI会根据学科和难度自动生成题目</li>
            <li>生成的题目会自动添加到选中的题库</li>
            <li>建议每次生成10-50道题目，确保质量</li>
            <li>可以多次生成，逐步丰富题库内容</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

