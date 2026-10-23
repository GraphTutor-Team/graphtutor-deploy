/**
 * GraphTutor V3.0 - Express应用主文件
 * 
 * 作用：配置Express应用，包括中间件设置、路由注册、错误处理等
 * 关联页面：
 *   - routes/*.js (所有路由文件)
 *   - middleware/*.js (所有中间件)
 *   - db.js (数据库连接)
 *   - server.js (服务器启动文件)
 * 技术栈：
 *   - Express框架
 *   - CORS (跨域支持)
 *   - Morgan (日志记录)
 *   - Cookie Parser
 *   - 静态文件服务
 */

import "dotenv/config";

import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import graphRoutes from "./routes/graph.js";
import questionRoutes from "./routes/questions.js";
import recordRoutes from "./routes/records.js";
import quizRoutes from "./routes/quizzes.js";
import analyticsRoutes from "./routes/analytics.js";
import adminRoutes from "./routes/admin.js";
import qgFileRoutes from "./routes/qg_file.js";
import aiRoutes from "./routes/ai.js";
import bankRoutes from "./routes/banks.js";
import subjectRoutes from "./routes/subjects.js";
import v3BankRoutes from "./routes/v3/questionBanks.js";
import v3QuestionRoutes from "./routes/v3/questions.js";
import v3AIRoutes from "./routes/v3/ai.js";
import v3RoleApplicationRoutes from "./routes/v3/roleApplications.js";
import v3QuestionTemplateRoutes from "./routes/v3/questionTemplates.js";
import v3GraphTemplateRoutes from "./routes/v3/graphTemplates.js";
import v3TemplatesRoutes from "./routes/v3/templates.js";
import v3LearningGoalsRoutes from "./routes/v3/learningGoals.js";
import v3AchievementsRoutes from "./routes/v3/achievements.js";
import v3LearningPathRoutes from "./routes/v3/learningPath.js";
import v3RecommendationsRoutes from "./routes/v3/recommendations.js";
import v3GroupsRoutes from "./routes/v3/groups.js";
import v3WrongQuestionsRoutes from "./routes/v3/wrongQuestions.js";
import v3ReviewPlansRoutes from "./routes/v3/reviewPlans.js";
import v3FavoritesRoutes from "./routes/v3/favorites.js";
import v3NotesRoutes from "./routes/v3/notes.js";
import v3StudyPlansRoutes from "./routes/v3/studyPlans.js";
import v3SmartReviewRoutes from "./routes/v3/smartReview.js";
import v3EnhancedAnalyticsRoutes from "./routes/v3/enhancedAnalytics.js";
import v3AdaptiveRoutes from "./routes/v3/adaptive.js";
import v3FriendsRoutes from "./routes/v3/friends.js";
import v3MessagesRoutes from "./routes/v3/messages.js";
import v3FriendChallengesRoutes from "./routes/v3/friendChallenges.js";
import v3LearningPostsRoutes from "./routes/v3/learningPosts.js";
import v3DailyChallengeRoutes from "./routes/v3/dailyChallenge.js";
import v3CodingRoutes from "./routes/v3/coding.js";
import { securityHeaders } from "./middleware/security.js";
import { defaultResponseTimeLogger } from "./middleware/responseTime.js";
import { apiRateLimiter, strictRateLimiter } from "./middleware/rateLimiter.js";
import { handleError } from "./utils/errorHandler.js";
import { csrfTokenMiddleware, csrfProtection, csrfTokenHandler } from "./middleware/csrf.js";

