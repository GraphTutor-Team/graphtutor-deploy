/**
 * GraphTutor V3.0 - 题目创建向导
 * 
 * 功能：分步骤创建题目，支持AI辅助
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createQuestion } from '../../api/v3/questions';
import { getBanks } from '../../api/v3/questionBanks';
import { getSubjectTree } from '../../api/v3/subjects';
import { classifySubject, generateQuestions } from '../../api/v3/ai';

const STEPS = [
  { id: 'subject', title: '选择学科' },
  { id: 'content', title: '编写题干' },
  { id: 'options', title: '设置选项' },
  { id: 'details', title: '完善信息' },
  { id: 'review', title: '确认提交' },
];

export default function QuestionWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    subjectCode: '',
    subjectName: '',
    content: '',
    options: ['', '', '', ''],
    answerIndex: 0,
    bankId: '',
    difficulty: 3,
    knowledgeNodeId: '',
    tags: [],
    explain: '',
    autoGenerateQid: true,
  });

  const [banks, setBanks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(false);

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
      console.error('加载选项数据失败:', err);
    }
  };

  const handleNext = () => {
    // 验证当前步骤
    if (currentStep === 0 && !formData.subjectCode && !formData.subjectName) {
      setError('请选择学科或输入学科名称');
      return;
    }
    if (currentStep === 1 && !formData.content.trim()) {
      setError('请输入题干内容');
      return;
    }
    if (currentStep === 2) {
      const validOptions = formData.options.filter((opt) => opt.trim());
      if (validOptions.length < 2) {
        setError('至少需要2个有效选项');
        return;
      }
      if (formData.answerIndex < 0 || formData.answerIndex >= validOptions.length) {
        setError('请选择正确答案');
        return;
      }
    }

    setError('');
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({
      ...prev,
      options: newOptions,
    }));
  };

  const handleAIClassify = async () => {
    if (!formData.content.trim()) {
      alert('请先输入题干内容');
      return;
    }

    try {
      setAiGenerating(true);
      const recommendation = await classifySubject(formData.content);
      if (recommendation.subjectCode) {
        handleChange('subjectCode', recommendation.subjectCode);
        alert(`AI推荐学科：${recommendation.subjectName}`);
      }
    } catch (err) {
      alert(err.message || 'AI分类失败');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!formData.subjectCode && !formData.subjectName) {
      alert('请先选择学科');
      return;
    }

    try {
      setAiGenerating(true);
      const result = await generateQuestions({
        subjectCode: formData.subjectCode,
        subjectName: formData.subjectName,
        difficulty: formData.difficulty,
        count: 1,
      }, false);

      if (result.questions && result.questions.length > 0) {
        const q = result.questions[0];
        setFormData((prev) => ({
          ...prev,
          content: q.content || prev.content,
          options: q.options || prev.options,
          answerIndex: q.answerIndex || prev.answerIndex,
          explain: q.explain || prev.explain,
        }));
        alert('AI已生成题目，请检查并修改');
      }
    } catch (err) {
      alert(err.message || 'AI生成失败');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const validOptions = formData.options.filter((opt) => opt.trim());
      const payload = {
        ...formData,
        options: validOptions,
      };

      await createQuestion(payload);
      navigate('/questions');
    } catch (err) {
      setError(err.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">创建题目向导</h1>
        <p className="text-slate-600">分步骤创建题目，轻松完成</p>
      </div>

      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex-1 flex items-center">
              <div className="flex-1 flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="ml-2 text-sm font-medium hidden md:block">
                  {step.title}
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {/* 步骤内容 */}
      <div className="bg-white p-6 rounded-lg border mb-6">
        {/* 步骤1: 选择学科 */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-4">选择学科分类</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                学科分类 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.subjectCode}
                onChange={(e) => {
                  const subject = subjects.find((s) => s.code === e.target.value);
                  handleChange('subjectCode', e.target.value);
                  handleChange('subjectName', subject?.name || '');
                }}
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
            <div className="text-sm text-slate-600">或</div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                学科名称（如果未选择学科）
              </label>
              <input
                type="text"
                value={formData.subjectName}
                onChange={(e) => handleChange('subjectName', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="如：操作系统"
              />
            </div>
          </div>
        )}

        {/* 步骤2: 编写题干 */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">编写题干</h2>
              <button
                onClick={handleAIGenerate}
                disabled={aiGenerating}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50"
              >
                {aiGenerating ? '生成中...' : '🤖 AI生成题目'}
              </button>
            </div>
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入题目内容..."
            />
            <div className="text-sm text-slate-600">
              提示：可以描述题目背景、条件和要求
            </div>
          </div>
        )}

        {/* 步骤3: 设置选项 */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-4">设置选项和正确答案</h2>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="answer"
                    checked={formData.answerIndex === index}
                    onChange={() => handleChange('answerIndex', index)}
                    className="w-5 h-5"
                  />
                  <span className="font-medium w-8">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="text-sm text-slate-600">
              提示：点击左侧圆圈选择正确答案
            </div>
          </div>
        )}

        {/* 步骤4: 完善信息 */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-4">完善题目信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="md:col-span-2">
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  解析说明
                </label>
                <textarea
                  value={formData.explain}
                  onChange={(e) => handleChange('explain', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入题目解析（可选）"
                />
              </div>
            </div>
          </div>
        )}

        {/* 步骤5: 确认提交 */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-4">确认题目信息</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-600 mb-1">学科</div>
                <div className="font-medium">
                  {formData.subjectCode
                    ? subjects.find((s) => s.code === formData.subjectCode)?.name ||
                      formData.subjectCode
                    : formData.subjectName || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">题干</div>
                <div className="font-medium">{formData.content}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">选项</div>
                <div className="space-y-2">
                  {formData.options
                    .filter((opt) => opt.trim())
                    .map((option, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded ${
                          index === formData.answerIndex
                            ? 'bg-green-50 border border-green-500'
                            : 'bg-slate-50'
                        }`}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                        {index === formData.answerIndex && ' ✓'}
                      </div>
                    ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-600 mb-1">难度</div>
                  <div className="font-medium">难度 {formData.difficulty}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">所属题库</div>
                  <div className="font-medium">
                    {banks.find((b) => b._id === formData.bankId)?.name || '-'}
                  </div>
                </div>
              </div>
              {formData.explain && (
                <div>
                  <div className="text-sm text-slate-600 mb-1">解析</div>
                  <div className="font-medium">{formData.explain}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="px-6 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一步
        </button>
        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            下一步
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '提交中...' : '确认创建'}
          </button>
        )}
      </div>
    </div>
  );
}

