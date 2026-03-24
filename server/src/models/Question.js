/** 
 * GraphTutor 后端代码说明
 * 文件路径：server/src/models/Question.js
 * 模块功能：试题模型，定义题干、选项、正确答案、所属知识点、题库、难度等字段。
 * 主要职责：
 *   - 存储单选题的完整信息；
 *   - 为题库管理、练习模式、考试模式提供统一的数据结构；
 *   - 支持按题库、知识点、难度等多维度查询。
 *
 * 技术栈：Node.js + Express + Mongoose（MongoDB）
 * 说明：本注释仅用于课程报告与代码阅读，不影响原有功能逻辑。
 */

// server/src/models/Question.js
// 题目模型：单选题 + 元信息

import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema(
  {
    /**
     * 业务 ID（可选）
     * - 用来兼容外部导入的题号，例如 "OS-001"
     * - 与 MongoDB 自带的 _id 不冲突
     */
    id: {
      type: String,
      index: true,
      sparse: true, // 允许为空，避免null值唯一性冲突
    },

    /**
     * 所属知识点：对应 KnowledgeNode.key
     * 例如 "os:process-thread"
     */
    knowledgeNodeId: {
      type: String,
      // index: true, // 通过下面的复合索引定义实现
    },

    /**
     * 所属题库（新增）
     * - 指向 QuestionBank._id
     * - 用来做“题库分类”：操作系统题库 / 计网题库 / 设计模式题库 等
     */
    bankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionBank',
      index: true,
    },

    /**
     * 难度等级（1~5）
     * 1：非常基础（记忆题）
     * 2：基础理解
     * 3：一般/中等
     * 4：偏难（多步推理 / 易混淆点）
     * 5：很难/挑战题（综合应用）
     */
    difficulty: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
      index: true,
    },

    /**
     * 题型
     * - single: 单选题（默认）
     * - multiple: 多选题
     * - fill: 填空题
     * - short: 简答题
     * - judge: 判断题
     */
    type: {
      type: String,
      enum: ['single', 'multiple', 'fill', 'short', 'judge'],
      default: 'single',
      index: true,
    },

    // 题干内容
    content: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * 选项数组（用于选择题）
     * - 单选题/多选题：至少 2 个选项
     * - 判断题：通常 2 个选项（对/错）
     * - 填空题/简答题：可以为空
     */
    options: {
      type: [String],
      validate: {
        validator(v) {
          // 选择题和判断题需要至少2个选项
          const questionType = this.type || 'single';
          if (['single', 'multiple', 'judge'].includes(questionType)) {
            return Array.isArray(v) && v.length >= 2;
          }
          // 填空题和简答题可以为空
          return Array.isArray(v);
        },
        message: '选择题和判断题至少需要 2 个选项',
      },
    },

    /**
     * 正确答案
     * - 单选题/判断题：正确选项的下标（0-based）
     * - 多选题：正确选项的下标数组，如 [0, 2, 3]
     * - 填空题：答案字符串数组，如 ["答案1", "答案2"]
     * - 简答题：参考答案（字符串）
     */
    answer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // 正确选项在 options 中的下标（0-based）- 向后兼容，用于单选题
    // 如果 type 是 single 或 judge，answerIndex 和 answer 应该一致
    answerIndex: {
      type: Number,
      sparse: true, // 允许为空，向后兼容
    },

    /**
     * 填空题专用字段
     */
    // 空白数量（填空题）
    blanks: {
      type: Number,
      sparse: true, // 允许为空，仅填空题使用
      min: 1,
    },
    // 填空题答案数组（填空题）
    blankAnswers: {
      type: [String],
      sparse: true, // 允许为空，仅填空题使用
    },

    // 标签：例如 ["填空改编", "历年真题", "OS", "线程"]
    tags: {
      type: [String],
      default: [],
    },

    /**
     * 题目来源
     * - bank：普通题库录入
     * - template：模板生成
     * - ai：大模型生成
     * - qg：文本/文件自动出题
     */
    source: {
      type: String,
      default: 'bank',
    },

    // 内部版本号（预留，方便以后做题目演化）
    version: {
      type: Number,
      default: 1,
    },

    // 解析 / 参考答案说明
    explain: {
      type: String,
      default: '',
    },

    /**
     * V3.0 新增字段
     */
    
    // 题目业务ID（新格式）：SUBJECT_CODE-YEAR-SEQ
    // 示例：CS-DS-2024-001
    // 与 id 字段并存，向后兼容
    qid: {
      type: String,
      // index: true, // 通过下面的索引定义实现
      sparse: true, // 允许为空，向后兼容
      // unique: true, // 通过下面的索引定义实现唯一性
    },

    // 关联学科代码（指向 Subject.code）
    subjectCode: {
      type: String,
      // index: true, // 通过下面的复合索引定义实现
      sparse: true, // 允许为空，向后兼容
    },

    // 题目创建者ID（创建题目时自动设置为当前用户）
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // 题目负责人ID（出题负责人，向后兼容，与creatorId相同）
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // index: true, // 通过下面的复合索引定义实现
      sparse: true, // 允许为空
    },

    // 关联的群组ID（V3.0新增）
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
      index: true,
    },

  },
  { timestamps: true }
);

