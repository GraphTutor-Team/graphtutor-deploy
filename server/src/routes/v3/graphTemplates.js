/**
 * GraphTutor V3.0 - 节点导入模板下载API
 * 
 * 路径：/api/v3/graph-templates
 * 功能：提供节点导入模板下载
 */

import express from 'express';

const router = express.Router();

/**
 * 生成节点导入模板
 */
function generateNodeTemplate() {
  return {
    nodes: [
      {
        key: 'os-process',
        name: '进程',
        order: 0,
      },
      {
        key: 'os-thread',
        name: '线程',
        order: 1,
      },
      {
        key: 'os-scheduling',
        name: '进程调度',
        order: 2,
      },
      {
        key: 'ds-array',
        name: '数组',
        order: 0,
      },
      {
        key: 'ds-linked-list',
        name: '链表',
        order: 1,
      },
      {
        key: 'ds-tree',
        name: '树',
        order: 2,
      },
    ],
    metadata: {
      version: '1.0',
      description: 'GraphTutor 节点导入模板',
      format: 'graph-export.json',
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * GET /api/v3/graph-templates/json
 * 下载JSON格式的节点导入模板
 */
router.get('/json', (req, res) => {
  try {
    const template = generateNodeTemplate();
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="graph-template.json"');
    res.json(template);
  } catch (err) {
    console.error('GET /api/v3/graph-templates/json error:', err);
    res.status(500).json({
      success: false,
      message: '生成模板失败',
    });
  }
});

/**
 * GET /api/v3/graph-templates
 * 获取模板信息
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      formats: [
        {
          type: 'json',
          name: 'JSON格式',
          description: '节点数据导入模板，包含示例节点',
          downloadUrl: '/api/v3/graph-templates/json',
          filename: 'graph-template.json',
        },
      ],
      format: {
        nodes: [
          {
            key: 'string (必填) - 节点唯一标识',
            name: 'string (可选) - 节点显示名称',
            order: 'number (可选) - 节点排序顺序',
          },
        ],
      },
    },
  });
});

export default router;

