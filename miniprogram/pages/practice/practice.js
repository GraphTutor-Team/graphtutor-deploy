Page({
  data: {},

  goGraph() {
    wx.navigateTo({ url: '/pages/graph/graph' });
  },

  goWrong() {
    wx.navigateTo({ url: '/pages/wrong/wrong' });
  },
});

