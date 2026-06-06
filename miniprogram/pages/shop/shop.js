const { CART_STORAGE_KEY, SHOP_BANNERS, getProducts } = require("../../utils/shop-data.js");

function hydrateProducts(list) {
  return (list || []).map((p) => ({
    ...p,
    currentCover: p.cover || p.coverFallback || "",
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
  },

  onLoad() {
    const app = getApp();
    const products =
      app && app.globalData && Array.isArray(app.globalData.products) && app.globalData.products.length
        ? app.globalData.products
        : getProducts();
    this.setData({
      products: hydrateProducts(products),
      banners: hydrateBanners(),
    });
  },

  onSearch(e) {
    const keyword = ((e.detail && e.detail.value) || "").trim().toLowerCase();
    const app = getApp();
    const all =
      app && app.globalData && Array.isArray(app.globalData.products) && app.globalData.products.length
        ? app.globalData.products
        : getProducts();
    const products = !keyword
      ? all
      : all.filter((p) => p.name.toLowerCase().includes(keyword) || p.category.toLowerCase().includes(keyword));
    this.setData({ keyword, products: hydrateProducts(products) });
  },

  onProductImageError(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const next = this.data.products.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        currentCover: p.coverFallback || p.currentCover,
      };
    });
    this.setData({ products: next });
  },

  onBannerImageError(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const next = this.data.banners.map((b) => {
      if (b.id !== id) return b;
      return {
        ...b,
        currentImage: b.fallback || b.currentImage,
      };
    });
    this.setData({ banners: next });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/shop/detail/detail?id=${id}` });
  },

  addToCart(e) {
    const id = e.currentTarget.dataset.id;
    const product = getProducts().find((p) => p.id === id);
    if (!product) return;

    const stored = wx.getStorageSync(CART_STORAGE_KEY);
    const cart = stored && Array.isArray(stored.items) ? stored.items : [];
    const idx = cart.findIndex((x) => x.id === id);
    if (idx >= 0) {
      cart[idx].count += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        cover: product.cover,
        count: 1,
      });
    }
    wx.setStorageSync(CART_STORAGE_KEY, { items: cart });
    wx.showToast({ title: "已加入购物车", icon: "success" });
  },

  goCart() {
    wx.navigateTo({ url: "/pages/shop/cart/cart" });
  },
});
