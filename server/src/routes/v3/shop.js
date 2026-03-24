/**
 * GraphTutor V3.0 - 成就商城 API
 * 路径：/api/v3/shop
 * 积分兑换虚拟道具，使用道具（免错题卡、双倍经验卡等）
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import User from '../../models/User.js';
import WrongQuestion from '../../models/WrongQuestion.js';

const router = express.Router();

/** 商品定义：id, name, description, icon, cost, consumable */
const SHOP_ITEMS = [
  {
    id: 'no_wrong_card',
    name: '免错题卡',
    description: '使用后可移除一道错题本中的题目',
    icon: '🗑️',
    cost: 50,
    consumable: true,
  },
  {
    id: 'double_exp_card',
    name: '双倍经验卡',
    description: '使用后 24 小时内答题得分双倍（排行榜/联赛/战队赛）',
    icon: '⚡',
    cost: 80,
    consumable: true,
  },
  {
    id: 'hint_card',
    name: '提示卡',
    description: '练习时可获得一次答案解析提示（预留）',
    icon: '💡',
    cost: 30,
    consumable: true,
  },
];

/**
 * GET /api/v3/shop/items
 * 获取商城商品列表
 */
router.get('/items', requireAuth, (req, res) => {
  res.json({ success: true, data: SHOP_ITEMS });
});

/**
 * GET /api/v3/shop/inventory
 * 获取当前用户背包
 */
router.get('/inventory', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('inventory points').lean();
    const inventory = (user?.inventory || []).filter((i) => i.count > 0);
    const itemsWithMeta = inventory.map((inv) => {
      const meta = SHOP_ITEMS.find((s) => s.id === inv.itemId);
      return {
        itemId: inv.itemId,
        count: inv.count,
        name: meta?.name,
        icon: meta?.icon,
      };
    });
    res.json({
      success: true,
      data: {
        items: itemsWithMeta,
        points: user?.points ?? 100,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/shop/inventory error:', err);
    res.status(500).json({ success: false, message: '获取背包失败' });
  }
});

/**
 * POST /api/v3/shop/purchase
 * 兑换商品 body: { itemId, quantity }
 */
router.post('/purchase', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.body?.itemId;
    const quantity = Math.max(1, Math.min(10, parseInt(req.body?.quantity, 10) || 1));
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) {
      return res.status(400).json({ success: false, message: '商品不存在' });
    }
    const totalCost = item.cost * quantity;
    const user = await User.findById(userId);
    const points = user?.points ?? 100;
    if (points < totalCost) {
      return res.status(400).json({
        success: false,
        message: `积分不足，需要 ${totalCost}，当前 ${points}`,
      });
    }

    const inventory = user?.inventory || [];
    const idx = inventory.findIndex((i) => i.itemId === itemId);
    if (idx >= 0) {
      inventory[idx].count += quantity;
    } else {
      inventory.push({ itemId, count: quantity });
    }
    await User.findByIdAndUpdate(userId, {
      $set: {
        points: Math.max(0, points - totalCost),
        inventory,
      },
    });

    res.json({
      success: true,
      data: { itemId, quantity, remainingPoints: points - totalCost },
      message: `成功兑换 ${item.name} x${quantity}`,
    });
  } catch (err) {
    console.error('POST /api/v3/shop/purchase error:', err);
    res.status(500).json({ success: false, message: '兑换失败' });
  }
});

/**
 * POST /api/v3/shop/use
 * 使用道具 body: { itemId, wrongQuestionId? }（免错题卡可传错题ID，不传则移除最早一条）
 */
router.post('/use', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, wrongQuestionId } = req.body || {};
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item || !item.consumable) {
      return res.status(400).json({ success: false, message: '不可使用的商品' });
    }

    const user = await User.findById(userId);
    const inventory = user?.inventory || [];
    const idx = inventory.findIndex((i) => i.itemId === itemId);
    if (idx < 0 || inventory[idx].count < 1) {
      return res.status(400).json({ success: false, message: '背包中无该道具' });
    }

    if (itemId === 'no_wrong_card') {
      let wq;
      if (wrongQuestionId) {
        wq = await WrongQuestion.findOne({ _id: wrongQuestionId, userId });
      } else {
        wq = await WrongQuestion.findOne({ userId }).sort({ createdAt: 1 }).lean();
      }
      if (!wq) {
        return res.status(400).json({ success: false, message: '暂无错题可移除' });
      }
      await WrongQuestion.deleteOne({ _id: wq._id, userId });
    } else if (itemId === 'double_exp_card') {
      const until = new Date();
      until.setHours(until.getHours() + 24);
      await User.findByIdAndUpdate(userId, { $set: { doubleExpiresAt: until } });
    } else if (itemId === 'hint_card') {
      // 预留：练习时使用
    }

    inventory[idx].count -= 1;
    if (inventory[idx].count <= 0) inventory.splice(idx, 1);
    await User.findByIdAndUpdate(userId, { $set: { inventory } });

    res.json({
      success: true,
      data: { itemId },
      message: itemId === 'no_wrong_card' ? '已移除一道错题' : itemId === 'double_exp_card' ? '双倍经验已生效，24 小时内有效' : '已使用',
    });
  } catch (err) {
    console.error('POST /api/v3/shop/use error:', err);
    res.status(500).json({ success: false, message: '使用失败' });
  }
});

export default router;
