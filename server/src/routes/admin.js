/**
 * GraphTutor V3.0 - 管理后台路由
 * 
 * 作用：提供管理后台相关的API接口，包括系统统计、报表生成等，仅管理员可访问
 * 关联页面：
 *   - client/src/pages/Admin.jsx (管理后台首页)
 *   - client/src/pages/admin/Reports.jsx (统计报表页面)
 *   - client/src/api/admin.js (前端API客户端)
 *   - services/reportService.js (报表生成服务)
 * 技术栈：
 *   - Express Router
 *   - 中间件认证 (requireAuth, requireAdmin)
 *   - MongoDB查询
 *   - 数据统计和汇总
 */

import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import Question from "../models/Question.js";
import User from "../models/User.js";
import { generateSystemReport } from "../services/reportService.js";
import { exportFullBackup, importFullBackup } from "../services/adminBackupService.js";

const router = express.Router();

// 先确保已登录 & 是管理员
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/export/all
 * 全量导出：学科 + 知识点 + 题库（含题目）+ 作答记录
 */
router.get("/export/all", async (req, res) => {
  try {
    const backup = await exportFullBackup();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="graphtutor_backup_${date}.json"`
    );
    res.json(backup);
  } catch (e) {
    console.error("GET /api/admin/export/all error:", e);
    res.status(500).json({
      success: false,
      message: e.message || "全量导出失败",
    });
  }
});

/**
 * POST /api/admin/import
 * 全量导入（JSON body）
 */
router.post("/import", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        success: false,
        message: "请提交有效的 JSON 备份",
      });
    }

    const result = await importFullBackup(payload);
    res.json({
      success: true,
      data: result,
      message: "导入完成",
    });
  } catch (e) {
    console.error("POST /api/admin/import error:", e);
    res.status(500).json({
      success: false,
      message: e.message || "全量导入失败",
    });
  }
});

/**
 * GET /api/admin/stats
 * 获取系统统计信息（增强版）
 */
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 基础统计
    const [
      questionCount,
      userCount,
      adminCount,
      questionManagerCount,
      studentCount,
    ] = await Promise.all([
      Question.countDocuments(),
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'question_manager' }),
      User.countDocuments({ role: 'student' }),
    ]);

    // 用户注册统计
    const [
      newUsersToday,
      newUsersLast7Days,
      newUsersLast30Days,
      activeUsersLast7Days,
      activeUsersLast30Days,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: last7Days } }),
      User.countDocuments({ createdAt: { $gte: last30Days } }),
      User.countDocuments({ lastLogin: { $gte: last7Days } }),
      User.countDocuments({ lastLogin: { $gte: last30Days } }),
    ]);

    // 题目统计（按难度、类型）
    const questionStats = await Question.aggregate([
      {
        $group: {
          _id: null,
          byDifficulty: {
            $push: '$difficulty',
          },
          byType: {
            $push: '$type',
          },
        },
      },
    ]);

    // 处理题目统计
    const difficultyStats = {};
    const typeStats = {};
    if (questionStats.length > 0) {
      questionStats[0].byDifficulty?.forEach((d) => {
        difficultyStats[d] = (difficultyStats[d] || 0) + 1;
      });
      questionStats[0].byType?.forEach((t) => {
        typeStats[t] = (typeStats[t] || 0) + 1;
      });
    }

    res.json({
      success: true,
      data: {
        // 基础统计
        questions: {
          total: questionCount,
          byDifficulty: difficultyStats,
          byType: typeStats,
        },
        users: {
          total: userCount,
          byRole: {
            admin: adminCount,
            question_manager: questionManagerCount,
            student: studentCount,
          },
          newUsers: {
            today: newUsersToday,
            last7Days: newUsersLast7Days,
            last30Days: newUsersLast30Days,
          },
          activeUsers: {
            last7Days: activeUsersLast7Days,
            last30Days: activeUsersLast30Days,
          },
        },
        // 兼容旧版本
        questionCount,
        userCount,
      },
    });
  } catch (e) {
    console.error("admin/stats error:", e);
    res.status(500).json({
      success: false,
      message: "获取后台统计失败",
    });
  }
});

// 示例：危险操作（清空题库）
router.post("/wipe-questions", async (req, res) => {
  try {
    await Question.deleteMany({});
    res.json({
      success: true,
      message: "题库已清空（仅管理员可操作）",
    });
  } catch (e) {
    console.error("wipe-questions error:", e);
    res.status(500).json({
      success: false,
      message: "清空题库失败",
    });
  }
});

/**
 * POST /api/admin/reports/generate
 * 生成系统统计报表
 * body: { type: 'daily'|'weekly'|'monthly'|'custom', startDate?: string, endDate?: string }
 */
router.post('/reports/generate', async (req, res) => {
  try {
    const { type, startDate, endDate } = req.body;

    const report = await generateSystemReport({
      type: type || 'custom',
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    console.error('POST /api/admin/reports/generate error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '生成报表失败',
    });
  }
});

export default router;