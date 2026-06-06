function normalizeTel(tel) {
  const s = String(tel || '');
  // 只保留数字与可能的前缀 +，避免拼接/复制时带入其它字符
  return s.replace(/[^\d+]/g, '').trim();
}

Page({
  data: {
    tel: '',
  },

  onLoad(options) {
    const telRaw = (options && options.tel) || '';
    const tel = normalizeTel(decodeURIComponent(telRaw));
    this.setData({ tel });
  },

  onDigit(e) {
    const num = e.currentTarget.dataset.num;
    const tel = this.data.tel + String(num || '');
    this.setData({ tel });
  },

  onAction(e) {
    const action = e.currentTarget.dataset.action;
    const tel = this.data.tel || '';

    if (action === 'del') {
      if (!tel) return;
      this.setData({ tel: tel.slice(0, tel.length - 1) });
      return;
    }

    if (action === 'clear') {
      this.setData({ tel: '' });
    }
  },

  copyTel() {
    const tel = normalizeTel(this.data.tel);
    if (!tel) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }

    wx.setClipboardData({
      data: tel,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '复制失败', icon: 'none' });
      },
    });
  },

  callTel() {
    const tel = normalizeTel(this.data.tel);
    if (!tel) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }

    wx.makePhoneCall({
      phoneNumber: tel,
      fail: () => {
        wx.showToast({ title: '拨号失败', icon: 'none' });
      },
    });
  },
});

