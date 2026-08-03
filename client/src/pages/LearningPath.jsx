/**
 * GraphTutor V3.0 - 学习路径推荐页面
 * 
 * 功能：基于知识图谱推荐个性化学习路径
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getKnowledgeMastery } from '../api/analytics';
import api from '../api/api';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import { Link } from 'react-router-dom';
import { cachedApiRequest, generateCacheKey } from '../utils/apiCache';
import { getPathRecommendations } from '../api/v3/enhancedAnalytics';

export default function LearningPath() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [masteryData, setMasteryData] = useState({});
  const [recommendedPath, setRecommendedPath] = useState([]);
  const [recommendedNext, setRecommendedNext] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStartNode, setSelectedStartNode] = useState('');
  const [selectedEndNode, setSelectedEndNode] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (nodes.length > 0 && Object.keys(masteryData).length > 0) {
      generatePath();
    }
  }, [nodes, masteryData, selectedStartNode, selectedEndNode]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载知识节点
      const nodesRes = await api.get('/graph/nodes');
      const nodesList = Array.isArray(nodesRes.data) ? nodesRes.data : (nodesRes.data?.nodes || []);
      setNodes(nodesList);

      // 加载节点关系（如果有）
      try {
        const linksRes = await api.get('/graph/links');
        const linksList = Array.isArray(linksRes.data) ? linksRes.data : (linksRes.data?.links || []);
        setLinks(linksList);
      } catch (err) {
        console.warn('加载节点关系失败:', err);
      }

      // 加载掌握度数据
      if (user?._id || user?.id) {
        try {
          const userId = user._id || user.id;
          const cacheKey = generateCacheKey('knowledgeMastery', { userId });
          const mastery = await cachedApiRequest(
            () => getKnowledgeMastery({ userId }),
            cacheKey,
            { ttl: 5 * 60 * 1000 } // 5分钟缓存
          );
          const masteryMap = {};
          if (mastery && mastery.knowledgeNodes) {
            mastery.knowledgeNodes.forEach((node) => {
              masteryMap[node.knowledgeNodeId] = {
                accuracy: node.accuracy || 0,
                total: node.total || 0,
                mastered: (node.accuracy || 0) >= 80,
              };
            });
          }
          setMasteryData(masteryMap);
        } catch (err) {
          console.warn('加载掌握度失败:', err);
        }

        // 加载路径推荐（下一步学习）
        try {
          const recRes = await getPathRecommendations(90, 5);
          const list = recRes?.data || recRes || [];
          if (Array.isArray(list)) {
            setRecommendedNext(list);
          } else {
            setRecommendedNext([]);
          }
        } catch (err) {
          console.warn('加载路径推荐失败:', err);
          setRecommendedNext([]);
        }
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const generatePath = () => {
    if (nodes.length === 0) return;

    // 构建节点图
    const nodeMap = new Map();
    nodes.forEach((node) => {
      nodeMap.set(node.key, {
        ...node,
        mastery: masteryData[node.key] || { accuracy: 0, total: 0, mastered: false },
      });
    });

    // 构建邻接表
    const adjacencyList = new Map();
    nodes.forEach((node) => {
      adjacencyList.set(node.key, []);
    });

    // 添加链接关系
    links.forEach((link) => {
      if (adjacencyList.has(link.source) && adjacencyList.has(link.target)) {
        adjacencyList.get(link.source).push(link.target);
      }
    });

    // 如果没有链接，按order排序创建路径
    if (links.length === 0) {
      const sortedNodes = [...nodes].sort((a, b) => (a.order || 0) - (b.order || 0));
      const path = sortedNodes.map((node) => ({
        node,
        mastery: masteryData[node.key] || { accuracy: 0, total: 0, mastered: false },
        order: node.order || 0,
      }));
      setRecommendedPath(path);
      return;
    }

    // 使用BFS或DFS生成学习路径
    const path = [];
    const visited = new Set();
    const startNode = selectedStartNode || nodes[0]?.key;

    if (!startNode) return;

    // BFS遍历
    const queue = [startNode];
    visited.add(startNode);

    while (queue.length > 0) {
      const current = queue.shift();
      const node = nodeMap.get(current);
      if (node) {
        path.push({
          node,
          mastery: node.mastery,
          order: path.length + 1,
        });
      }

      const neighbors = adjacencyList.get(current) || [];
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }

    // 添加未访问的节点
    nodes.forEach((node) => {
      if (!visited.has(node.key)) {
        path.push({
          node,
          mastery: masteryData[node.key] || { accuracy: 0, total: 0, mastered: false },
          order: path.length + 1,
        });
      }
    });

    setRecommendedPath(path);
  };

  const getNodeStatus = (mastery) => {
    if (!mastery || mastery.total === 0) return { label: '未学习', color: 'bg-slate-200 text-slate-700' };
    if (mastery.mastered) return { label: '已掌握', color: 'bg-green-200 text-green-700' };
    if (mastery.accuracy >= 60) return { label: '学习中', color: 'bg-yellow-200 text-yellow-700' };
    return { label: '需加强', color: 'bg-red-200 text-red-700' };
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="学习路径推荐" subtitle="基于知识图谱的个性化学习路径" />
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="学习路径推荐" subtitle="基于知识图谱的个性化学习路径规划" />

      {/* 推荐下一步学习（Phase 2.5） */}
      {recommendedNext.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>推荐下一步学习</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  基于你最近的掌握度与知识点顺序
                </span>
              </h3>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {recommendedNext.map((item) => {
              const node = nodes.find((n) => n.key === item.key) || {};
              const displayedName = node.name || item.name || item.key;
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {displayedName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      正确率 {item.accuracy?.toFixed?.(1) ?? item.accuracy ?? 0}% · 已做 {item.total || 0} 题
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {item.reason}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 ml-2">
                    <Link
                      to={`/quiz?knowledgeNodeId=${item.key}`}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      去练习
                    </Link>
                    <Link
                      to={`/graph?node=${item.key}`}
                      className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      看图谱
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 路径配置 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-bold mb-4">路径配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">起始节点（可选）</label>
            <select
              value={selectedStartNode}
              onChange={(e) => setSelectedStartNode(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">自动选择</option>
              {nodes.map((node) => (
                <option key={node.key} value={node.key}>
                  {node.name || node.key}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">目标节点（可选）</label>
            <select
              value={selectedEndNode}
              onChange={(e) => setSelectedEndNode(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">无限制</option>
              {nodes.map((node) => (
                <option key={node.key} value={node.key}>
                  {node.name || node.key}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 学习路径 */}
      {recommendedPath.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <div className="text-lg font-semibold text-slate-900 mb-2">暂无学习路径</div>
          <div className="text-sm text-slate-600">
            请先在知识图谱中添加节点和关系
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">推荐学习路径</h3>
            <div className="text-sm text-slate-600">
              共 {recommendedPath.length} 个知识点
            </div>
          </div>

          <div className="space-y-3">
            {recommendedPath.map((item, idx) => {
              const status = getNodeStatus(item.mastery);
              return (
                <div
                  key={item.node.key || idx}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                    {item.order}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">{item.node.name || item.node.key}</h4>
                      <span className={`px-2 py-1 text-xs rounded ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    {item.mastery.total > 0 && (
                      <div className="text-sm text-slate-600">
                        已做 {item.mastery.total} 题，正确率 {item.mastery.accuracy?.toFixed(1) || 0}%
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/quiz?knowledgeNodeId=${item.node.key}`}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      开始练习
                    </Link>
                    <Link
                      to={`/graph?node=${item.node.key}`}
                      className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50"
                    >
                      查看图谱
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 路径统计 */}
      {recommendedPath.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">总节点数</div>
            <div className="text-3xl font-bold text-blue-600">{recommendedPath.length}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">已掌握</div>
            <div className="text-3xl font-bold text-green-600">
              {recommendedPath.filter((p) => p.mastery.mastered).length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">学习中</div>
            <div className="text-3xl font-bold text-yellow-600">
              {recommendedPath.filter(
                (p) => !p.mastery.mastered && p.mastery.total > 0
              ).length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">未学习</div>
            <div className="text-3xl font-bold text-slate-600">
              {recommendedPath.filter((p) => p.mastery.total === 0).length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

