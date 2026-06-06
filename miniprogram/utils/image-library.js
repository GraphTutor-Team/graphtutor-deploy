/**
 * 免费可商用图库配置（统一管理）
 * 说明：
 * - 仅放公开静态图片链接，页面侧需保留本地 fallback。
 * - 小程序上线前请在后台配置对应 image/download 合法域名。
 */

const IMAGE_CDN_DOMAINS = [
  "https://images.unsplash.com",
  "https://images.pexels.com",
  "https://cdn.pixabay.com",
];

const SHOP_IMAGE_SET = {
  banners: [
    {
      id: "b1",
      title: "图论课程包限时活动",
      subTitle: "本周精选题单 8 折起",
      imageUrl: "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&q=80",
      fallback: "/images/icon_ebd74bn8zis/shouye.png",
    },
    {
      id: "b2",
      title: "错题巩固计划上线",
      subTitle: "按你的学习节奏自动生成",
      imageUrl: "https://images.pexels.com/photos/5905709/pexels-photo-5905709.jpeg?auto=compress&cs=tinysrgb&w=1200",
      fallback: "/images/icon_ebd74bn8zis/shijianrelitu.png",
    },
    {
      id: "b3",
      title: "学习资料专场",
      subTitle: "课程包、题单、计划一站式",
      imageUrl: "https://cdn.pixabay.com/photo/2015/07/17/22/43/student-849825_1280.jpg",
      fallback: "/images/icon_ebd74bn8zis/wenben.png",
    },
  ],
  productCovers: {
    p1: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
    p2: "https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg?auto=compress&cs=tinysrgb&w=800",
    p3: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80",
    p4: "https://cdn.pixabay.com/photo/2016/11/29/03/53/adult-1868750_1280.jpg",
  },
};

const HOME_IMAGE_SET = {
  hero: {
    imageUrl: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1400",
    fallback: "/images/icon_ebd74bn8zis/guanxitu.png",
  },
};

const COMMUNITY_IMAGE_SET = {
  postCovers: {
    p1: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=900&q=80",
    p2: "https://images.pexels.com/photos/1181359/pexels-photo-1181359.jpeg?auto=compress&cs=tinysrgb&w=900",
    p3: "https://cdn.pixabay.com/photo/2016/11/29/07/48/student-1867752_1280.jpg",
  },
  fallback: "/images/icon_ebd74bn8zis/wenben.png",
};

const PAGE_BANNER_SET = {
  practice: {
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    fallback: "/images/icon_ebd74bn8zis/guanxitu.png",
    title: "练习推荐待接入",
    subTitle: "先完成页面框架与入口流程",
  },
  plan: {
    imageUrl: "https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg?auto=compress&cs=tinysrgb&w=1200",
    fallback: "/images/icon_ebd74bn8zis/rilizuobiaoxi.png",
    title: "计划与打卡待接入",
    subTitle: "后端接入后显示真实任务节奏",
  },
  graph: {
    imageUrl: "https://cdn.pixabay.com/photo/2018/03/10/12/00/teamwork-3213924_1280.jpg",
    fallback: "/images/icon_ebd74bn8zis/lujingtu.png",
    title: "图谱进度待接入",
    subTitle: "节点、路径、统计将由后端返回",
  },
  wrong: {
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    fallback: "/images/icon_ebd74bn8zis/shuzi.png",
    title: "错题数据待接入",
    subTitle: "后续展示真实错题卡片与计划",
  },
};

module.exports = {
  IMAGE_CDN_DOMAINS,
  SHOP_IMAGE_SET,
  HOME_IMAGE_SET,
  COMMUNITY_IMAGE_SET,
  PAGE_BANNER_SET,
};
