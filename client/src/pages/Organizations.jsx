import { useEffect, useState } from 'react';
import api from '../api/api.js';
import PageHeader from '../components/PageHeader';
import { toast } from '../utils/toast';

export default function Organizations() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [dashboard, setDashboard] = useState(null);

  async function load() {
    const res = await api.get('/v3/organizations');
    const list = res.data?.data || [];
    setItems(list);
    if (!selectedId && list[0]?._id) setSelectedId(list[0]._id);
  }

  useEffect(() => {
    load().catch(() => toast.error('加载机构失败'));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/v3/organizations/${selectedId}/dashboard`)
      .then((res) => setDashboard(res.data?.data || null))
      .catch(() => setDashboard(null));
  }, [selectedId]);

  async function createOrg(event) {
    event.preventDefault();
    try {
      await api.post('/v3/organizations', { name });
      setName('');
      toast.success('机构已创建');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || '创建失败');
    }
  }

  async function addMember(event) {
    event.preventDefault();
    if (!selectedId) return;
    try {
      await api.post(`/v3/organizations/${selectedId}/members`, { email, role: 'student' });
      setEmail('');
      toast.success('成员已加入');
      const res = await api.get(`/v3/organizations/${selectedId}/dashboard`);
      setDashboard(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || '添加失败');
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="机构"
        subtitle="创建学校或班级机构，查看成员近 30 天的答题记录。这不是入学成绩。"
      />
      <form onSubmit={createOrg} className="bg-white border rounded-lg p-4 flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="机构名称"
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">创建</button>
      </form>
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <label className="block text-sm">我的机构</label>
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          {items.map((item) => (
            <option key={item._id} value={item._id}>{item.name}</option>
          ))}
        </select>
        {dashboard && (
          <p className="text-sm text-slate-600">
            {dashboard.memberCount} 名成员，近 {dashboard.days} 天答了 {dashboard.answerCount} 题，正确率 {dashboard.accuracy}%。来源：{dashboard.source}。
          </p>
        )}
        <form onSubmit={addMember} className="flex gap-2">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="成员邮箱"
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button type="submit" className="px-4 py-2 border rounded-lg">添加成员</button>
        </form>
      </div>
    </div>
  );
}
