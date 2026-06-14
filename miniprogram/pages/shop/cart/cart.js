const { CART_STORAGE_KEY } = require("../../../utils/shop-data.js");

function loadCart() {
  const stored = wx.getStorageSync(CART_STORAGE_KEY);
  const items = stored && Array.isArray(stored.items) ? stored.items : [];
  return items;
}

function saveCart(items) {
  wx.setStorageSync(CART_STORAGE_KEY, { items });
}

Page({
  data: {
    items: [],
    total: 0,
  },

  onShow() {
    this.reload();
  },

  reload() {
    const items = loadCart();
    const total = items.reduce((s, x) => s + x.price * x.count, 0).toFixed(2);
    this.setData({ items, total });
  },

  plus(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.items.map((x) => (x.id === id ? { ...x, count: x.count + 1 } : x));
    saveCart(items);
    this.reload();
  },

  minus(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.items
      .map((x) => (x.id === id ? { ...x, count: x.count - 1 } : x))
      .filter((x) => x.count > 0);
    saveCart(items);
    this.reload();
  },

  clearAll() {
    saveCart([]);
    this.reload();
  },

  checkout() {
    wx.showToast({ title: "结算功能即将上线", icon: "none" });
  },
});
