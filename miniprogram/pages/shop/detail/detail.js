const { getProducts } = require("../../../utils/shop-data.js");

Page({
  data: {
    product: null,
  },

  onLoad(options) {
    const id = options && options.id;
    const app = getApp();
    const all =
      app && app.globalData && Array.isArray(app.globalData.products) && app.globalData.products.length
        ? app.globalData.products
        : getProducts();
    const product = all.find((p) => p.id === id) || null;
    this.setData({
      product: product
        ? {
            ...product,
            currentCover: product.cover || product.coverFallback || "",
          }
        : null,
    });
  },

  onCoverError() {
    const product = this.data.product;
    if (!product) return;
    this.setData({
      product: {
        ...product,
        currentCover: product.coverFallback || product.currentCover,
      },
    });
  },
});
