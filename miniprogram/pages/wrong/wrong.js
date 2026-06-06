const { PAGE_BANNER_SET } = require('../../utils/image-library.js');

Page({
  data: {
    bannerImage: PAGE_BANNER_SET.wrong.imageUrl,
    bannerFallback: PAGE_BANNER_SET.wrong.fallback,
    bannerTitle: PAGE_BANNER_SET.wrong.title,
    bannerSubTitle: PAGE_BANNER_SET.wrong.subTitle,
  },

  waitBackend() {
    wx.showToast({ title: '待接入错题本接口', icon: 'none' });
  },

  onBannerError() {
    this.setData({ bannerImage: this.data.bannerFallback });
  },
});