export async function createServer() {
  const app = express();

  // 反代 / Docker 后 req.ip 才可能是真实客户端 IP（限流按 IP 计数）
  app.set('trust proxy', process.env.TRUST_PROXY !== 'false' ? 1 : false);

  // 安全头（最先应用）
  app.use(securityHeaders);

  // CORS配置（需要支持credentials以传输cookie）
  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
  ];
  const fe = process.env.FRONTEND_URL?.replace(/\/$/, '');
  if (fe && !allowedOrigins.includes(fe)) {
    allowedOrigins.push(fe);
  }
  if (process.env.MINIPROGRAM_ORIGIN) {
    allowedOrigins.push(process.env.MINIPROGRAM_ORIGIN);
  }
  app.use(cors({
    origin: (origin, cb) => {
      const allow = !origin || allowedOrigins.indexOf(origin) !== -1;
      cb(null, allow ? (origin || allowedOrigins[0]) : false);
    },
    credentials: true,
  }));
  
  // Cookie解析（CSRF保护需要）
  app.use(cookieParser());
  
  // 请求体解析（限制大小防止 DoS；备份导入需更大一点）
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

  // 响应时间监控（在morgan之前）
  app.use(defaultResponseTimeLogger);

  // 请求日志（morgan）
  app.use(morgan("dev"));
  
  // 静态文件服务（用于上传的文件）
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // CSRF token生成端点（在CSRF保护之前）
  app.get("/api/auth/csrf-token", csrfTokenHandler);

  // CSRF token中间件：为所有响应自动设置CSRF token cookie
  app.use(csrfTokenMiddleware);

  // 健康检查端点 - 添加错误处理（不需要限流和CSRF保护）
  app.get("/api/health", (req, res) => {
    try {
      const mpAppId = process.env.MINIPROGRAM_APP_ID || process.env.WX_MINIPROGRAM_APPID || "";
      const mpSecret = process.env.MINIPROGRAM_APP_SECRET || process.env.WX_MINIPROGRAM_SECRET || "";
      res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        features: {
          miniprogramLogin: {
            configured: !!(mpAppId && mpSecret),
            appId: mpAppId || null,
          },
        },
      });
    } catch (err) {
      console.error('[HEALTH] Error:', err);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // API限流（应用到所有API路由；可通过 RATE_LIMIT_* 环境变量调整）
  if (process.env.RATE_LIMIT_DISABLED === 'true') {
    console.warn('[rate-limit] 已关闭 API 限流（RATE_LIMIT_DISABLED=true）');
  } else {
    console.log(
      `[rate-limit] API ${process.env.RATE_LIMIT_API_MAX || 100}/${Math.round((parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000) / 60000)}min, strict ${process.env.RATE_LIMIT_STRICT_MAX || 5}/窗口`,
    );
  }
  app.use("/api", apiRateLimiter);

  // CSRF保护（应用到所有修改数据的API）
  // 注意：GET请求和健康检查端点已排除
  app.use("/api", csrfProtection);

  // 敏感操作使用严格限流（登录、注册、小程序登录等）
  app.use("/api/auth/login", strictRateLimiter);
  app.use("/api/auth/register", strictRateLimiter);
  app.use("/api/auth/mp/login", strictRateLimiter);
  app.use("/api/auth/mp/complete-account", strictRateLimiter);
  app.use("/api/auth/sms/send", strictRateLimiter);
  app.use("/api/auth/sms/login", strictRateLimiter);
  app.use("/api/auth/password/forgot", strictRateLimiter);
  app.use("/api/auth/password/reset", strictRateLimiter);
  app.use("/api/auth/account/link-existing", strictRateLimiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/graph", graphRoutes);
  app.use("/api/questions", questionRoutes);
  app.use("/api/records", recordRoutes);
  app.use("/api/quizzes", quizRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/qg", qgFileRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/banks", bankRoutes);
  app.use("/api/v3/subjects", subjectRoutes);
  app.use("/api/v3/banks", v3BankRoutes);
  app.use("/api/v3/questions", v3QuestionRoutes);
  app.use("/api/v3/ai", v3AIRoutes);
  app.use("/api/v3/role-applications", v3RoleApplicationRoutes);
  app.use("/api/v3/question-templates", v3QuestionTemplateRoutes);
  app.use("/api/v3/graph-templates", v3GraphTemplateRoutes);
  app.use("/api/v3/templates", v3TemplatesRoutes);
  app.use("/api/v3/learning-goals", v3LearningGoalsRoutes);
  app.use("/api/v3/achievements", v3AchievementsRoutes);
  app.use("/api/v3/learning-path", v3LearningPathRoutes);
  app.use("/api/v3/recommendations", v3RecommendationsRoutes);
  app.use("/api/v3/groups", v3GroupsRoutes);
  app.use("/api/v3/wrong-questions", v3WrongQuestionsRoutes);
  app.use("/api/v3/review-plans", v3ReviewPlansRoutes);
  app.use("/api/v3/smart-review", v3SmartReviewRoutes);
  app.use("/api/v3/enhanced-analytics", v3EnhancedAnalyticsRoutes);
  app.use("/api/v3/adaptive", v3AdaptiveRoutes);
  app.use("/api/v3/favorites", v3FavoritesRoutes);
  app.use("/api/v3/notes", v3NotesRoutes);
  app.use("/api/v3/notes/upload", (await import("./routes/v3/notes-upload.js")).default);
  app.use("/api/v3/study-plans", v3StudyPlansRoutes);
  app.use("/api/v3/friends", v3FriendsRoutes);
  app.use("/api/v3/messages", v3MessagesRoutes);
  app.use("/api/v3/friend-challenges", v3FriendChallengesRoutes);
  app.use("/api/v3/learning-posts", v3LearningPostsRoutes);
  app.use("/api/v3/daily-challenge", v3DailyChallengeRoutes);
  app.use("/api/v3/coding", v3CodingRoutes);
  app.use("/api/v3/equipment", (await import("./routes/v3/equipment.js")).default);
  app.use("/api/v3/shop", (await import("./routes/v3/shop.js")).default);
  app.use("/api/v3/leaderboard", (await import("./routes/v3/leaderboard.js")).default);
  app.use("/api/v3/discussions", (await import("./routes/v3/discussions.js")).default);
  app.use("/api/v3/mentor", (await import("./routes/v3/mentor.js")).default);
  app.use("/api/v3/export", (await import("./routes/v3/export.js")).default);
  app.use("/api/v3/notifications", (await import("./routes/v3/notifications.js")).default);
  app.use("/api/v3/organizations", (await import("./routes/v3/organizations.js")).default);
  app.use("/api/v3/open-api", (await import("./routes/v3/openApiKeys.js")).default);
  app.use("/api/open/v1", (await import("./routes/open/v1.js")).default);
  app.use("/api/v3/search", (await import("./routes/v3/search.js")).default);
  app.use("/api/v3/cache", (await import("./routes/v3/cache.js")).default);

  // Swagger API文档（仅在开发环境或明确启用时）
  if (process.env.ENABLE_SWAGGER !== 'false') {
    try {
      const swaggerJsdoc = (await import('swagger-jsdoc')).default;
      const swaggerUi = (await import('swagger-ui-express')).default;
      const { swaggerOptions } = await import('./config/swagger.js');
      
      const swaggerSpec = swaggerJsdoc(swaggerOptions);
      
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'GraphTutor API文档',
      }));
      
      console.log('📚 Swagger文档已启用: http://localhost:5000/api-docs');
    } catch (err) {
      console.warn('⚠️  Swagger未安装，跳过API文档:', err.message);
    }
  }

  /**
   * 统一错误处理中间件
   * 必须放在所有路由之后、404 之前
   */
  app.use(handleError);

  // 生产环境：托管前端构建产物（Docker 单容器部署时使用）
  if (process.env.NODE_ENV === "production") {
    const clientDist = path.join(__dirname, "../../client/dist");
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
        res.sendFile(path.join(clientDist, "index.html"));
      });
    }
  }

  // 404 兜底（仅当未命中静态/SPA 时）
  app.use((req, res) => res.status(404).json({ error: "Not found" }));

  return app;
}

if (process.env.HTTPS_PROXY) {
  console.log(`[AI] Using proxy: ${process.env.HTTPS_PROXY}`);
  process.env.HTTP_PROXY = process.env.HTTPS_PROXY;
}
