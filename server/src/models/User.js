// 用户模型：基础登录信息 + 角色 + 扩展个人资料字段

import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      // unique: true, // 通过下面的索引定义实现唯一性
    },
    // 登录用的密码哈希（推荐统一用这个字段）；OAuth 用户可为空
    passwordHash: {
      type: String,
      required: false,
    },
    // GitHub OAuth 绑定：GitHub 用户数字 id
    githubId: {
      type: String,
      sparse: true, // 仅非空时唯一
    },
    // 手机号（短信验证码登录 / 绑定）
    phone: {
      type: String,
      sparse: true,
    },
    // 微信开放平台（网站应用扫码登录）openid
    wechatOpenId: {
      type: String,
      sparse: true,
    },
    // 微信 unionid（可选，用于与小程序等打通）
    wechatUnionId: {
      type: String,
      sparse: true,
    },
    // 微信小程序 openid（与网站应用 openid 不同，须单独存储）
    wechatMpOpenId: {
      type: String,
      sparse: true,
    },

    // 显示名称 / 姓名
    name: {
      type: String,
    },

    // 角色：学习者 / 出题负责人 / 管理员
    // V3.0 扩展：支持三种角色
    // - student: 学习者（原 user 角色自动映射）
    // - question_manager: 出题负责人
    // - admin: 管理员
    role: {
      type: String,
      enum: ["student", "question_manager", "admin"],
      default: "student",
    },

    // ✅ 扩展个人资料：头像、学校等
    avatarUrl: {
      type: String, // 先用 URL 字符串，之后有需要可以做上传
    },
    school: {
      type: String,
    },
    major: {
      type: String,
    },
    grade: {
      type: String, // 比如：大一 / 大二 / 研一...
    },
    // 升学/发展目标：考研、考公、留学、就业、其他（用于升学报告与对比）
    advancementTarget: {
      type: String,
      enum: ['考研', '考公', '留学', '就业', '其他', ''],
      default: '',
    },
    studentId: {
      type: String,
    },
    bio: {
      type: String, // 个人简介 / 自我介绍
      maxlength: 500,
    },
    // 收藏的题目ID列表
    favorites: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Question',
      default: [],
    },
    // 积分（用于悬赏提问、成就商城兑换等）
    points: {
      type: Number,
      default: 100,
      min: 0,
    },
    // 背包：商城兑换的道具 { itemId, count }
    inventory: {
      type: [
        {
          itemId: { type: String, required: true },
          count: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    // 双倍经验卡生效截止时间（使用后 24h 内答题得分双倍）
    doubleExpiresAt: {
      type: Date,
      default: null,
    },
    // 好友设置
    friendSettings: {
      allowFriendRequests: {
        type: Boolean,
        default: true, // 默认允许接收好友请求
      },
      showLearningData: {
        type: Boolean,
        default: true, // 默认向好友显示学习数据
      },
      showAchievements: {
        type: Boolean,
        default: true, // 默认向好友显示成就
      },
      showProfile: {
        type: Boolean,
        default: true, // 默认允许好友查看个人资料
      },
    },

    // 学习元宇宙：角色养成（选择角色，通过完成任务获得经验升级）
    learningRole: {
      type: String,
      enum: ['学者', '探险家', '书虫', '奋斗者'],
      default: '学者',
    },
    learningLevel: {
      type: Number,
      default: 1,
      min: 1,
    },
    learningExp: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ githubId: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ wechatOpenId: 1 }, { unique: true, sparse: true });
UserSchema.index({ wechatUnionId: 1 }, { sparse: true });
UserSchema.index({ wechatMpOpenId: 1 }, { unique: true, sparse: true });

const User = mongoose.model("User", UserSchema);

export default User;