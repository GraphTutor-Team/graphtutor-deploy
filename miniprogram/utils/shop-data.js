const { SHOP_IMAGE_SET } = require("./image-library.js");

const SHOP_BANNERS = SHOP_IMAGE_SET.banners.slice();

const PRODUCTS = [
  {
    id: "p1",
    name: "图论基础训练包",
    category: "课程包",
    price: 39.9,
    stock: 98,
    cover: SHOP_IMAGE_SET.productCovers.p1,
    coverFallback: "/images/icon_ebd74bn8zis/shumu.png",
    desc: "包含图的基本概念、存储结构与基础练习题。",
  },
  {
    id: "p2",
    name: "BFS/DFS 专项题单",
    category: "题单",
    price: 29.9,
    stock: 120,
    cover: SHOP_IMAGE_SET.productCovers.p2,
    coverFallback: "/images/icon_ebd74bn8zis/lujingtu.png",
    desc: "按难度分层的 BFS / DFS 训练题，适合考前冲刺。",
  },
  {
    id: "p3",
    name: "最短路径进阶包",
    category: "课程包",
    price: 49.9,
    stock: 76,
    cover: SHOP_IMAGE_SET.productCovers.p3,
    coverFallback: "/images/icon_ebd74bn8zis/guanxitu.png",
    desc: "涵盖 Dijkstra、Floyd 与典型应用场景。",
  },
  {
    id: "p4",
    name: "错题巩固计划",
    category: "服务",
    price: 19.9,
    stock: 200,
    cover: SHOP_IMAGE_SET.productCovers.p4,
    coverFallback: "/images/icon_ebd74bn8zis/shijianrelitu.png",
    desc: "根据错题记录生成 7 天巩固节奏表。",
  },
];

const CART_STORAGE_KEY = "gt_shop_cart_v1";

function getProducts() {
  return PRODUCTS.slice();
}

module.exports = {
  SHOP_BANNERS,
  PRODUCTS,
  CART_STORAGE_KEY,
  getProducts,
};
