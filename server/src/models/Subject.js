/**
 * GraphTutor V3.0 - 学科分类模型
 * 
 * 功能：支持层级化学科分类系统
 * - 一级学科：如"计算机科学"、"数学"
 * - 二级学科：如"数据结构"、"算法"（可无限嵌套）
 * - 支持学科负责人管理
 */

import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema(
  {
    // 学科代码（唯一）：CS, CS-DS, MATH-ADV
    code: {
      type: String,
      required: true,
      // unique: true, // 通过下面的索引定义实现唯一性
      trim: true,
      validate: {
        validator: (v) => /^[A-Z0-9-]+$/.test(v),
        message: '学科代码只能包含大写字母、数字和连字符',
      },
    },

    // 学科名称：数据结构、算法
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // 层级：1-一级学科，2-二级学科，3-三级学科...
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 5, // 限制最大层级深度
      default: 1,
    },

    // 父学科ID（可选，用于构建树形结构）
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },

    // 学科描述
    description: {
      type: String,
      default: '',
      trim: true,
    },

    // 显示颜色（用于前端UI）
    color: {
      type: String,
      default: '#3B82F6',
      validate: {
        validator: (v) => /^#[0-9A-Fa-f]{6}$/.test(v),
        message: '颜色必须是十六进制格式（如 #3B82F6）',
      },
    },

    // 图标（emoji 或 icon名称）
    icon: {
      type: String,
      default: '📚',
    },

    // 排序（同级学科内的排序）
    order: {
      type: Number,
      default: 0,
    },

    // 负责人ID数组（出题负责人可以管理该学科）
    managers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // 是否启用
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
SubjectSchema.index({ code: 1 }, { unique: true });
SubjectSchema.index({ parentId: 1, order: 1 }); // 复合索引：按父学科和排序查询
SubjectSchema.index({ level: 1 }); // 按层级查询
SubjectSchema.index({ managers: 1 }); // 按负责人查询

// 虚拟字段：获取子学科数量
SubjectSchema.virtual('childrenCount', {
  ref: 'Subject',
  localField: '_id',
  foreignField: 'parentId',
  count: true,
});

// 虚拟字段：获取题目数量
SubjectSchema.virtual('questionCount', {
  ref: 'Question',
  localField: 'code',
  foreignField: 'subjectCode',
  count: true,
});

// 实例方法：获取所有子学科（递归）
SubjectSchema.methods.getChildren = async function (includeSelf = false) {
  const children = [];
  if (includeSelf) {
    children.push(this);
  }
  
  const directChildren = await mongoose.model('Subject').find({ parentId: this._id });
  for (const child of directChildren) {
    children.push(child);
    const grandChildren = await child.getChildren(false);
    children.push(...grandChildren);
  }
  
  return children;
};

// 静态方法：获取学科树
SubjectSchema.statics.getTree = async function (rootId = null) {
  const roots = rootId
    ? await this.find({ _id: rootId, enabled: true })
    : await this.find({ parentId: null, enabled: true }).sort({ order: 1 });
  
  const buildTree = async (parent) => {
    const children = await this.find({ parentId: parent._id, enabled: true }).sort({ order: 1 });
    const treeNode = parent.toObject();
    treeNode.children = [];
    
    for (const child of children) {
      const childTree = await buildTree(child);
      treeNode.children.push(childTree);
    }
    
    return treeNode;
  };
  
  const tree = [];
  for (const root of roots) {
    const rootTree = await buildTree(root);
    tree.push(rootTree);
  }
  
  return tree;
};

const Subject = mongoose.model('Subject', SubjectSchema);

export default Subject;

