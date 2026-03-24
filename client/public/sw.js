/**
 * GraphTutor V3.0 - Service Worker
 * 
 * 功能：PWA支持，离线缓存
 */

const CACHE_NAME = 'graphtutor-v3.0.1';
const urlsToCache = [
  '/',
  '/home',
  '/quiz',
  '/check-in',
  '/manifest.json',
];

// 安装Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 激活Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  // 跳过非 HTTP/HTTPS 请求（如 chrome-extension://）
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // 开发环境：不缓存 JS/CSS/HTML 等开发资源
  const isDevResource = url.pathname.includes('/src/') || 
                        url.pathname.endsWith('.js') || 
                        url.pathname.endsWith('.css') ||
                        url.pathname.endsWith('.jsx') ||
                        url.pathname.includes('node_modules') ||
                        url.pathname.includes('@vite');
  
  // 如果是开发资源，直接获取，不缓存
  if (isDevResource) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // 如果缓存中有，返回缓存
      if (response) {
        return response;
      }
      // 否则从网络获取
      return fetch(event.request).then((response) => {
        // 检查响应是否有效
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // 只缓存同源请求
        if (url.origin !== location.origin) {
          return response;
        }
        // 克隆响应并缓存
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          try {
            cache.put(event.request, responseToCache);
          } catch (err) {
            console.warn('Service Worker: 缓存失败', err);
          }
        });
        return response;
      }).catch((err) => {
        console.warn('Service Worker: 获取失败', err);
        return new Response('网络错误', { status: 408 });
      });
    })
  );
});

