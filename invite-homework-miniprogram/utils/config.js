// ========== 后端模式 ==========
// 'main'     → GraphTutor 主站后端（:5000），与网站共用，无需本地 3000 服务器
// 'homework' → 独立作业服务器 invite-homework-server（:3000）
const BACKEND_MODE = 'main';

const MAIN_BASE = 'http://106.55.99.208:5000';
const HOMEWORK_BASE = 'http://106.55.99.208:3000';

const SERVER_BASE = BACKEND_MODE === 'main' ? MAIN_BASE : HOMEWORK_BASE;

const content = require('./content');

const apiPaths = BACKEND_MODE === 'main'
  ? {
      registerApi: `${MAIN_BASE}/api/homework/invite/register`,
      healthApi: `${MAIN_BASE}/api/health`,
      videoUrls: [
        `${MAIN_BASE}/homework-media/1.mp4`,
        `${MAIN_BASE}/homework-media/2.mp4`
      ]
    }
  : {
      registerApi: `${HOMEWORK_BASE}/api/register`,
      healthApi: `${HOMEWORK_BASE}/api/health`,
      videoUrls: [
        `${HOMEWORK_BASE}/1.mp4`,
        `${HOMEWORK_BASE}/2.mp4`
      ]
    };

module.exports = {
  backendMode: BACKEND_MODE,
  serverBase: SERVER_BASE,
  ...apiPaths,
  map: {
    latitude: 23.1291,
    longitude: 113.2644,
    name: content.event.place,
    address: '广州市天河区校园创新中心'
  },
  content
};
