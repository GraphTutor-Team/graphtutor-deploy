import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackBar from '../components/BackBar';
import HelpHint from '../components/HelpHint.jsx';
import Toolbar from '../components/Toolbar.jsx';
import { downloadFile, toast, jsonReq, API_BASE } from '../utils/download';
import { listNodes, reorderNodes, createNode, deleteNode } from '../api/graph';
import { getKnowledgeNotes, createNote, updateNote, deleteNote } from '../api/v3/notes';
import { useAuth } from '../context/AuthContext';
import MarkdownPreview from '../components/MarkdownPreview';
import Icon from '../components/common/Icon';

export default function Nodes(){
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [expandedNode, setExpandedNode] = useState(null);
  const [nodeNotes, setNodeNotes] = useState({});
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [selectedNodeKey, setSelectedNodeKey] = useState('');
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    tags: [],
    isPublic: false,
  });

  async function load(){
    try{ setRows(await listNodes()); }catch{ setRows([]); }
  }
  useEffect(()=>{ load(); }, []);

  const loadNodeNotes = async (nodeKey) => {
    if (!user) return;
    try {
      const result = await getKnowledgeNotes(nodeKey);
      setNodeNotes(prev => ({ ...prev, [nodeKey]: result.data || [] }));
    } catch (err) {
      console.error('加载笔记失败:', err);
      setNodeNotes(prev => ({ ...prev, [nodeKey]: [] }));
    }
  };

  const toggleNodeExpanded = (nodeKey) => {
    if (expandedNode === nodeKey) {
      setExpandedNode(null);
    } else {
      setExpandedNode(nodeKey);
      if (!nodeNotes[nodeKey]) {
        loadNodeNotes(nodeKey);
      }
    }
  };

  const handleCreateNote = (nodeKey) => {
    if (!user) {
      toast('请先登录', 'warning');
      return;
    }
    setEditingNote(null);
    setSelectedNodeKey(nodeKey);
    setNoteForm({
      title: '',
      content: '',
      tags: [],
      isPublic: false,
    });
    setShowNoteModal(true);
  };

  const handleEditNote = (nodeKey, note) => {
    setEditingNote(note);
    setSelectedNodeKey(nodeKey);
    setNoteForm({
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      isPublic: note.isPublic || false,
    });
    setShowNoteModal(true);
  };

  const handleDeleteNote = async (nodeKey, noteId) => {
    if (!window.confirm('确定删除这篇笔记吗？')) return;
    try {
      await deleteNote(noteId);
      toast('已删除', 'success');
      loadNodeNotes(nodeKey);
    } catch (err) {
      toast(err.message || '删除失败', 'error');
    }
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim()) {
      toast('请输入笔记标题', 'warning');
      return;
    }
    if (!noteForm.content.trim()) {
      toast('请输入笔记内容', 'warning');
      return;
    }

    try {
      if (editingNote) {
        await updateNote(editingNote._id, {
          title: noteForm.title,
          content: noteForm.content,
          tags: noteForm.tags,
          isPublic: noteForm.isPublic,
        });
        toast('更新成功', 'success');
      } else {
        await createNote({
          type: 'knowledge',
          knowledgeNodeId: selectedNodeKey,
          title: noteForm.title,
          content: noteForm.content,
          tags: noteForm.tags,
          isPublic: noteForm.isPublic,
        });
        toast('创建成功', 'success');
      }
      setShowNoteModal(false);
      setEditingNote(null);
      loadNodeNotes(selectedNodeKey);
    } catch (err) {
      console.error('创建笔记失败:', err);
      toast(err.message || '创建笔记失败', 'error');
    }
  };

  async function add(){
    if(!newKey.trim()) return;
    try{ await createNode({ key:newKey.trim(), name:newName.trim() }); setNewKey(''); setNewName(''); await load(); }
    catch{ toast('创建失败'); }
  }

  function onDragStart(i){ setDragIndex(i); }
  function onDragOver(e){ e.preventDefault(); }
  async function onDrop(i){
    if (dragIndex===null || dragIndex===i) return;
    const arr = [...rows];
    const [m] = arr.splice(dragIndex, 1);
    arr.splice(i, 0, m);
    setDragIndex(null);
    setRows(arr);
    try{
      await reorderNodes(arr.map((x, idx) => ({ key:x.key, order: idx })));
      toast('已保存顺序');
    }catch{ toast('保存顺序失败'); }
  }

  function exportOrder(){
    const snapshot = rows.map((x, idx)=>({ key:x.key, name:x.name||'', order:idx }));
    downloadFile('nodes-order.json', JSON.stringify(snapshot, null, 2));
  }
  async function importOrder(){
    const input = document.createElement('input'); input.type='file'; input.accept='.json,application/json';
    input.onchange = async () => {
      const text = await input.files[0].text();
      try{
        const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('格式错误');
        await reorderNodes(arr.map((x, i)=>({ key:x.key, order: typeof x.order === 'number' ? x.order : i })));
        await load(); toast('已导入顺序');
      }catch{ toast('导入顺序失败'); }
    }; input.click();
  }

  return (
    <div className="space-y-4">
      <BackBar title="知识点管理" />
      <div className="card">
        <div className="p-6 space-y-6">
            <Toolbar>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="flex flex-1 gap-3">
                  <input 
                    className="input flex-1" 
                    placeholder="key（唯一标识）" 
                    value={newKey} 
                    onChange={e=>setNewKey(e.target.value)} 
                  />
                  <input 
                    className="input flex-1" 
                    placeholder="知识点名称" 
                    value={newName} 
                    onChange={e=>setNewName(e.target.value)} 
                  />
                  <button className="btn btn-primary" onClick={add}>
                    新增
                  </button>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost" onClick={exportOrder}>
                    导出顺序快照
                  </button>
                  <button className="btn btn-ghost" onClick={importOrder}>
                    导入顺序
                  </button>
                </div>
              </div>
            </Toolbar>

            <HelpHint>
              <div className="alert alert-info">
                <ul className="space-y-2 text-slate-900 font-medium">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-slate-900 rounded-full mr-3"></span>
                    <span>拖拽行即可调整顺序，松手后自动保存</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-slate-900 rounded-full mr-3"></span>
                    <span>「导出顺序快照」保存当前顺序为 JSON；「导入顺序」上传 JSON（含 key、order）可恢复顺序</span>
                  </li>
                </ul>
              </div>
            </HelpHint>

            <div className="card overflow-hidden p-0">
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-white border-b-2 border-slate-300">
                    <tr>
                      <th className="text-left px-6 py-4 font-bold text-slate-900 w-12">#</th>
                      <th className="text-left px-6 py-4 font-bold text-slate-900">Key</th>
                      <th className="text-left px-6 py-4 font-bold text-slate-900">名称</th>
                      <th className="text-left px-6 py-4 font-bold text-slate-900 w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((x,i)=>(
                      <>
                        <tr key={x.key}
                            draggable
                            onDragStart={()=>onDragStart(i)}
                            onDragOver={onDragOver}
                            onDrop={()=>onDrop(i)}
                            className="group hover:bg-slate-50 cursor-move transition-all duration-200 bg-white">
                          <td className="px-6 py-4 text-slate-900 font-semibold">{i+1}</td>
                          <td className="px-6 py-4">
                            <span className="font-mono bg-slate-100 px-2 py-1 rounded text-sm text-slate-900 font-semibold border border-slate-300">
                              {x.key}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-900 font-semibold">{x.name||'-'}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button 
                                className="btn btn-sm btn-outline text-xs opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1" 
                                onClick={() => toggleNodeExpanded(x.key)}
                                title="查看笔记"
                              >
                                <Icon name="notes" size={14} />
                                {expandedNode === x.key ? '收起' : '笔记'}
                              </button>
                              <button 
                                className="btn btn-danger text-xs opacity-0 group-hover:opacity-100 transition-all" 
                                onClick={async()=>{ if(confirm('确认删除该知识点？')){ await deleteNode(x.key); await load(); } }}
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedNode === x.key && (
                          <tr>
                            <td colSpan="4" className="px-6 py-4 bg-slate-50">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-slate-900">知识点笔记</h4>
                                  {user && (
                                    <button
                                      onClick={() => handleCreateNote(x.key)}
                                      className="btn btn-sm btn-primary"
                                    >
                                      + 添加笔记
                                    </button>
                                  )}
                                </div>
                                {!user && (
                                  <div className="text-sm text-slate-600 text-center py-4">
                                    请先登录以查看和添加笔记
                                  </div>
                                )}
                                {user && nodeNotes[x.key] && (
                                  <>
                                    {nodeNotes[x.key].length === 0 ? (
                                      <div className="text-center py-8 text-slate-500">
                                        <div className="mb-2 flex justify-center">
                                          <Icon name="notes" size={48} color="#6366f1" />
                                        </div>
                                        <div>暂无笔记，点击"添加笔记"创建第一篇笔记</div>
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {nodeNotes[x.key].map((note) => (
                                          <div
                                            key={note._id}
                                            className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                                          >
                                            <div className="flex items-start justify-between mb-2">
                                              <h5 className="font-semibold text-slate-900">{note.title}</h5>
                                              <div className="flex gap-2">
                                                {note.isPublic && (
                                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                                    公开
                                                  </span>
                                                )}
                                                <span className="text-xs text-slate-500">
                                                  {new Date(note.createdAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="text-slate-700 mb-2 max-h-32 overflow-hidden">
                                              <MarkdownPreview text={note.content} />
                                            </div>
                                            {note.tags && note.tags.length > 0 && (
                                              <div className="flex flex-wrap gap-2 mb-2">
                                                {note.tags.map((tag, idx) => (
                                                  <span
                                                    key={idx}
                                                    className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                                                  >
                                                    {tag}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                              <button
                                                type="button"
                                                onClick={() => handleEditNote(x.key, note)}
                                                className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50"
                                              >
                                                编辑
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteNote(x.key, note._id)}
                                                className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                                              >
                                                删除
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => navigate(`/notes?knowledgeNodeId=${encodeURIComponent(x.key)}`)}
                                                className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50"
                                              >
                                                在学习笔记中查看
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => navigate(`/notes?knowledgeNodeId=${encodeURIComponent(x.key)}&action=create`)}
                                                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                                              >
                                                新建更多
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {!rows.length && (
                      <tr>
                        <td className="px-6 py-12 text-center text-slate-700 font-semibold" colSpan="4">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-3 border-2 border-slate-300">
                              <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <span>暂无数据</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        </div>
      </div>

      {/* 笔记创建弹窗 */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {editingNote ? '编辑笔记' : '添加笔记'} — {rows.find(n => n.key === selectedNodeKey)?.name || selectedNodeKey}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">标题 *</label>
                <input
                  type="text"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="请输入笔记标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">内容 *（支持Markdown）</label>
                <textarea
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="10"
                  placeholder="请输入笔记内容，支持Markdown格式"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={noteForm.tags.join(', ')}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    setNoteForm({ ...noteForm, tags });
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="例如：重要, 难点, 易错"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={noteForm.isPublic}
                  onChange={(e) => setNoteForm({ ...noteForm, isPublic: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm">
                  公开笔记（其他用户可见）
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setEditingNote(null);
                  setSelectedNodeKey('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}