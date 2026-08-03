/**
 * GraphTutor V3.0 - 成就商城
 * 积分兑换虚拟道具（免错题卡、双倍经验卡等），背包与使用
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import LoginPrompt from '../components/common/LoginPrompt';
import { toast } from '../utils/toast';
import { getShopItems, getInventory, purchaseItem, useItem } from '../api/v3/shop';

export default function Shop() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState({ items: [], points: 0 });
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [using, setUsing] = useState(null);

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  const load = async () => {
    try {
      setLoading(true);
      const [itemsRes, invRes] = await Promise.all([
        getShopItems(),
        getInventory(),
      ]);
      setItems(itemsRes?.data || []);
      setInventory(invRes?.data || { items: [], points: 0 });
    } catch (err) {
      console.error('加载商城失败:', err);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (itemId, quantity = 1) => {
    try {
      setPurchasing(itemId);
      await purchaseItem(itemId, quantity);
      toast.success(`兑换成功`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || '兑换失败');
    } finally {
      setPurchasing(null);
    }
  };

  const handleUse = async (itemId) => {
    try {
      setUsing(itemId);
      const res = await useItem(itemId);
      toast.success(res?.message || '已使用');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || '使用失败');
    } finally {
      setUsing(null);
    }
  };

  if (!user) {
    return (
      <LoginPrompt
        title="登录后使用商城"
        description="登录后可用积分兑换道具。也可先看使用教程，或去做题赚积分。"
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="成就商城"
        subtitle="用积分兑换道具，助力学习"
      />

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
        <span className="font-medium">我的积分</span>
        <span className="text-2xl font-bold text-amber-700">{inventory.points}</span>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">可兑换商品</h2>
        {loading ? (
          <div className="text-center py-8 text-slate-500">加载中...</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white border rounded-lg p-4 flex flex-col"
              >
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-slate-600 mt-1 flex-1">{item.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-amber-600 font-medium">{item.cost} 积分</span>
                  <button
                    onClick={() => handlePurchase(item.id, 1)}
                    disabled={inventory.points < item.cost || purchasing === item.id}
                    className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    {purchasing === item.id ? '兑换中...' : '兑换'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">我的背包</h2>
        {inventory.items?.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center text-slate-500">
            暂无道具，快去兑换吧
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inventory.items?.map((inv) => (
              <div
                key={inv.itemId}
                className="bg-white border rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{inv.icon}</span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{inv.name}</div>
                    <div className="text-sm text-slate-600">x {inv.count}</div>
                  </div>
                </div>
                {inv.count > 0 && ['no_wrong_card', 'double_exp_card', 'hint_card'].includes(inv.itemId) && (
                  <button
                    type="button"
                    onClick={() => handleUse(inv.itemId)}
                    disabled={using === inv.itemId}
                    className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {using === inv.itemId ? '使用中...' : '使用'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
