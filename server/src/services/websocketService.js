/**
 * GraphTutor V3.0 - WebSocket实时推送服务
 * 
 * 功能：提供实时通知推送功能
 * 注意：需要安装 socket.io: npm install socket.io
 */

let Server = null;
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { info, warn, error, debug } from '../utils/logger.js';

/**
 * WebSocket服务类
 */
export class WebSocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> Set of socketIds
    this.socketUsers = new Map(); // socketId -> userId
  }

  /**
   * 初始化WebSocket服务
   * @param {Object} httpServer - HTTP服务器实例
   * @param {Object} options - Socket.IO选项
   */
  async initialize(httpServer, options = {}) {
    // 动态导入socket.io
    if (!Server) {
      try {
        const socketIo = await import('socket.io');
        Server = socketIo.Server;
      } catch (err) {
        throw new Error('socket.io is not installed. Please run: npm install socket.io');
      }
    }

    const defaultOptions = {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      ...options,
    };

    this.io = new Server(httpServer, defaultOptions);

    // 连接中间件：验证JWT
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        
        if (!token) {
          return next(new Error('未提供认证token'));
        }

        const payload = jwt.verify(token, JWT_SECRET);
        const userId = payload.id || payload._id || payload.userId || payload.sub || payload.uid;

        if (!userId) {
          return next(new Error('无效的token'));
        }

        socket.userId = userId;
        next();
      } catch (err) {
        error('WebSocket认证失败:', { error: err.message });
        next(new Error('认证失败'));
      }
    });

    // 连接事件
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    info('WebSocket服务已启动');
  }

  /**
   * 处理客户端连接
   * @param {Object} socket - Socket实例
   */
  handleConnection(socket) {
    const userId = socket.userId;
    const socketId = socket.id;

    // 记录用户连接
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);
    this.socketUsers.set(socketId, userId);

    info(`用户 ${userId} 已连接 WebSocket (socketId: ${socketId})`);

    // 加入用户专属房间
    socket.join(`user:${userId}`);

    // 发送连接成功消息
    socket.emit('connected', {
      message: 'WebSocket连接成功',
      userId,
      timestamp: new Date().toISOString(),
    });

    // 处理断开连接
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // 处理心跳
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // 处理订阅事件
    socket.on('subscribe', (channel) => {
      if (typeof channel === 'string') {
        socket.join(channel);
        debug(`用户 ${userId} 订阅了频道: ${channel}`);
      }
    });

    // 处理取消订阅
    socket.on('unsubscribe', (channel) => {
      if (typeof channel === 'string') {
        socket.leave(channel);
        debug(`用户 ${userId} 取消订阅频道: ${channel}`);
      }
    });
  }

  /**
   * 处理客户端断开连接
   * @param {Object} socket - Socket实例
   * @param {string} reason - 断开原因
   */
  handleDisconnection(socket, reason) {
    const userId = socket.userId;
    const socketId = socket.id;

    // 移除用户连接记录
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socketId);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.socketUsers.delete(socketId);

    info(`用户 ${userId} 已断开 WebSocket 连接 (原因: ${reason})`);
  }

  /**
   * 向指定用户发送通知
   * @param {string} userId - 用户ID
   * @param {string} event - 事件名称
   * @param {Object} data - 数据
   * @returns {boolean} 是否发送成功
   */
  sendToUser(userId, event, data) {
    if (!this.io) {
      warn('WebSocket服务未初始化');
      return false;
    }

    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      debug(`用户 ${userId} 未连接，无法发送实时通知`);
      return false;
    }

    // 向用户房间发送消息
    this.io.to(`user:${userId}`).emit(event, data);
    
    debug(`向用户 ${userId} 发送 ${event} 事件`);
    return true;
  }

  /**
   * 向所有连接的客户端广播消息
   * @param {string} event - 事件名称
   * @param {Object} data - 数据
   */
  broadcast(event, data) {
    if (!this.io) {
      warn('WebSocket服务未初始化');
      return;
    }

    this.io.emit(event, data);
    debug(`广播 ${event} 事件`);
  }

  /**
   * 向指定房间发送消息
   * @param {string} room - 房间名称
   * @param {string} event - 事件名称
   * @param {Object} data - 数据
   */
  sendToRoom(room, event, data) {
    if (!this.io) {
      warn('WebSocket服务未初始化');
      return;
    }

    this.io.to(room).emit(event, data);
    debug(`向房间 ${room} 发送 ${event} 事件`);
  }

  /**
   * 获取在线用户数
   * @returns {number}
   */
  getOnlineUserCount() {
    return this.userSockets.size;
  }

  /**
   * 检查用户是否在线
   * @param {string} userId - 用户ID
   * @returns {boolean}
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * 获取用户的所有socket连接
   * @param {string} userId - 用户ID
   * @returns {Set<string>}
   */
  getUserSockets(userId) {
    return this.userSockets.get(userId) || new Set();
  }
}

// 创建单例实例
const webSocketService = new WebSocketService();

export default webSocketService;

