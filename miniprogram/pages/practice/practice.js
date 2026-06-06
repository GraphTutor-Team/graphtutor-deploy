const { PAGE_BANNER_SET } = require('../../utils/image-library.js');

Page({
  data: {
    bannerImage: PAGE_BANNER_SET.practice.imageUrl,
    bannerFallback: PAGE_BANNER_SET.practice.fallback,
    bannerTitle: PAGE_BANNER_SET.practice.title,
    bannerSubTitle: PAGE_BANNER_SET.practice.subTitle,
  },

  goGraph() {
    wx.navigateTo({ url: '/pages/graph/graph' });
  },

  goWrong() {
    wx.navigateTo({ url: '/pages/wrong/wrong' });
  },

  waitBackend() {
    wx.showToast({ title: '待接入后端后开放', icon: 'none' });
  },

  onBannerError() {
    this.setData({ bannerImage: this.data.bannerFallback });
  },
});
