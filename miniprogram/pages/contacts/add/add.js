const STORAGE_KEY = "gt_contacts_v1";

function loadContacts() {
  const stored = wx.getStorageSync(STORAGE_KEY);
  if (stored && Array.isArray(stored.contacts)) return stored.contacts;
  return [];
}

function saveContacts(contacts) {
  wx.setStorageSync(STORAGE_KEY, { contacts });
}

Page({
  data: {
    name: "",
    remark: "",
    tel: "",
    loading: false,
  },

  onNameInput(e) {
    const name = (e.detail && e.detail.value) || "";
    this.setData({ name });
  },

  onRemarkInput(e) {
    const remark = (e.detail && e.detail.value) || "";
    this.setData({ remark });
  },

  onTelInput(e) {
    const tel = (e.detail && e.detail.value) || "";
    this.setData({ tel });
  },

  goBack() {
    wx.navigateBack();
  },

  onSave() {
    const name = (this.data.name || "").trim();
    const remark = (this.data.remark || "").trim();
    const tel = String(this.data.tel || '').trim();
    const telClean = tel.replace(/[^\d+]/g, '').trim();

    if (!name) {
      wx.showToast({ title: "请填写姓名", icon: "none" });
      return;
    }

    const contacts = loadContacts();
    const id = "c_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

    contacts.unshift({
      id,
      name,
      remark,
      tel: telClean,
      star: false,
      createdAt: Date.now(),
    });

    saveContacts(contacts);

    wx.showToast({ title: "已添加", icon: "success" });
    setTimeout(() => {
      wx.switchTab({ url: "/pages/contacts/contacts" });
    }, 300);
  },
});
