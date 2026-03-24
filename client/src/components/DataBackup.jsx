/**
 * GraphTutor V3.0 - 数据备份组件
 * 
 * 功能：备份和恢复用户学习数据
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { backupUserData, restoreUserData, validateBackupFile, exportSelectedData } from '../utils/dataBackup';
import { toast } from '../utils/toast';
import api from '../api/api';

const DATA_TYPES = [
  { key: 'records', label: '学习记录', description: '答题记录和练习历史' },
  { key: 'wrongQuestions', label: '错题本', description: '所有错题和复习计划' },
  { key: 'notes', label: '学习笔记', description: '所有学习笔记和附件' },
  { key: 'studyPlans', label: '学习计划', description: '学习计划和打卡记录' },
  { key: 'goals', label: '学习目标', description: '学习目标和完成情况' },
  { key: 'favorites', label: '收藏', description: '收藏的题目和笔记' },
  { key: 'achievements', label: '成就', description: '已解锁的成就' },
];

export default function DataBackup() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(DATA_TYPES.map(t => t.key));
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreValidation, setRestoreValidation] = useState(null);

  const handleBackup = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    try {
      setBackingUp(true);
      
      // 获取所有用户数据
      const [recordsRes, wrongQuestionsRes, notesRes, studyPlansRes, goalsRes, favoritesRes, achievementsRes] = await Promise.all([
        api.get('/records?limit=10000').catch(() => ({ data: [] })),
        api.get('/v3/wrong-questions?limit=10000').catch(() => ({ data: { items: [] } })),
        api.get('/v3/notes?limit=10000').catch(() => ({ data: { items: [] } })),
        api.get('/v3/study-plans?limit=10000').catch(() => ({ data: { items: [] } })),
        api.get('/v3/goals?limit=10000').catch(() => ({ data: { items: [] } })),
        api.get('/v3/favorites?limit=10000').catch(() => ({ data: { items: [] } })),
        api.get('/v3/achievements').catch(() => ({ data: [] })),
      ]);

      const backupData = {
        records: Array.isArray(recordsRes.data) ? recordsRes.data : recordsRes.data?.items || [],
        wrongQuestions: wrongQuestionsRes.data?.items || [],
        notes: notesRes.data?.items || [],
        studyPlans: studyPlansRes.data?.items || [],
        goals: goalsRes.data?.items || [],
        favorites: favoritesRes.data?.items || [],
        achievements: Array.isArray(achievementsRes.data) ? achievementsRes.data : achievementsRes.data?.data || [],
      };

      // 如果选择了部分类型，只导出选中的
      if (selectedTypes.length < DATA_TYPES.length) {
        exportSelectedData(backupData, selectedTypes, 'graphtutor-selected-backup');
        toast.success('选择性备份完成');
      } else {
        backupUserData(backupData, 'graphtutor-backup');
        toast.success('数据备份完成');
      }
    } catch (err) {
      console.error('备份失败:', err);
      toast.error('备份失败: ' + err.message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setRestoreFile(file);
    
    try {
      const validation = await validateBackupFile(file);
      setRestoreValidation(validation);
      
      if (!validation.valid) {
        toast.error(validation.error || '无效的备份文件');
      } else {
        toast.success(`备份文件有效，包含 ${validation.totalItems} 条数据`);
      }
    } catch (err) {
      console.error('验证失败:', err);
      toast.error('验证备份文件失败');
      setRestoreValidation({ valid: false, error: err.message });
    }
  };

  const handleRestore = async () => {
    if (!restoreFile || !restoreValidation?.valid) {
      toast.error('请先选择有效的备份文件');
      return;
    }

    if (!confirm('恢复数据将覆盖现有数据，确定要继续吗？')) {
      return;
    }

    try {
      setLoading(true);
      const backupData = await restoreUserData(restoreFile);
      
      let restoredCount = 0;
      let errorCount = 0;
      const errors = [];

      // 分批恢复数据
      // 1. 恢复学习记录
      if (backupData.records && backupData.records.length > 0) {
        try {
          // 学习记录通常通过练习自动创建，这里可以选择性恢复
          // 或者提示用户这些记录会通过练习重新生成
          console.log(`跳过恢复 ${backupData.records.length} 条学习记录（将通过练习自动生成）`);
        } catch (err) {
          errors.push(`学习记录恢复失败: ${err.message}`);
          errorCount++;
        }
      }

      // 2. 恢复错题本
      if (backupData.wrongQuestions && backupData.wrongQuestions.length > 0) {
        try {
          const batchSize = 50;
          for (let i = 0; i < backupData.wrongQuestions.length; i += batchSize) {
            const batch = backupData.wrongQuestions.slice(i, i + batchSize);
            await Promise.all(
              batch.map(async (item) => {
                try {
                  await api.post('/v3/wrong-questions', {
                    questionId: item.questionId || item.question?._id || item.question,
                    reason: item.reason || '从备份恢复',
                    tags: item.tags || [],
                    notes: item.notes || '',
                  });
                  restoredCount++;
                } catch (err) {
                  // 如果已存在，跳过
                  if (err.response?.status !== 409) {
                    throw err;
                  }
                }
              })
            );
          }
        } catch (err) {
          errors.push(`错题本恢复失败: ${err.message}`);
          errorCount++;
        }
      }

      // 3. 恢复学习笔记
      if (backupData.notes && backupData.notes.length > 0) {
        try {
          const batchSize = 20;
          for (let i = 0; i < backupData.notes.length; i += batchSize) {
            const batch = backupData.notes.slice(i, i + batchSize);
            await Promise.all(
              batch.map(async (note) => {
                try {
                  await api.post('/v3/notes', {
                    type: note.type || 'question',
                    questionId: note.questionId,
                    knowledgeNodeId: note.knowledgeNodeId,
                    title: note.title,
                    content: note.content,
                    tags: note.tags || [],
                    isPublic: note.isPublic || false,
                    images: note.images || [],
                    attachments: note.attachments || [],
                  });
                  restoredCount++;
                } catch (err) {
                  if (err.response?.status !== 409) {
                    throw err;
                  }
                }
              })
            );
          }
        } catch (err) {
          errors.push(`学习笔记恢复失败: ${err.message}`);
          errorCount++;
        }
      }

      // 4. 恢复学习计划
      if (backupData.studyPlans && backupData.studyPlans.length > 0) {
        try {
          for (const plan of backupData.studyPlans) {
            try {
              await api.post('/v3/study-plans', {
                name: plan.name,
                description: plan.description,
                startDate: plan.startDate,
                endDate: plan.endDate,
                targetCount: plan.targetCount,
                subjects: plan.subjects || [],
                difficulty: plan.difficulty,
                settings: plan.settings || {},
              });
              restoredCount++;
            } catch (err) {
              if (err.response?.status !== 409) {
                throw err;
              }
            }
          }
        } catch (err) {
          errors.push(`学习计划恢复失败: ${err.message}`);
          errorCount++;
        }
      }

      // 5. 恢复学习目标
      if (backupData.goals && backupData.goals.length > 0) {
        try {
          for (const goal of backupData.goals) {
            try {
              await api.post('/v3/goals', {
                title: goal.title,
                description: goal.description,
                type: goal.type,
                targetValue: goal.targetValue,
                deadline: goal.deadline,
                status: goal.status || 'active',
              });
              restoredCount++;
            } catch (err) {
              if (err.response?.status !== 409) {
                throw err;
              }
            }
          }
        } catch (err) {
          errors.push(`学习目标恢复失败: ${err.message}`);
          errorCount++;
        }
      }

      // 6. 恢复收藏
      if (backupData.favorites && backupData.favorites.length > 0) {
        try {
          for (const favorite of backupData.favorites) {
            try {
              await api.post('/v3/favorites', {
                type: favorite.type,
                targetId: favorite.targetId || favorite.questionId || favorite.noteId,
              });
              restoredCount++;
            } catch (err) {
              if (err.response?.status !== 409) {
                throw err;
              }
            }
          }
        } catch (err) {
          errors.push(`收藏恢复失败: ${err.message}`);
          errorCount++;
        }
      }

      // 7. 恢复成就（通常由系统自动授予，这里可以选择性恢复）
      if (backupData.achievements && backupData.achievements.length > 0) {
        console.log(`跳过恢复 ${backupData.achievements.length} 个成就（由系统自动授予）`);
      }

      // 显示恢复结果
      if (errorCount === 0) {
        toast.success(`数据恢复完成！成功恢复 ${restoredCount} 条数据`);
      } else {
        toast.warning(`数据恢复部分完成：成功 ${restoredCount} 条，失败 ${errorCount} 条`);
        if (errors.length > 0) {
          console.error('恢复错误详情:', errors);
        }
      }
      
    } catch (err) {
      console.error('恢复失败:', err);
      toast.error('恢复失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDataType = (key) => {
    if (selectedTypes.includes(key)) {
      setSelectedTypes(selectedTypes.filter(t => t !== key));
    } else {
      setSelectedTypes([...selectedTypes, key]);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen">
      <div>
        <h2 className="text-2xl font-bold mb-2">数据备份与恢复</h2>
        <p className="text-slate-600 dark:text-slate-400">
          备份你的学习数据，防止数据丢失。支持选择性备份和完整备份。
        </p>
      </div>

      {/* 数据备份 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">📦 数据备份</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">选择要备份的数据类型：</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DATA_TYPES.map(type => (
              <label
                key={type.key}
                className="flex items-start gap-2 p-3 border dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type.key)}
                  onChange={() => toggleDataType(type.key)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {type.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {type.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setSelectedTypes(DATA_TYPES.map(t => t.key))}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              全选
            </button>
            <span className="text-slate-400">|</span>
            <button
              onClick={() => setSelectedTypes([])}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              全不选
            </button>
          </div>
        </div>

        <button
          onClick={handleBackup}
          disabled={backingUp || selectedTypes.length === 0}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {backingUp ? '备份中...' : `备份选中数据 (${selectedTypes.length} 项)`}
        </button>
      </div>

      {/* 数据恢复 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">📥 数据恢复</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">选择备份文件：</label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          />
        </div>

        {restoreValidation && (
          <div className={`mb-4 p-4 rounded-lg ${
            restoreValidation.valid
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {restoreValidation.valid ? (
              <div>
                <div className="font-semibold text-green-700 dark:text-green-300 mb-2">
                  ✅ 备份文件有效
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <div>总数据项: {restoreValidation.totalItems}</div>
                  {restoreValidation.stats && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(restoreValidation.stats).map(([key, count]) => (
                        <div key={key}>
                          {DATA_TYPES.find(t => t.key === key)?.label || key}: {count}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-red-700 dark:text-red-300">
                ❌ {restoreValidation.error || '无效的备份文件'}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleRestore}
          disabled={!restoreValidation?.valid || loading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '恢复中...' : '恢复数据'}
        </button>

        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            ⚠️ 注意：恢复数据将覆盖现有数据，请谨慎操作。建议先备份当前数据。
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">📖 使用说明</h3>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <div>
            <strong>备份：</strong>选择要备份的数据类型，点击"备份选中数据"按钮，系统会下载一个JSON格式的备份文件。
          </div>
          <div>
            <strong>恢复：</strong>选择之前备份的JSON文件，系统会验证文件有效性，确认后可以恢复数据。
          </div>
          <div>
            <strong>建议：</strong>定期备份数据，特别是在重要操作前。备份文件请妥善保管。
          </div>
        </div>
      </div>
    </div>
  );
}

