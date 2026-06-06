const app = getApp();
const content = require('../../utils/content');

const {
  brand, event, sections, photoList, historyList, videoLabels, highlights, learningPath
} = content;

Page({
  data: {
    activeTab: 'invite',
    serverBase: '',
    serverOnline: false,
    registerCount: 0,
    submitting: false,
    brandName: brand.name,
    brandVersion: brand.version,
    brandTagline: brand.tagline,
    brandDesc: brand.description,
    inviteTitle: event.title,
    subTitle: event.subTitle,
    inviteSlogan: event.slogan,
    inviteDesc: event.inviteDesc,
    organizer: event.organizer,
    inviteDate: event.date,
    invitePlace: event.place,
    registerDeadline: event.deadline,
    coverImage: event.coverImage,
    highlights,
    learningPath,
    sections,
    mapLat: 23.1291,
    mapLng: 113.2644,
    mapName: event.place,
    mapAddress: '',
    mapMarkers: [],
    historySwiperIndex: 0,
    photoList,
    historyList,
    videoList: [],
    currentVideoIndex: 0,
    promoVideo: '',
    showVideo: false,
    historyMode: 'gallery',
    videoError: false
  },

  onLoad() {
    const { serverBase, videoUrls, map } = app.globalData;
    const videoList = videoLabels.map((label, id) => ({
      id,
      label,
      url: videoUrls[id]
    }));
    this.setData({
      serverBase,
      videoList,
      promoVideo: videoUrls[0],
      mapLat: map.latitude,
      mapLng: map.longitude,
      mapName: map.name,
      mapAddress: map.address || '',
      mapMarkers: [{
        id: 1,
        latitude: map.latitude,
        longitude: map.longitude,
        title: map.name,
        width: 24,
        height: 34
      }]
    });
    this.checkServerHealth();
  },

  onShow() {
    this.checkServerHealth();
  },

  onPullDownRefresh() {
    this.checkServerHealth(true);
  },

  onShareAppMessage() {
    return {
      title: `${this.data.inviteTitle} · ${this.data.subTitle}`,
      path: '/pages/index/index'
    };
  },

  checkServerHealth(stopRefresh) {
    wx.request({
      url: app.globalData.healthApi,
      method: 'GET',
      timeout: 5000,
      header: { 'X-Client': 'miniprogram' },
      success: (res) => {
        const online = !!(res.data && res.data.ok);
        this.setData({ serverOnline: online });
        if (online) {
          this.fetchRegisterCount();
        } else {
          this.setData({ registerCount: 0 });
        }
      },
      fail: () => {
        this.setData({ serverOnline: false, registerCount: 0 });
      },
      complete: () => {
        if (stopRefresh) wx.stopPullDownRefresh();
      }
    });
  },

  fetchRegisterCount() {
    wx.request({
      url: app.globalData.registerApi,
      method: 'GET',
      timeout: 5000,
      header: { 'X-Client': 'miniprogram' },
      success: (res) => {
        if (res.data && res.data.ok) {
          this.setData({ registerCount: res.data.count || 0 });
        }
      }
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  onHistorySwiperChange(e) {
    this.setData({ historySwiperIndex: e.detail.current });
  },

  previewPhoto(e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = e.currentTarget.dataset.list || 'photo';
    const source = list === 'history' ? this.data.historyList : this.data.photoList;
    const urls = source.map((item) => item.image);
    if (!urls.length) return;
    wx.previewImage({
      current: urls[index] || urls[0],
      urls
    });
  },

  openEventLocation() {
    wx.openLocation({
      latitude: this.data.mapLat,
      longitude: this.data.mapLng,
      name: this.data.mapName,
      address: this.data.mapAddress || this.data.mapName,
      scale: 16
    });
  },

  loadVideo() {
    this.setData({ showVideo: true, videoError: false });
  },

  changeVideo(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const target = this.data.videoList[idx];
    if (!target) return;
    this.setData({
      currentVideoIndex: idx,
      promoVideo: target.url,
      showVideo: false,
      videoError: false
    });
  },

  onVideoError() {
    this.setData({ videoError: true, showVideo: false });
    wx.showToast({
      title: '视频加载失败，请检查服务器',
      icon: 'none'
    });
  },

  switchHistoryMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      historyMode: mode,
      showVideo: mode === 'video' ? this.data.showVideo : false
    });
  },

  onFormSubmit(e) {
    const payload = e.detail;
    this.setData({ submitting: true });

    wx.request({
      url: app.globalData.registerApi,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        'X-Client': 'miniprogram'
      },
      timeout: 8000,
      data: payload,
      success: (res) => {
        if (res.data && res.data.ok) {
          wx.showModal({
            title: '提交成功',
            content: `姓名：${payload.name}\n学号：${payload.studentId}\n手机号：${payload.phone}\n报名身份：${payload.teamRole}\n技能方向：${(payload.skills || []).join('、') || '未选择'}`,
            showCancel: false
          });
          const form = this.selectComponent('#signupForm');
          if (form) form.resetForm();
          this.fetchRegisterCount();
          return;
        }
        wx.showToast({
          title: (res.data && res.data.message) || '提交失败',
          icon: 'none'
        });
      },
      fail: () => {
        wx.showModal({
          title: '服务器未连接',
          content: '请先启动 invite-homework-server，并在 utils/config.js 配置正确地址。开发工具需勾选“不校验合法域名”。',
          showCancel: false
        });
      },
      complete: () => {
        this.setData({ submitting: false });
      }
    });
  }
});
