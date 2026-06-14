const DEFAULT_IMAGE =
  'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1400';

Component({
  properties: {
    badge: {
      type: String,
      value: 'GraphTutor',
    },
    title: {
      type: String,
      value: '图结构 · 智能练习',
    },
    desc: {
      type: String,
      value: '知识图谱、练习与计划，一站入口',
    },
    imageUrl: {
      type: String,
      value: DEFAULT_IMAGE,
    },
    fallbackUrl: {
      type: String,
      value: '',
    },
  },

  data: {
    displayImage: DEFAULT_IMAGE,
    usedFallback: false,
  },

  observers: {
    imageUrl(url) {
      this.setData({
        displayImage: url || DEFAULT_IMAGE,
        usedFallback: false,
      });
    },
  },

  lifetimes: {
    attached() {
      this.setData({ displayImage: this.properties.imageUrl || DEFAULT_IMAGE });
    },
  },

  methods: {
    onImageError() {
      if (this.data.usedFallback) return;
      const fallback = this.properties.fallbackUrl;
      if (!fallback) return;
      this.setData({
        displayImage: fallback,
        usedFallback: true,
      });
    },
  },
});
