const { skillOptions: SKILL_OPTIONS } = require('../../utils/content');

function buildSkillOptions(selected) {
  const selectedSet = new Set(selected || []);
  const defaultVal = SKILL_OPTIONS[0] && SKILL_OPTIONS[0].value;
  return SKILL_OPTIONS.map((item, index) => ({
    ...item,
    checked: selectedSet.size ? selectedSet.has(item.value) : index === 0
  }));
}

Component({
  properties: {
    submitting: { type: Boolean, value: false }
  },

  data: {
    form: {
      name: '',
      studentId: '',
      phone: '',
      note: ''
    },
    teamRole: '选手',
    skillOptions: buildSkillOptions([]),
    selectedSkills: SKILL_OPTIONS[0] ? [SKILL_OPTIONS[0].value] : [],
    agree: false
  },

  methods: {
    onInputChange(e) {
      const field = e.currentTarget.dataset.field;
      this.setData({
        [`form.${field}`]: e.detail.value
      });
    },

    onRoleChange(e) {
      this.setData({ teamRole: e.detail.value });
    },

    onSkillChange(e) {
      const values = e.detail.value;
      this.setData({
        selectedSkills: values,
        skillOptions: buildSkillOptions(values)
      });
    },

    onAgreeChange(e) {
      this.setData({ agree: e.detail.value.length > 0 });
    },

    handleSubmit() {
      const { form, teamRole, selectedSkills, agree } = this.data;

      if (!form.name || !form.studentId || !form.phone) {
        wx.showToast({ title: '请先填写必填信息', icon: 'none' });
        return;
      }

      if (!/^1\d{10}$/.test(form.phone)) {
        wx.showToast({ title: '手机号格式不正确', icon: 'none' });
        return;
      }

      if (!agree) {
        wx.showToast({ title: '请先勾选同意说明', icon: 'none' });
        return;
      }

      this.triggerEvent('submit', {
        name: form.name,
        studentId: form.studentId,
        phone: form.phone,
        note: form.note,
        teamRole,
        skills: selectedSkills
      });
    },

    resetForm() {
      const defaultVal = SKILL_OPTIONS[0] && SKILL_OPTIONS[0].value;
      this.setData({
        form: { name: '', studentId: '', phone: '', note: '' },
        teamRole: '选手',
        skillOptions: buildSkillOptions(defaultVal ? [defaultVal] : []),
        selectedSkills: defaultVal ? [defaultVal] : [],
        agree: false
      });
    }
  }
});
