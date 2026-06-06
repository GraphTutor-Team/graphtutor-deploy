const { PAGE_BANNER_SET } = require('../../utils/image-library.js');

Page({
  data: {
    bannerImage: PAGE_BANNER_SET.graph.imageUrl,
    bannerFallback: PAGE_BANNER_SET.graph.fallback,
    bannerTitle: PAGE_BANNER_SET.graph.title,
    bannerSubTitle: PAGE_BANNER_SET.graph.subTitle,
  },

  waitBackend() {
    wx.showToast({ title: '待接入知识图谱接口', icon: 'none' });
  },

  onBannerError() {
    this.setData({ bannerImage: this.data.bannerFallback });
  },
});