// 索引：按创建时间倒序（最近的题排前面）
QuestionSchema.index({ createdAt: -1 });

// 索引：按知识点 + 难度查询
QuestionSchema.index({ knowledgeNodeId: 1, difficulty: 1 });

// 索引：按题库 + 知识点 + 难度查询（用于出卷）
QuestionSchema.index({ bankId: 1, knowledgeNodeId: 1, difficulty: 1 });

// V3.0 新增索引
// 索引：qid字段唯一索引
QuestionSchema.index({ qid: 1 }, { unique: true, sparse: true });
// 索引：按学科代码查询
QuestionSchema.index({ subjectCode: 1, difficulty: 1 });
// 索引：按负责人查询
QuestionSchema.index({ managerId: 1, createdAt: -1 });
// 索引：按题型查询
QuestionSchema.index({ type: 1, difficulty: 1 });

// 文本搜索索引（用于全文搜索）
// 注意：MongoDB一个集合只能有一个文本索引
QuestionSchema.index({
  content: 'text',
  explain: 'text',
  tags: 'text',
  qid: 'text',
  id: 'text',
}, {
  name: 'question_text_index',
  weights: {
    content: 10,    // 题干权重最高
    explain: 5,     // 解析权重中等
    tags: 3,        // 标签权重较低
    qid: 2,         // 题目ID权重最低
    id: 2,
  },
});

// 保存前处理：向后兼容 answerIndex
QuestionSchema.pre('save', function(next) {
  // 如果是单选题或判断题，且 answerIndex 存在但 answer 不存在，则设置 answer
  if (['single', 'judge'].includes(this.type)) {
    if (this.answerIndex !== undefined && this.answer === undefined) {
      this.answer = this.answerIndex;
    }
    // 如果 answer 是数字，同步到 answerIndex（向后兼容）
    if (typeof this.answer === 'number' && this.answerIndex === undefined) {
      this.answerIndex = this.answer;
    }
  }
  next();
});

// 保存后处理：失效相关缓存
QuestionSchema.post('save', async function() {
  try {
    const { invalidateQuestionCache } = await import('../services/questionQuery.js');
    await invalidateQuestionCache(this._id.toString());
  } catch (err) {
    // 缓存失效失败不影响保存操作
    console.warn('失效题目缓存失败:', err.message);
  }
});

// 删除后处理：失效相关缓存
QuestionSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      const { invalidateQuestionCache } = await import('../services/questionQuery.js');
      await invalidateQuestionCache(doc._id.toString());
    } catch (err) {
      console.warn('失效题目缓存失败:', err.message);
    }
  }
});

QuestionSchema.post('deleteOne', async function() {
  try {
    const { invalidateQuestionCache } = await import('../services/questionQuery.js');
    const doc = this.getQuery();
    if (doc._id) {
      await invalidateQuestionCache(doc._id.toString());
    }
  } catch (err) {
    console.warn('失效题目缓存失败:', err.message);
  }
});

// 优化索引：添加常用查询组合索引
// 索引：按题库 + 题型 + 难度查询（用于题库筛选）
QuestionSchema.index({ bankId: 1, type: 1, difficulty: 1 });

// 索引：按题库 + 创建时间查询（用于题库题目列表）
QuestionSchema.index({ bankId: 1, createdAt: -1 });

// 索引：按学科 + 题型查询（用于学科筛选）
QuestionSchema.index({ subjectCode: 1, type: 1 });

// 索引：按标签查询（用于标签筛选）
QuestionSchema.index({ tags: 1 });

export default mongoose.model('Question', QuestionSchema);

