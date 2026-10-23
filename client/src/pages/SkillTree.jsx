/**
 * GraphTutor V3.0 - 学科技能树
 * 按学科展示知识点列表，掌握即点亮（正确率≥70% 且 答题≥3）
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSubjectTree } from '../api/v3/subjects';
import { getSkillTree } from '../api/v3/enhancedAnalytics';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import LoginPrompt from '../components/common/LoginPrompt';

function flattenSubjects(subjects, result = []) {
  subjects.forEach((s) => {
    if (s.code) result.push({ code: s.code, name: s.name || s.code });
    if (s.children?.length) flattenSubjects(s.children, result);
  });
  return result;
}

export default function SkillTree() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [subjectCode, setSubjectCode] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSubjectTree()
      .then((tree) => {
        setSubjects(tree || []);
        const flat = flattenSubjects(tree || []);
        if (flat.length && !subjectCode) setSubjectCode(flat[0].code);
      })
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!user || !subjectCode) return;
    setLoading(true);
    getSkillTree(subjectCode, 90)
      .then((res) => {
        setData(res?.data ?? null);
      })
      .catch(() => {
        toast.error('加载技能树失败');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [user, subjectCode]);

  const flatSubjects = flattenSubjects(subjects);
  const nodes = data?.nodes ?? [];
  const litCount = nodes.filter((n) => n.lit).length;

  if (!user) {
    return (
      <LoginPrompt
        title="登录后查看技能树"
        description="登录后可查看学科知识点点亮进度。也可先看教程，或去做题点亮节点。"
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="学科技能树"
        subtitle="正确率达到 70% 且至少做 3 题后可以点亮。有先修节点时，要等先修点亮。"
      />

      <div className="bg-white p-4 rounded-lg border flex flex-wrap items-center gap-4">
        <label className="font-medium text-slate-700">学科</label>
        <select
          value={subjectCode}
          onChange={(e) => setSubjectCode(e.target.value)}
          className="border rounded-lg px-3 py-2 min-w-[160px]"
        >
          {flatSubjects.map((s) => (
            <option key={s.code} value={s.code}>{s.name || s.code}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          近 90 天 · 已点亮 {litCount} / {nodes.length} 个节点
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">加载中...</div>
      ) : nodes.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border text-center">
          <div className="text-lg font-semibold text-slate-900 mb-2">该学科暂无知识点数据</div>
          <div className="text-sm text-slate-600">题目关联学科与知识点后，此处会显示技能树</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4 bg-emerald-50 border-b">
            <h3 className="font-semibold">
              {flatSubjects.find((s) => s.code === data?.subjectCode)?.name || data?.subjectCode} · 技能树
            </h3>
          </div>
          <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map((node) => (
              <div
                key={node.key}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  node.lit
                    ? 'bg-emerald-50 border-emerald-200'
                    : node.blockedBy
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    node.lit ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {node.lit ? '亮' : node.depth ? `${node.depth + 1}` : '1'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{node.name || node.key}</div>
                  <div className="text-sm text-slate-600">
                    {node.blockedBy
                      ? `先修「${node.blockedBy}」还没点亮`
                      : node.total > 0
                        ? `正确率 ${node.accuracy}% · ${node.total} 题`
                        : '未练习'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const key = node.blockedBy ? node.parentKey : node.key;
                    const name = node.blockedBy ? node.parentName : (node.name || node.key);
                    navigate(`/quiz?knowledgeNodeId=${encodeURIComponent(key)}&nodeName=${encodeURIComponent(name || key)}`);
                  }}
                  className="flex-shrink-0 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {node.blockedBy ? '先练先修' : '去练习'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
