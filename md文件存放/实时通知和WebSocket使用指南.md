# 实时通知和WebSocket使用指南

**创建时间**: 2026-01-19

## 📋 概述

本项目已实现WebSocket实时通知推送功能，支持实时消息推送、在线状态管理等。

## 🚀 快速开始

### 1. 安装依赖

#### 服务端
```bash
cd server
npm install socket.io
```

#### 客户端
```bash
cd client
npm install socket.io-client
```

### 2. 服务端配置

WebSocket服务会在服务器启动时自动初始化。确保在`server/server.js`中已正确集成。

### 3. 客户端连接

```javascript
import { initWebSocket, getWebSocketClient } from './utils/websocket';

// 初始化连接
const client = await initWebSocket(token);

// 监听新通知
client.on('notification:new', (data) => {
  console.log('收到新通知:', data.notification);
  // 更新UI
});

// 监听未读数量更新
client.on('notification:unread-count', (data) => {
  console.log('未读数量:', data.count);
  // 更新未读数量显示
});
```

## 🎯 核心功能

### 1. WebSocket服务 (服务端)

#### 1.1 初始化

```javascript
import webSocketService from './services/websocketService.js';

// 在server.js中初始化
webSocketService.initialize(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});
```

#### 1.2 发送通知给用户

```javascript
import webSocketService from './services/websocketService.js';

// 向指定用户发送通知
webSocketService.sendToUser(userId, 'notification:new', {
  notification: notificationData,
  timestamp: new Date().toISOString(),
});
```

#### 1.3 广播消息

```javascript
// 向所有连接的客户端广播
webSocketService.broadcast('system:announcement', {
  message: '系统维护通知',
});

// 向指定房间发送
webSocketService.sendToRoom('group:123', 'group:message', {
  message: '群组消息',
});
```

#### 1.4 检查在线状态

```javascript
// 检查用户是否在线
const isOnline = webSocketService.isUserOnline(userId);

// 获取在线用户数
const count = webSocketService.getOnlineUserCount();
```

### 2. 实时通知服务

#### 2.1 创建并推送通知

```javascript
import { createAndPushNotification } from './services/realtimeNotificationService.js';

// 创建通知并实时推送
const notification = await createAndPushNotification({
  userId: 'user123',
  type: 'reply',
  title: '收到新回复',
  content: '你的讨论收到了新回复',
  link: '/discussions/123',
  priority: 4,
});
```

#### 2.2 便捷函数

```javascript
import {
  createAndPushAchievementNotification,
  createAndPushReplyNotification,
  createAndPushReminderNotification,
  createAndPushSystemNotification,
} from './services/realtimeNotificationService.js';

// 成就解锁通知
await createAndPushAchievementNotification(userId, achievement);

// 讨论回复通知
await createAndPushReplyNotification(userId, discussion, reply);

// 学习提醒通知
await createAndPushReminderNotification(userId, '该学习了！');

// 系统通知
await createAndPushSystemNotification(
  userId,
  '系统通知',
  '系统将在今晚进行维护',
  { link: '/announcements', priority: 5 }
);
```

#### 2.3 推送状态更新

```javascript
import {
  pushUnreadCountUpdate,
  pushNotificationReadUpdate,
  pushNotificationDeleteUpdate,
} from './services/realtimeNotificationService.js';

// 推送未读数量更新
pushUnreadCountUpdate(userId, 5);

// 推送已读状态更新
pushNotificationReadUpdate(userId, notificationId, true);

// 推送删除更新
pushNotificationDeleteUpdate(userId, notificationId);
```

### 3. WebSocket客户端 (前端)

#### 3.1 连接和断开

```javascript
import { initWebSocket, disconnectWebSocket } from './utils/websocket';

// 连接
const client = await initWebSocket(token);

// 断开
disconnectWebSocket();
```

#### 3.2 监听事件

```javascript
import { getWebSocketClient } from './utils/websocket';

const client = getWebSocketClient();

// 监听新通知
client.on('notification:new', (data) => {
  const { notification } = data;
  // 处理新通知
  showNotification(notification);
});

// 监听未读数量更新
client.on('notification:unread-count', (data) => {
  updateUnreadCount(data.count);
});

// 监听已读状态更新
client.on('notification:read-update', (data) => {
  updateNotificationReadStatus(data.notificationId, data.isRead);
});

// 监听删除更新
client.on('notification:delete', (data) => {
  removeNotification(data.notificationId);
});
```

#### 3.3 订阅频道

```javascript
// 订阅频道
client.subscribe('group:123');

// 取消订阅
client.unsubscribe('group:123');
```

## 📝 使用示例

### 示例1: 在路由中使用实时通知

