const apiExt = require("../../utils/api-ext.js");
const authHelper = require("../../utils/auth-helper.js");
const config = require("../../utils/config.js");
const api = require("../../utils/api.js");
const { SHOP_BANNERS } = require("../../utils/shop-data.js");

function hydrateProducts(list) {
  return (list || []).map((p) => ({
    ...p,
    currentCover: p.icon || "",
  }));
}

function hydrateBanners() {
  return (SHOP_BANNERS || []).map((b) => ({
    ...b,
    currentImage: b.imageUrl || b.fallback || "",
  }));
}

Page({
  data: {
    products: [],
    banners: [],
    keyword: "",
    points: null,
    loading: true,
    loadError: "",
    isLoggedIn: false,
  },

  onLoad() {
    this.setData({ banners: hydrateBanners() });
  },

  onShow() {
    const token = wx.getStorageSync("token");
    const loggedIn = !!(token && !config.USE_VIRTUAL_LOGIN && !api.isVirtualToken());
    this.setData({ isLoggedIn: loggedIn });
    if (!loggedIn) {
      this.setData({ loading: false, products: [], loadError: "" });
      return;
    }
    this.loadProducts();
  },

  loadProducts() {
    this.setData({ loading: true, loadError: "" });
    Promise.all([
      apiExt.getShopItems(),
      apiExt.getShopInventory(),
    ]).then(([items, inv]) => {
      const raw = Array.isArray(items) ? items : [];
      const list = raw.map((item) => ({
        id: item.id,
        name: item.name,
        category: "成就道具",
        cost: item.cost,
        desc: item.description || "",
        icon: item.icon || "🎁",
      }));
      const app = getApp();
      if (app) app.globalData.products = list;
      this.setData({
        loading: false,
        products: hydrateProducts(list),
        points: inv && inv.points != null ? inv.points : null,
      });
    }).catch((err) => {
      this.setData({
        loading: false,
        loadError: (err && err.message) || "加载失败",
        products: [],
      });
    });
  },

  onSearch(e) {
    const keyword = ((e.detail && e.detail.value) || "").trim().toLowerCase();
    const app = getApp();
    const all = (app && app.globalData && app.globalData.products) || [];
    const products = !keyword
      ? all
      : all.filter((p) => p.name.toLowerCase().includes(keyword));
    this.setData({ keyword, products: hydrateProducts(products) });
  },

  onBannerImageError(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const next = this.data.banners.map((b) => {
      if (b.id !== id) return b;
      return { ...b, currentImage: b.fallback || b.currentImage };
    });
    this.setData({ banners: next });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/shop/detail/detail?id=${id}` });
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/login" });
  },
});
