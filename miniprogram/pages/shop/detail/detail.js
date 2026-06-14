const apiExt = require("../../../utils/api-ext.js");
const config = require("../../../utils/config.js");
const api = require("../../../utils/api.js");

Page({
  data: {
    product: null,
    points: null,
    loading: true,
    purchasing: false,
  },

  onLoad(options) {
    const id = options && options.id;
    if (!id) {
      this.setData({ loading: false });
      return;
    }
    this.loadProduct(id);
  },

  loadProduct(id) {
    const app = getApp();
    const cached = app && app.globalData && app.globalData.products;
    const fromCache = (cached || []).find((p) => p.id === id);
    if (fromCache) {
      this.setData({ product: fromCache, loading: false });
      this.loadPoints();
      return;
    }
    api.ensureValidAccessToken()
      .then(() => apiExt.getShopItems())
      .then((items) => {
        const raw = Array.isArray(items) ? items : [];
        const item = raw.find((p) => p.id === id);
        const product = item ? {
          id: item.id,
          name: item.name,
          category: "成就道具",
          cost: item.cost,
          desc: item.description || "",
          icon: item.icon || "🎁",
        } : null;
        this.setData({ product, loading: false });
        this.loadPoints();
      })
      .catch(() => this.setData({ loading: false }));
  },

  loadPoints() {
    const token = wx.getStorageSync("token");
    if (!token || config.USE_VIRTUAL_LOGIN || api.isVirtualToken()) return;
    apiExt.getShopInventory().then((inv) => {
      this.setData({ points: inv && inv.points != null ? inv.points : null });
    }).catch(() => {});
  },

  purchase() {
    const { product, purchasing } = this.data;
    if (!product || purchasing) return;
    this.setData({ purchasing: true });
    apiExt.purchaseShopItem(product.id, 1)
      .then(() => {
        wx.showToast({ title: "兑换成功", icon: "success" });
        this.loadPoints();
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || "兑换失败", icon: "none" });
      })
      .finally(() => this.setData({ purchasing: false }));
  },
});
