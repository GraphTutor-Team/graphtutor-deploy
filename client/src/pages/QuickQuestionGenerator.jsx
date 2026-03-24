/**
 * GraphTutor V3.0 - 快速题目生成页面
 * 
 * 功能：一键批量生成题目，无需手动添加
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import BatchQuestionGenerator from '../components/BatchQuestionGenerator';
import { getBanks } from '../api/v3/questionBanks';
import { getSubjectTree } from '../api/v3/subjects';
import { LoadingSpinner, EmptyState } from '../components/common';

export default function QuickQuestionGenerator() {
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const [banksData, subjectsData] = await Promise.all([
        getBanks({ limit: 100 }).catch(() => ({ data: [] })),
        getSubjectTree().catch(() => []),
      ]);
      setBanks(banksData.data || []);
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error('加载选项失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (questions) => {
    // 生成成功后，可以跳转到题库或题目列表
    if (questions && questions.length > 0 && questions[0].bankId) {
      navigate(`/banks/${questions[0].bankId}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="加载中..." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="快速题目生成器"
        subtitle="使用AI自动生成题目，无需手动添加。选择学科和题库，一键生成多道题目。"
      />

      {/* 说明卡片 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          💡 使用说明
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>• <strong>选择学科：</strong>选择要生成题目的学科</li>
          <li>• <strong>选择题库：</strong>选择题目要添加到的题库</li>
          <li>• <strong>设置参数：</strong>设置题目数量和难度</li>
          <li>• <strong>一键生成：</strong>点击生成按钮，AI会自动生成题目</li>
          <li>• <strong>自动添加：</strong>生成的题目会自动添加到选中的题库</li>
        </ul>
      </div>

      {/* 批量生成器 */}
      <BatchQuestionGenerator onSuccess={handleSuccess} />

      {/* 其他方式 */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold mb-4">其他拓展题库的方式</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/questions/import')}
            className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left"
          >
            <div className="text-2xl mb-2">📥</div>
            <div className="font-semibold mb-1">批量导入</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              从JSON或CSV文件批量导入题目
            </div>
          </button>

          <button
            onClick={() => navigate('/ai')}
            className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left"
          >
            <div className="text-2xl mb-2">🤖</div>
            <div className="font-semibold mb-1">AI控制台</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              使用AI控制台生成和管理题目
            </div>
          </button>

          <button
            onClick={() => navigate('/questions/create')}
            className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left"
          >
            <div className="text-2xl mb-2">✏️</div>
            <div className="font-semibold mb-1">手动创建</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              手动创建单个题目
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

