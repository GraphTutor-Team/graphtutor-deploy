/**
 * GraphTutor V3.0 - 题目编辑器组件
 * 
 * 功能：创建或编辑题目，支持AI辅助
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  createQuestion,
  updateQuestion,
  getQuestion,
} from '../../api/v3/questions';
import { getBanks } from '../../api/v3/questionBanks';
import { getSubjectTree } from '../../api/v3/subjects';
import { getGroups } from '../../api/v3/groups';
import {
  analyzeQuestion,
  classifySubject,
  generateExplanation,
} from '../../api/v3/ai';
import { handleApiError } from '../../utils/errorHandler';
import {
  validateQuestionContent,
  validateQuestionOptions,
  validateAnswerIndex,
  validateSubjectCode,
  validateDifficulty,
} from '../../utils/formValidation';
import { toast } from '../../utils/toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function QuestionEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    type: 'single', // 'single', 'multiple', 'judge', 'fill', 'short'
    content: '',
    options: ['', '', '', ''],
    answerIndex: 0, // 单选题、判断题使用
    answerIndices: [], // 多选题使用
    answer: '', // 填空题、简答题使用
    blankAnswers: [], // 填空题使用（多个空白）
    blanks: 1, // 填空题空白数量
    subjectCode: searchParams.get('subjectCode') || '',
    bankId: searchParams.get('bankId') || '',
    groupId: searchParams.get('groupId') || '',
    difficulty: 3,
    knowledgeNodeId: '',
    tags: [],
    explain: '',
    autoGenerateQid: true,
  });

  const [banks, setBanks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  useEffect(() => {
    loadOptions();
    if (isEdit) {
      loadQuestion();
    }
  }, [id]);

  const loadOptions = async () => {
    try {
      const [banksData, subjectsData, groupsData] = await Promise.all([
        getBanks({ limit: 100 }).catch(() => ({ data: [] })),
        getSubjectTree().catch(() => []),
        getGroups({ status: 'active' }).catch(() => []),
      ]);
      setBanks(banksData.data || []);
      setSubjects(subjectsData || []);
      setGroups(groupsData || []);
    } catch (err) {
      console.error('加载选项数据失败:', err);
    }
  };

  const loadQuestion = async () => {
    try {
      setLoading(true);
      setError('');
      const question = await getQuestion(id);
      const questionType = question.type || 'single';
      
      // 根据题型初始化答案数据
      let answerData = {};
      if (questionType === 'multiple') {
        // 多选题：answer 是数组
        answerData = {
          answerIndices: Array.isArray(question.answer) ? question.answer : [],
        };
      } else if (questionType === 'fill') {
        // 填空题：blankAnswers 是数组
        answerData = {
          blankAnswers: question.blankAnswers || [],
          blanks: question.blanks || 1,
        };
      } else if (questionType === 'short') {
        // 简答题：answer 是字符串
        answerData = {
          answer: typeof question.answer === 'string' ? question.answer : '',
        };
      } else {
        // 单选题、判断题：answerIndex
        answerData = {
          answerIndex: question.answerIndex ?? (typeof question.answer === 'number' ? question.answer : 0),
        };
      }

      setFormData({
        type: questionType,
        content: question.content || '',
        options: question.options || (questionType === 'judge' ? ['对', '错'] : ['', '', '', '']),
        ...answerData,
        subjectCode: question.subjectCode?.code || question.subjectCode || '',
        bankId: question.bankId?._id || question.bankId || '',
        groupId: question.groupId?._id || question.groupId || '',
        difficulty: question.difficulty || 3,
        knowledgeNodeId: question.knowledgeNodeId || '',
        tags: question.tags || [],
        explain: question.explain || '',
        autoGenerateQid: false,
      });
    } catch (err) {
      const errorMsg = handleApiError(err, '加载题目失败');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // 使用统一的验证函数
    const contentValidation = validateQuestionContent(formData.content);
    if (!contentValidation.valid) {
      setError(contentValidation.message);
      setSubmitting(false);
      return;
    }

    const subjectValidation = validateSubjectCode(formData.subjectCode);
    if (!subjectValidation.valid) {
      setError('请选择学科分类，题目必须归属于某个学科');
      setSubmitting(false);
      return;
    }

    const difficultyValidation = validateDifficulty(formData.difficulty);
    if (!difficultyValidation.valid) {
      setError(difficultyValidation.message);
      setSubmitting(false);
      return;
    }

    // 根据题型进行不同的验证和数据处理
    let payload = {
      type: formData.type,
      content: formData.content.trim(),
      subjectCode: formData.subjectCode,
      bankId: formData.bankId || undefined,
      groupId: formData.groupId || undefined,
      difficulty: formData.difficulty,
      knowledgeNodeId: formData.knowledgeNodeId || undefined,
      tags: formData.tags || [],
      explain: formData.explain || '',
      autoGenerateQid: formData.autoGenerateQid,
    };

    if (formData.type === 'single' || formData.type === 'judge') {
      // 单选题、判断题
      const validOptions = formData.options.filter((opt) => opt.trim());
      const optionsValidation = validateQuestionOptions(validOptions);
      if (!optionsValidation.valid) {
        setError(optionsValidation.message);
        setSubmitting(false);
        return;
      }

      const answerValidation = validateAnswerIndex(formData.answerIndex, validOptions.length);
      if (!answerValidation.valid) {
        setError(answerValidation.message);
        setSubmitting(false);
        return;
      }

      payload.options = validOptions;
      payload.answerIndex = formData.answerIndex;
      payload.answer = formData.answerIndex; // 向后兼容

    } else if (formData.type === 'multiple') {
      // 多选题
      const validOptions = formData.options.filter((opt) => opt.trim());
      const optionsValidation = validateQuestionOptions(validOptions);
      if (!optionsValidation.valid) {
        setError(optionsValidation.message);
        setSubmitting(false);
        return;
      }

      if (!formData.answerIndices || formData.answerIndices.length === 0) {
        setError('请至少选择一个正确答案');
        setSubmitting(false);
        return;
      }

      if (formData.answerIndices.some(idx => idx < 0 || idx >= validOptions.length)) {
        setError('答案索引超出范围');
        setSubmitting(false);
        return;
      }

      payload.options = validOptions;
      payload.answer = formData.answerIndices; // 多选题答案是数组
      payload.answerIndices = formData.answerIndices;

    } else if (formData.type === 'fill') {
      // 填空题
      if (!formData.blankAnswers || formData.blankAnswers.length === 0) {
        setError('请填写至少一个答案');
        setSubmitting(false);
        return;
      }

      const validAnswers = formData.blankAnswers.filter((ans) => ans.trim());
      if (validAnswers.length === 0) {
        setError('答案不能为空');
        setSubmitting(false);
        return;
      }

      payload.blanks = formData.blanks || validAnswers.length;
      payload.blankAnswers = validAnswers;
      payload.answer = validAnswers; // 填空题答案也是数组

    } else if (formData.type === 'short') {
      // 简答题
      if (!formData.answer || !formData.answer.trim()) {
        setError('请填写参考答案');
        setSubmitting(false);
        return;
      }

      payload.answer = formData.answer.trim();
    }

    try {
      if (isEdit) {
        await updateQuestion(id, payload);
        toast.success('题目更新成功');
      } else {
        await createQuestion(payload);
        toast.success('题目创建成功');
      }
      navigate('/questions');
    } catch (err) {
      const errorMsg = handleApiError(err, '保存失败');
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTypeChange = (newType) => {
    // 切换题型时重置相关数据
    let newFormData = { ...formData, type: newType };
    
    if (newType === 'judge') {
      // 判断题默认两个选项
      newFormData.options = ['对', '错'];
      newFormData.answerIndex = 0;
    } else if (newType === 'fill') {
      // 填空题初始化空白答案
      newFormData.blanks = 1;
      newFormData.blankAnswers = [''];
      newFormData.options = [];
    } else if (newType === 'short') {
      // 简答题
      newFormData.answer = '';
      newFormData.options = [];
    } else if (newType === 'multiple') {
      // 多选题
      newFormData.answerIndices = [];
      if (newFormData.options.length === 0) {
        newFormData.options = ['', '', '', ''];
      }
    } else {
      // 单选题
      if (newFormData.options.length === 0) {
        newFormData.options = ['', '', '', ''];
      }
      newFormData.answerIndex = 0;
    }
    
    setFormData(newFormData);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({
      ...prev,
      options: newOptions,
    }));
  };

  const handleAddOption = () => {
    if (formData.options.length < 10) {
      setFormData((prev) => ({
        ...prev,
        options: [...prev.options, ''],
      }));
    }
  };

  const handleRemoveOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      let updates = { options: newOptions };
      
      if (formData.type === 'single' || formData.type === 'judge') {
        // 单选题、判断题：调整答案索引
        let newAnswerIndex = formData.answerIndex;
        if (formData.answerIndex >= index) {
          newAnswerIndex = Math.max(0, formData.answerIndex - 1);
        }
        updates.answerIndex = newAnswerIndex;
      } else if (formData.type === 'multiple') {
        // 多选题：从答案数组中移除对应索引
        const newAnswerIndices = formData.answerIndices
          .filter(idx => idx !== index)
          .map(idx => idx > index ? idx - 1 : idx);
        updates.answerIndices = newAnswerIndices;
      }
      
      setFormData((prev) => ({ ...prev, ...updates }));
    }
  };

  // 多选题：切换选项选中状态
  const handleMultipleAnswerToggle = (index) => {
    const currentIndices = formData.answerIndices || [];
    const newIndices = currentIndices.includes(index)
      ? currentIndices.filter(i => i !== index)
      : [...currentIndices, index].sort((a, b) => a - b);
    
    setFormData((prev) => ({
      ...prev,
      answerIndices: newIndices,
    }));
  };

  // 填空题：添加空白
  const handleAddBlank = () => {
    setFormData((prev) => ({
      ...prev,
      blanks: (prev.blanks || 1) + 1,
      blankAnswers: [...(prev.blankAnswers || []), ''],
    }));
  };

  // 填空题：删除空白
  const handleRemoveBlank = (index) => {
    if (formData.blanks > 1) {
      const newAnswers = formData.blankAnswers.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        blanks: prev.blanks - 1,
        blankAnswers: newAnswers,
      }));
    }
  };

  // 填空题：更新空白答案
  const handleBlankAnswerChange = (index, value) => {
    const newAnswers = [...formData.blankAnswers];
    newAnswers[index] = value;
    setFormData((prev) => ({
      ...prev,
      blankAnswers: newAnswers,
    }));
  };

  const handleAIAnalyze = async () => {
    if (!formData.content.trim()) {
      toast.warning('请先输入题目内容');
      return;
    }

    try {
      setAiAnalyzing(true);
      const analysisPayload = {
        content: formData.content,
        type: formData.type,
      };

      // 根据题型添加不同的数据
      if (formData.type === 'single' || formData.type === 'judge') {
        analysisPayload.options = formData.options.filter((opt) => opt.trim());
        analysisPayload.answerIndex = formData.answerIndex;
      } else if (formData.type === 'multiple') {
        analysisPayload.options = formData.options.filter((opt) => opt.trim());
        analysisPayload.answerIndices = formData.answerIndices;
      } else if (formData.type === 'fill') {
        analysisPayload.blankAnswers = formData.blankAnswers;
      } else if (formData.type === 'short') {
        analysisPayload.answer = formData.answer;
      }

      const analysis = await analyzeQuestion(analysisPayload);
      setAiSuggestions(analysis);
      toast.success('AI分析完成');
    } catch (err) {
      handleApiError(err, 'AI分析失败');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleAIClassify = async () => {
    if (!formData.content.trim()) {
      toast.warning('请先输入题目内容');
      return;
    }

    try {
      setAiAnalyzing(true);
      const recommendation = await classifySubject(formData.content);
      if (recommendation.subjectCode) {
        handleChange('subjectCode', recommendation.subjectCode);
        toast.success(`AI推荐学科：${recommendation.subjectName}（置信度：${(recommendation.confidence * 100).toFixed(0)}%）`);
      } else {
        toast.info('AI未能推荐学科，请手动选择');
      }
    } catch (err) {
      handleApiError(err, 'AI分类失败');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleAIGenerateExplain = async () => {
    if (!formData.content.trim()) {
      toast.warning('请先输入题目内容');
      return;
    }

    try {
      setAiAnalyzing(true);
      const explanationPayload = {
        content: formData.content,
        type: formData.type,
      };

      // 根据题型添加不同的数据
      if (formData.type === 'single' || formData.type === 'judge') {
        explanationPayload.options = formData.options.filter((opt) => opt.trim());
        explanationPayload.answerIndex = formData.answerIndex;
      } else if (formData.type === 'multiple') {
        explanationPayload.options = formData.options.filter((opt) => opt.trim());
        explanationPayload.answerIndices = formData.answerIndices;
      } else if (formData.type === 'fill') {
        explanationPayload.blankAnswers = formData.blankAnswers;
      } else if (formData.type === 'short') {
        explanationPayload.answer = formData.answer;
      }

      const explanation = await generateExplanation(explanationPayload);
      handleChange('explain', explanation);
      toast.success('解析生成成功');
    } catch (err) {
      handleApiError(err, '生成解析失败');
    } finally {
      setAiAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="加载题目数据..." size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {isEdit ? '编辑题目' : '创建题目'}
        </h1>
        <p className="text-slate-600">
          {isEdit ? '修改题目信息' : '创建一道新题目'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>
        )}

        {/* AI建议 */}
        {aiSuggestions && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium mb-2">AI质量分析</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">评分：</span>
                {aiSuggestions.score}/100 ({aiSuggestions.quality})
              </div>
              {aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 && (
                <div>
                  <span className="font-medium">建议：</span>
                  <ul className="list-disc list-inside ml-2">
                    {aiSuggestions.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 题型选择 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            题型 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="single">单选题</option>
            <option value="multiple">多选题</option>
            <option value="judge">判断题</option>
            <option value="fill">填空题</option>
            <option value="short">简答题</option>
          </select>
        </div>

        {/* 题干 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            题干 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入题目内容"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleAIClassify}
              disabled={aiAnalyzing}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50"
            >
              🤖 AI推荐学科
            </button>
            <button
              type="button"
              onClick={handleAIAnalyze}
              disabled={aiAnalyzing}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              {aiAnalyzing ? '分析中...' : '🤖 AI质量分析'}
            </button>
          </div>
        </div>

        {/* 选项（单选题、多选题、判断题） */}
        {(formData.type === 'single' || formData.type === 'multiple' || formData.type === 'judge') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              选项 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  {formData.type === 'multiple' ? (
                    <input
                      type="checkbox"
                      checked={(formData.answerIndices || []).includes(index)}
                      onChange={() => handleMultipleAnswerToggle(index)}
                      className="w-4 h-4"
                    />
                  ) : (
                    <input
                      type="radio"
                      name="answer"
                      checked={formData.answerIndex === index}
                      onChange={() => handleChange('answerIndex', index)}
                      className="w-4 h-4"
                    />
                  )}
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              {formData.options.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-4 py-2 border border-dashed rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  + 添加选项
                </button>
              )}
            </div>
            {formData.type === 'multiple' && (
              <div className="mt-2 text-xs text-slate-500">
                已选择 {formData.answerIndices?.length || 0} 个正确答案
              </div>
            )}
          </div>
        )}

        {/* 填空题答案 */}
        {formData.type === 'fill' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              答案 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {(formData.blankAnswers || ['']).map((answer, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600 w-16">
                    空白 {index + 1}:
                  </span>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => handleBlankAnswerChange(index, e.target.value)}
                    placeholder={`请输入第 ${index + 1} 个空白的答案`}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.blanks > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBlank(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddBlank}
                className="px-4 py-2 border border-dashed rounded-lg text-slate-600 hover:bg-slate-50"
              >
                + 添加空白
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              💡 填空题可以有多个空白，每个空白对应一个答案
            </div>
          </div>
        )}

        {/* 简答题答案 */}
        {formData.type === 'short' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              参考答案 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.answer || ''}
              onChange={(e) => handleChange('answer', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入参考答案（用于自动评分或人工参考）"
            />
            <div className="mt-2 text-xs text-slate-500">
              💡 简答题的答案用于评分参考，学生答案会与参考答案进行对比
            </div>
          </div>
        )}

        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              学科分类 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.subjectCode}
              onChange={(e) => handleChange('subjectCode', e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择学科（必选）</option>
              {(() => {
                // 扁平化树形结构用于下拉选择
                const flattenSubjects = (subjects, result = []) => {
                  subjects.forEach((subject) => {
                    result.push(subject);
                    if (subject.children && subject.children.length > 0) {
                      flattenSubjects(subject.children, result);
                    }
                  });
                  return result;
                };
                return flattenSubjects(subjects).map((subject) => {
                  const indent = '  '.repeat((subject.level || 1) - 1);
                  return (
                    <option key={subject.code} value={subject.code}>
                      {indent}{subject.icon || '📚'} {subject.name} ({subject.code})
                    </option>
                  );
                });
              })()}
            </select>
            <div className="text-xs text-slate-500 mt-1">
              💡 题目必须归属于某个学科，便于分类管理和查找
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              所属题库
            </label>
            <select
              value={formData.bankId}
              onChange={(e) => handleChange('bankId', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">不选择题库</option>
              {banks.map((bank) => (
                <option key={bank._id} value={bank._id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              关联群组 <span className="text-blue-500">（可选）</span>
            </label>
            <select
              value={formData.groupId}
              onChange={(e) => handleChange('groupId', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">不关联群组</option>
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name} {group.code && `(${group.code})`}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500 mt-1">
              💡 提示：关联群组后，群组老师可以管理此题目
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              难度
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleChange('difficulty', parseInt(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">1 - 非常基础</option>
              <option value="2">2 - 基础理解</option>
              <option value="3">3 - 一般/中等</option>
              <option value="4">4 - 偏难</option>
              <option value="5">5 - 很难/挑战题</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              知识点ID
            </label>
            <input
              type="text"
              value={formData.knowledgeNodeId}
              onChange={(e) => handleChange('knowledgeNodeId', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="可选，如：os:process-thread"
            />
          </div>
        </div>

        {/* 解析 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              解析说明
            </label>
            <button
              type="button"
              onClick={handleAIGenerateExplain}
              disabled={aiAnalyzing}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
            >
              {aiAnalyzing ? '生成中...' : '🤖 AI生成解析'}
            </button>
          </div>
          <textarea
            value={formData.explain}
            onChange={(e) => handleChange('explain', e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入题目解析（可选）"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/questions')}
            className="px-6 py-2 border rounded-lg hover:bg-slate-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

