const config = require('./utils/config');

App({
  globalData: {
    projectName: 'GraphTutor 图论挑战赛',
    serverBase: config.serverBase,
    videoUrls: config.videoUrls,
    registerApi: config.registerApi,
    healthApi: config.healthApi,
    map: config.map,
    content: config.content
  }
});
