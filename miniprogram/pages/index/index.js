/**
 * iconfont 资源目录（与 miniprogram/images/iconfont 下解压结构一致）
 * 九宫格统一用「蓝色数据可视化」系列（#1071E2 / #A8CFFF），避免与粉紫插画风混用。
 */
const ICON_DIR = '/images/iconfont/icon_cufz2qo4fir/icon_cufz2qo4fir';

Page({
  data: {
    menuItems: [
      { id: 'practice', name: '练习入口', desc: '知识图谱/错题巩固', icon: '', img: `${ICON_DIR}/guanxitu.svg`, type: 'switchTab', url: '/pages/practice/practice' },
      { id: 'plan', name: '学习计划', desc: '今日任务与提醒', icon: '', img: `${ICON_DIR}/rilizuobiaoxi.svg`, type: 'switchTab', url: '/pages/plan/plan' },
      { id: 'graph', name: '知识图谱练习', desc: '图结构路径规划', icon: '', img: `${ICON_DIR}/lujingtu.svg`, type: 'navigateTo', url: '/pages/graph/graph' },
      { id: 'wrong', name: '错题巩固', desc: '薄弱点专项练习', icon: '', img: `${ICON_DIR}/shuzi.svg`, type: 'navigateTo', url: '/pages/wrong/wrong' },
      { id: 'me', name: '个人中心', desc: '查看资料与设置', icon: '', img: `${ICON_DIR}/zhifangtu.svg`, type: 'switchTab', url: '/pages/user/user' },
      { id: 'login', name: '登录', desc: '头像昵称登录', icon: '', img: `${ICON_DIR}/wenben.svg`, type: 'navigateTo', url: '/pages/login/login' },
      { id: 'tip1', name: '学习小贴士', desc: '复习错题更高效', icon: '', img: `${ICON_DIR}/shijianrelitu.svg`, type: 'none', url: '' },
      { id: 'tip2', name: '番茄学习法', desc: '25/5 提升专注', icon: '', img: `${ICON_DIR}/zhouqizhou.svg`, type: 'none', url: '' },
      { id: 'tip3', name: '即将接后端', desc: '同步 Web 学习数据', icon: '', img: `${ICON_DIR}/relitu.svg`, type: 'none', url: '' },
    ],
  },

  nav(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.menuItems || []).find(x => x.id === id);
    if (!item || !item.url || item.type === 'none') return;

    if (item.type === 'switchTab') {
      wx.switchTab({ url: item.url });
      return;
    }
    wx.navigateTo({ url: item.url });
  },
});
