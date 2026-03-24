// 题库管理路由：用于创建 / 查看 / 更新题库（QuestionBank）

import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import QuestionBank from "../models/QuestionBank.js";

const router = express.Router();

/**
 * GET /api/banks
 * 获取题库列表
 * - 所有登录用户都可以调用，用于前端“选择题库”
 * - 后续如果有私有题库，可以在这里做 owner / isPublic 过滤
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const banks = await QuestionBank.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: banks,
    });
  } catch (err) {
    console.error("GET /api/banks error:", err);
    res.status(500).json({
      success: false,
      message: "获取题库列表失败",
    });
  }
});

/**
 * POST /api/banks
 * 创建新的题库
 * - 建议只允许管理员操作（防止乱建）
 * - body: { name, key?, description? }
 */
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, key, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "题库名称 name 不能为空",
      });
    }

    const bank = await QuestionBank.create({
      name: name.trim(),
      key: key?.trim() || undefined,
      description: description || "",
      ownerId: req.user.id, // 使用 req.user.id（从中间件获取）
      managers: [req.user.id], // V3.0: 自动添加创建者到managers数组
      isPublic: true,
    });

    res.status(201).json({
      success: true,
      data: bank,
    });
  } catch (err) {
    console.error("POST /api/banks error:", err);
    // 处理 key 唯一约束冲突
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "题库 key 已存在，请更换一个英文标识",
      });
    }
    res.status(500).json({
      success: false,
      message: "创建题库失败",
    });
  }
});

/**
 * PUT /api/banks/:id
 * 更新题库（名称 / 描述 / 是否公开）
 */
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;

    const bank = await QuestionBank.findByIdAndUpdate(
      id,
      {
        ...(name != null ? { name: name.trim() } : {}),
        ...(description != null ? { description } : {}),
        ...(typeof isPublic === "boolean" ? { isPublic } : {}),
      },
      { new: true }
    );

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "题库不存在",
      });
    }

    res.json({
      success: true,
      data: bank,
    });
  } catch (err) {
    console.error("PUT /api/banks/:id error:", err);
    res.status(500).json({
      success: false,
      message: "更新题库失败",
    });
  }
});

/**
 * DELETE /api/banks/:id
 * 暂时不真正删除题库，防止题目丢引用。
 * 如果以后要支持删除，建议先检查该题库下是否还有 Question。
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  return res.status(400).json({
    success: false,
    message: "暂不支持删除题库，以避免误删导致题目无归属",
  });
});

export default router;
