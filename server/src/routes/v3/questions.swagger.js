/**
 * @swagger
 * components:
 *   schemas:
 *     Question:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         qid:
 *           type: string
 *           description: 题目业务ID
 *         content:
 *           type: string
 *           description: 题干
 *         type:
 *           type: string
 *           enum: [single, multiple, truefalse, fill, short]
 *         options:
 *           type: array
 *           items:
 *             type: string
 *         answer:
 *           type: string
 *         difficulty:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         subjectCode:
 *           type: string
 *         bankId:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/v3/questions:
 *   get:
 *     tags: [题目]
 *     summary: 获取题目列表
 *     description: 支持多种筛选条件的题目查询
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectCode
 *         schema:
 *           type: string
 *         description: 学科代码
 *       - in: query
 *         name: bankId
 *         schema:
 *           type: string
 *         description: 题库ID
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: 难度
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 关键词搜索
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Question'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *   post:
 *     tags: [题目]
 *     summary: 创建题目
 *     description: 创建新题目（需要出题负责人或管理员权限）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - type
 *               - answer
 *               - subjectCode
 *             properties:
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [single, multiple, truefalse, fill, short]
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               answer:
 *                 type: string
 *               difficulty:
 *                 type: integer
 *               subjectCode:
 *                 type: string
 *               bankId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 请求参数错误
 *       403:
 *         description: 权限不足
 */

