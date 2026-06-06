const STORAGE_KEY = "gt_contacts_v1";
const { COMMUNITY_IMAGE_SET } = require("../../utils/image-library.js");

function getDefaultContacts() {
  const now = Date.now();
  return [
    { id: "c1", name: "小明", tel: "13800000001", remark: "图谱伙伴", star: true, createdAt: now - 86400000 * 2 },
    { id: "c2", name: "小红", tel: "13800000002", remark: "刷题好友", star: false, createdAt: now - 86400000 },
    { id: "c3", name: "Alice", tel: "13800000003", remark: "一起练最短路径", star: false, createdAt: now - 86400000 * 5 },
  ];
}

function loadContacts() {
  const stored = wx.getStorageSync(STORAGE_KEY);
  if (stored && Array.isArray(stored.contacts)) {
    return stored.contacts;
  }
  return getDefaultContacts();
}

function saveContacts(contacts) {
  wx.setStorageSync(STORAGE_KEY, { contacts });
}

function firstCharOfName(name) {
  const s = String(name || "").trim();
  return s ? s.charAt(0) : "用";
}

function normalizeTel(tel) {
  // 只保留数字与可能的前缀 +，避免拨号失败
  const s = String(tel || "");
  return s.replace(/[^\d+]/g, "").trim();
}

function getMoreDemoContacts() {
  const now = Date.now();
  return [
    { id: "c_demo_1", name: "张三", tel: "13800000004", remark: "图谱探索", star: false, createdAt: now - 86400000 * 3 },
    { id: "c_demo_2", name: "李四", tel: "13800000005", remark: "路径练习", star: false, createdAt: now - 86400000 * 6 },
    { id: "c_demo_3", name: "王五", tel: "13800000006", remark: "错题巩固", star: true, createdAt: now - 86400000 * 1 },
    { id: "c_demo_4", name: "赵六", tel: "13800000007", remark: "复习冲刺", star: false, createdAt: now - 86400000 * 8 },
  ];
}

function getDemoPosts() {
  const now = Date.now();
  const items = [
    { id: "p1", author: "小明", title: "最短路径怎么入手？", content: "我用 BFS 先找最接近的层，再转 Dijkstra 做权重修正。你们呢？", createdAt: now - 86400000 * 1 },
    { id: "p2", author: "小红", title: "知识图谱练习打卡", content: "今天做了 2 组遍历题，感觉对图的层次把握更清晰了。", createdAt: now - 86400000 * 2 },
    { id: "p3", author: "Alice", title: "错题巩固心得", content: "把错题按节点/边分类后，每天只复习一个主题，效率明显提升。", createdAt: now - 86400000 * 3 },
  ];
  return items.map((p) => ({
    ...p,
    authorFirstChar: firstCharOfName(p.author),
    timeText: formatRelativeTime(p.createdAt),
    cover: COMMUNITY_IMAGE_SET.postCovers[p.id] || "",
    coverFallback: COMMUNITY_IMAGE_SET.fallback,
    currentCover: COMMUNITY_IMAGE_SET.postCovers[p.id] || COMMUNITY_IMAGE_SET.fallback,
  }));
}

function formatRelativeTime(ts) {
  const diff = Date.now() - Number(ts || 0);
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "今天";
  const days = Math.floor(diff / day);
  if (days <= 7) return `${days} 天前`;
  const d = new Date(ts);
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  return `${m}月${dd}日`;
}

function mergeContactsByTel(oldContacts, demoContacts) {
  const existsByTel = new Set((oldContacts || []).map((c) => normalizeTel(c && c.tel)).filter(Boolean));
  const merged = [...(oldContacts || [])];
  for (const c of demoContacts || []) {
    const tel = normalizeTel(c && c.tel);
    if (!tel) continue;
    if (existsByTel.has(tel)) continue;
    existsByTel.add(tel);
    merged.unshift({ ...c, tel });
  }
  return merged;
}

Page({
  data: {
    query: "",
    contacts: [],
    filteredContacts: [],
    posts: getDemoPosts(),
  },

  onLoad() {
    this.reload();
  },

  onShow() {
    // 用户从新增页返回后，刷新一次列表
    // 也避免出现“刚新增未显示”的体验问题
    this.reload();
  },

  reload() {
    const contacts = loadContacts();
    const filteredContacts = this.filterContacts(contacts, this.data.query);
    this.setData({ contacts, filteredContacts });
  },

  filterContacts(contacts, query) {
    const q = (query || "").trim().toLowerCase();
    const base = (contacts || []).filter((c) => {
      const name = (c.name || "").toLowerCase();
      const remark = (c.remark || "").toLowerCase();
      const tel = (c.tel || "").toLowerCase();
      return !q || name.includes(q) || remark.includes(q) || tel.includes(q);
    });

    // 星标优先展示
    base.sort((a, b) => {
      const as = a.star ? 1 : 0;
      const bs = b.star ? 1 : 0;
      if (as !== bs) return bs - as;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    // 预计算首字母，避免 WXML 表达式解析器在复杂表达式下报错
    return base.map((c) => ({ ...c, firstChar: firstCharOfName(c.name) }));
  },

  onQuery(e) {
    const query = (e.detail && e.detail.value) || "";
    const filteredContacts = this.filterContacts(this.data.contacts, query);
    this.setData({ query, filteredContacts });
  },

  goAdd() {
    wx.navigateTo({ url: "/pages/contacts/add/add" });
  },

  goDialpad() {
    wx.navigateTo({ url: "/pages/dialpad/dialpad" });
  },

  toggleStar(e) {
    const id = e.currentTarget.dataset.id;
    const contacts = (this.data.contacts || []).map((c) => (c.id === id ? { ...c, star: !c.star } : c));
    saveContacts(contacts);
    const filteredContacts = this.filterContacts(contacts, this.data.query);
    this.setData({ contacts, filteredContacts });
  },

  deleteContact(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "删除联系人",
      content: "确认要删除该联系人吗？",
      confirmText: "删除",
      confirmColor: "#c62828",
      success: (res) => {
        if (!res.confirm) return;
        const contacts = (this.data.contacts || []).filter((c) => c.id !== id);
        saveContacts(contacts);
        const filteredContacts = this.filterContacts(contacts, this.data.query);
        this.setData({ contacts, filteredContacts });
        wx.showToast({ title: "已删除", icon: "none" });
      },
    });
  },

  callContact(e) {
    const id = e.currentTarget.dataset.id;
    const contacts = this.data.contacts || [];
    const item = (contacts || []).find((c) => c.id === id);
    const tel = normalizeTel(item && item.tel);

    if (!tel) {
      wx.showToast({ title: "该联系人未填写手机号", icon: "none" });
      return;
    }

    // 进入“数字拨号”页面，允许用户对号码进行编辑后再拨打
    wx.navigateTo({
      url: `/pages/dialpad/dialpad?tel=${encodeURIComponent(tel)}`,
    });
  },

  importDemoMore() {
    const oldContacts = loadContacts();
    const demo = getMoreDemoContacts();
    const merged = mergeContactsByTel(oldContacts, demo);
    saveContacts(merged);
    wx.showToast({ title: "已补充示例联系人", icon: "success" });
    this.reload();
  },

  onPostImageError(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const posts = (this.data.posts || []).map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        currentCover: p.coverFallback || p.currentCover,
      };
    });
    this.setData({ posts });
  },
});
