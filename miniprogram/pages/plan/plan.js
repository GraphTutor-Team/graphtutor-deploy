const { PAGE_BANNER_SET } = require('../../utils/image-library.js');

Page({
  data: {
    bannerImage: PAGE_BANNER_SET.plan.imageUrl,
    bannerFallback: PAGE_BANNER_SET.plan.fallback,
    bannerTitle: PAGE_BANNER_SET.plan.title,
    bannerSubTitle: PAGE_BANNER_SET.plan.subTitle,
  },

  waitBackend() {
    wx.showToast({ title: '待接入后端计划接口', icon: 'none' });
  },

  onBannerError() {
    this.setData({ bannerImage: this.data.bannerFallback });
  },
});