```javascript
import { createAndPushReplyNotification } from '../services/realtimeNotificationService.js';

router.post('/discussions/:id/replies',
  requireAuth,
  asyncHandler(async (req, res) => {
    const discussion = await Discussion.findById(req.params.id);
    const reply = await Reply.create({
      ...req.body,
      discussionId: discussion._id,
      userId: req.user.id,
    });

    // 如果讨论作者不是回复者，发送通知
    if (discussion.userId.toString() !== req.user.id) {
      await createAndPushReplyNotification(
        discussion.userId,
        discussion,
        reply
      );
    }

    res.json(successResponse(reply, '回复成功'));
  })
);
```

### 示例2: 在React组件中使用

```javascript
import { useEffect, useState } from 'react';
import { initWebSocket, getWebSocketClient } from '../utils/websocket';
import { getStoredToken } from '../utils/api';

function NotificationComponent() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let client;

    async function setupWebSocket() {
      const token = getStoredToken();
      if (!token) return;

      try {
        client = await initWebSocket(token);

        // 监听新通知
        client.on('notification:new', (data) => {
          setNotifications(prev => [data.notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        });

        // 监听未读数量更新
        client.on('notification:unread-count', (data) => {
          setUnreadCount(data.count);
        });

        // 监听已读状态更新
        client.on('notification:read-update', (data) => {
          setNotifications(prev =>
            prev.map(n =>
              n._id === data.notificationId
                ? { ...n, isRead: data.isRead }
                : n
            )
          );
        });
      } catch (err) {
        console.error('WebSocket连接失败:', err);
      }
    }

    setupWebSocket();

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, []);

  return (
    <div>
      <div>未读通知: {unreadCount}</div>
      {/* 显示通知列表 */}
    </div>
  );
}
```

### 示例3: 检查用户在线状态

```javascript
import webSocketService from './services/websocketService.js';

// 在发送通知前检查用户是否在线
async function sendNotification(userId, notificationData) {
  const isOnline = webSocketService.isUserOnline(userId);
  
  if (isOnline) {
    // 用户在线，实时推送
    await createAndPushNotification({
      userId,
      ...notificationData,
    });
  } else {
    // 用户离线，只保存到数据库
    await createNotification({
      userId,
      ...notificationData,
    });
  }
}
```

## 🔧 配置选项

### 服务端配置

```javascript
webSocketService.initialize(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});
```

### 客户端配置

```javascript
const client = new WebSocketClient('http://localhost:5000', {
  maxReconnectAttempts: 5,
  reconnectDelay: 3000,
  transports: ['websocket', 'polling'],
});
```

## 📊 事件列表

### 服务端发送的事件

- `notification:new` - 新通知
- `notification:unread-count` - 未读数量更新
- `notification:read-update` - 已读状态更新
- `notification:delete` - 通知删除
- `connected` - 连接成功确认
- `pong` - 心跳响应

### 客户端发送的事件

- `ping` - 心跳请求
- `subscribe` - 订阅频道
- `unsubscribe` - 取消订阅

## ⚠️ 注意事项

### 1. 依赖安装

- 服务端需要安装 `socket.io`
- 客户端需要安装 `socket.io-client`

### 2. 认证

- WebSocket连接需要JWT token
- Token通过`auth.token`或`query.token`传递

### 3. 重连机制

- 客户端自动重连，最多尝试5次
- 重连间隔3秒

### 4. 性能考虑

- WebSocket连接会占用服务器资源
- 建议设置合理的连接超时和心跳间隔
- 考虑使用Redis适配器实现多服务器支持

### 5. 错误处理

```javascript
// 客户端错误处理
client.on('connect_error', (error) => {
  console.error('连接错误:', error);
  // 可以降级到轮询
});

// 服务端错误处理
try {
  webSocketService.sendToUser(userId, 'event', data);
} catch (err) {
  // 用户可能未在线，只保存到数据库
  await createNotification(data);
}
```

## 🔄 后续优化建议

### 短期（1-2周）
- [ ] 添加Redis适配器支持多服务器
- [ ] 实现消息队列保证消息不丢失
- [ ] 添加连接数限制

### 中期（1-2月）
- [ ] 实现消息持久化
- [ ] 添加消息重试机制
- [ ] 实现消息优先级队列

### 长期（3-6月）
- [ ] 实现消息加密
- [ ] 添加消息审计
- [ ] 实现消息分析工具

## 📚 相关文件

- `server/src/services/websocketService.js` - WebSocket服务
- `server/src/services/realtimeNotificationService.js` - 实时通知服务
- `client/src/utils/websocket.js` - WebSocket客户端
- `server/server.js` - 服务器入口（集成WebSocket）

---

**最后更新**: 2026-01-19

