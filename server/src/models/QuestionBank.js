// server/src/models/QuestionBank.js
/** 
 * GraphTutor 后端代码说明
 * 文件路径：server/src/models/QuestionBank.js
 * 模块功能：题库（QuestionBank）模型，用于对试题按课程 / 章节 / 考试进行分组管理。
 * 主要字段：
 *   - name: 题库名称，如“操作系统·进程管理”
 *   - key: 题库标识（英文/拼音 slug），方便导入/导出或脚本使用
 *   - description: 说明备注
 *   - ownerId: 创建者（可选）
 *   - isPublic: 是否对所有用户可见
 */

import mongoose from 'mongoose';

const QuestionBankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // 可选：唯一标识，用英文/拼音，如 os-process、net-udp
    key: {
      type: String,
      trim: true,
      // unique: true, // 通过下面的索引定义实现唯一性
      sparse: true,
      // index: true, // 通过下面的索引定义实现
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    // 创建者（可选）
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // 是否公共题库（true=所有人都能看到；false=仅本课程/本班使用）
    isPublic: {
      type: Boolean,
      default: true,
    },

    /**
     * V3.0 新增字段
     */
    
    // 关联学科代码（指向 Subject.code）
    subjectCode: {
      type: String,
      sparse: true, // 允许为空，向后兼容
    },

    // 管理者ID数组（出题负责人可以管理该题库）
    // ownerId 会自动添加到 managers 数组中
    managers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // 题库配置
    settings: {
      // 难度范围：[1, 5] 表示只包含1-5级难度的题目
      difficultyRange: {
        type: [Number],
        default: [1, 2, 3, 4, 5],
      },
      // 支持的题型
      questionTypes: {
        type: [String],
        default: ['single'], // single: 单选题
      },
      // 是否启用AI生成
      aiEnabled: {
        type: Boolean,
        default: false,
      },
    },

    // 题目数量（缓存，避免每次查询）
    questionCount: {
      type: Number,
      default: 0,
    },

    // 关联的群组ID（V3.0新增）
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
      index: true,
    },

    // 是否为官方题库（只有管理员可以创建和管理官方题库）
    isOfficial: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// 虚拟字段：题库类型
// official: 官方题库（isOfficial=true）
// group: 小组题库（groupId不为空）
// personal: 个人题库（ownerId不为空且groupId为空且isOfficial=false）
QuestionBankSchema.virtual('bankType').get(function () {
  if (this.isOfficial) {
    return 'official';
  }
  if (this.groupId) {
    return 'group';
  }
  return 'personal';
});

// 确保虚拟字段在JSON输出中包含
QuestionBankSchema.set('toJSON', { virtuals: true });
QuestionBankSchema.set('toObject', { virtuals: true });

QuestionBankSchema.index({ createdAt: -1 });

// V3.0 新增索引
// 索引：key字段唯一索引
QuestionBankSchema.index({ key: 1 }, { unique: true, sparse: true });
// 索引：按学科代码查询
QuestionBankSchema.index({ subjectCode: 1 });
// 索引：按管理者查询
QuestionBankSchema.index({ managers: 1 });
// 索引：按创建者查询（保持兼容）
QuestionBankSchema.index({ ownerId: 1 });

export default mongoose.model('QuestionBank', QuestionBankSchema);
