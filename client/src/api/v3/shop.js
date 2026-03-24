/**
 * GraphTutor V3.0 - 成就商城 API
 */

import api from '../api.js';

export async function getShopItems() {
  const res = await api.get('/v3/shop/items');
  return res.data;
}

export async function getInventory() {
  const res = await api.get('/v3/shop/inventory');
  return res.data;
}

export async function purchaseItem(itemId, quantity = 1) {
  const res = await api.post('/v3/shop/purchase', { itemId, quantity });
  return res.data;
}

export async function useItem(itemId, wrongQuestionId = null) {
  const res = await api.post('/v3/shop/use', { itemId, wrongQuestionId });
  return res.data;
}
