/**
 * GraphTutor V3.0 - 师徒关系页面
 * 申请成为徒弟、我的师徒、师傅处理申请
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import LoginPrompt from '../components/common/LoginPrompt';
import { toast } from '../utils/toast';
import {
  getMentorRelations,
  getMentorApplications,
  applyMentor,
  acceptMentorApplication,
  rejectMentorApplication,
} from '../api/v3/mentor';
import { getFriends } from '../api/v3/friends';

export default function Mentor() {
  const { user } = useAuth();
  const [relations, setRelations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('relations'); // relations | apply | applications
  const [applyMasterId, setApplyMasterId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadRelations();
      loadApplications();
      getFriends({ status: 'active', limit: 100 })
        .then((data) => setFriends(data?.items || data?.list || []))
        .catch(() => setFriends([]));
    }
  }, [user]);

  useEffect(() => {
    if (user) loadRelations();
  }, [tab]);

  const loadRelations = async () => {
    try {
      setLoading(true);
      const res = await getMentorRelations();
      setRelations(res.data?.items || []);
    } catch (err) {
      console.error('加载师徒关系失败:', err);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const res = await getMentorApplications();
      setApplications(res.data?.items || []);
    } catch (err) {
      console.error('加载申请列表失败:', err);
    }
  };

  const handleApply = async () => {
    const masterId = applyMasterId.trim();
    if (!masterId) {
      toast.error('请选择或输入师傅用户ID');
      return;
    }
    try {
      setSubmitting(true);
      await applyMentor(masterId);
      toast.success('申请已发送');
      setApplyMasterId('');
      loadRelations();
    } catch (err) {
      toast.error(err.response?.data?.message || '申请失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await acceptMentorApplication(id);
      toast.success('已接受');
      loadApplications();
      loadRelations();
    } catch (err) {
      toast.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectMentorApplication(id);
      toast.success('已拒绝');
      loadApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || '操作失败');
    }
  };

  if (!user) {
    return (
      <LoginPrompt
        title="登录后使用师徒功能"
        description="登录后可申请师傅或管理师徒关系。也可先看教程，或去做题。"
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="师徒"
        subtitle="向好友发出申请后，对方要在「待处理申请」里接受，关系才会建立。被拒绝后可以再次申请。"
      />

      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setTab('relations')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
            tab === 'relations' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          我的师徒
        </button>
        <button
          onClick={() => setTab('apply')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
            tab === 'apply' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          申请师傅
        </button>
        <button
          onClick={() => { setTab('applications'); loadApplications(); }}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
            tab === 'applications' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          待处理申请 {applications.length > 0 ? `(${applications.length})` : ''}
        </button>
      </div>

      {tab === 'relations' && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">师徒关系</h3>
          {loading ? (
            <div className="text-center py-8 text-slate-500">加载中...</div>
          ) : relations.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              暂无师徒关系。在「申请师傅」中向好友申请成为其徒弟，或等待他人申请你为师傅。
            </div>
          ) : (
            <div className="space-y-3">
              {relations.map((r) => (
                <div
                  key={r._id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <span className="font-medium">{r.master?.name || r.masterId}</span>
                    <span className="text-slate-500 mx-2">→</span>
                    <span className="font-medium">{r.apprentice?.name || r.apprenticeId}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                      r.status === 'active' ? 'bg-green-100 text-green-700' :
                      r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {r.status === 'active' ? '已建立' : r.status === 'pending' ? '待处理' : '已拒绝'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'apply' && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">申请成为徒弟</h3>
          <p className="text-sm text-slate-600 mb-4">
            选择一位好友作为师傅，或输入其用户 ID（可从对方个人页或链接获取）。
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            {friends.length > 0 && (
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium mb-1">从好友中选择</label>
                <select
                  value={applyMasterId}
                  onChange={(e) => setApplyMasterId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">请选择</option>
                  {friends.map((f) => {
                    const friendId = String(f._id || f.id || '');
                    return (
                      <option key={friendId} value={friendId}>
                        {f.name || f.email || friendId}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium mb-1">或输入用户 ID</label>
              <input
                type="text"
                value={applyMasterId}
                onChange={(e) => setApplyMasterId(e.target.value)}
                placeholder="用户 ID"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={handleApply}
              disabled={submitting || !applyMasterId.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '发送中...' : '发送申请'}
            </button>
          </div>
        </div>
      )}

      {tab === 'applications' && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">待处理的申请（他人申请你为师傅）</h3>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-slate-600">暂无待处理申请</div>
          ) : (
            <div className="space-y-3">
              {applications.map((r) => (
                <div
                  key={r._id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium break-words">{r.apprentice?.name || r.apprenticeId}</span>
                    <span className="text-slate-500 text-sm ml-2">
                      申请成为你的徒弟 · {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleAccept(r._id)}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      接受
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(r._id)}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
