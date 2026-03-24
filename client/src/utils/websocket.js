/**
 * GraphTutor V3.0 - WebSocket客户端工具
 * 
 * 功能：提供WebSocket连接和事件处理
 * 注意：需要安装 socket.io-client: npm install socket.io-client
 */

import { io } from 'socket.io-client';
import { getStoredToken } from '../api/api.js';

/**
 * WebSocket客户端类
 */
export class WebSocketClient {
  constructor(url = null, options = {}) {
    this.url = url || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.listeners = new Map();
    this.options = {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      ...options,
    };
  }

  /**
   * 连接WebSocket服务器
   * @param {string} token - JWT token
   * @returns {Promise<void>}
   */
  connect(token = null) {
    if (this.socket && this.connected) {
      console.warn('WebSocket已经连接');
      return Promise.resolve();
    }

    const authToken = token || getStoredToken();
    if (!authToken) {
      throw new Error('未提供认证token');
    }

    return new Promise((resolve, reject) => {
      this.socket = io(this.url, {
        ...this.options,
        auth: {
          token: authToken,
        },
        query: {
          token: authToken,
        },
      });

      // 连接成功
      this.socket.on('connect', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('WebSocket连接成功');
        resolve();
      });

      // 连接错误
      this.socket.on('connect_error', (error) => {
        console.error('WebSocket连接错误:', error);
        this.connected = false;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error);
        }
      });

      // 断开连接
      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        console.log('WebSocket断开连接:', reason);
      });

      // 重连尝试
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        this.reconnectAttempts = attemptNumber;
        console.log(`WebSocket重连尝试 ${attemptNumber}/${this.maxReconnectAttempts}`);
      });

      // 重连成功
      this.socket.on('reconnect', (attemptNumber) => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log(`WebSocket重连成功 (尝试 ${attemptNumber} 次)`);
      });

      // 重连失败
      this.socket.on('reconnect_failed', () => {
        console.error('WebSocket重连失败');
        reject(new Error('WebSocket重连失败'));
      });

      // 连接确认
      this.socket.on('connected', (data) => {
        console.log('WebSocket连接确认:', data);
      });

      // 心跳响应
      this.socket.on('pong', (data) => {
        // console.debug('收到心跳响应:', data);
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
      console.log('WebSocket已断开连接');
    }
  }

  /**
   * 监听事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn('WebSocket未连接，无法监听事件');
      return;
    }

    this.socket.on(event, callback);

    // 记录监听器
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 取消监听事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数（可选）
   */
  off(event, callback) {
    if (!this.socket) {
      return;
    }

    if (callback) {
      this.socket.off(event, callback);
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  /**
   * 发送事件
   * @param {string} event - 事件名称
   * @param {Object} data - 数据
   */
  emit(event, data) {
    if (!this.socket || !this.connected) {
      console.warn('WebSocket未连接，无法发送事件');
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * 订阅频道
   * @param {string} channel - 频道名称
   */
  subscribe(channel) {
    this.emit('subscribe', channel);
  }

  /**
   * 取消订阅频道
   * @param {string} channel - 频道名称
   */
  unsubscribe(channel) {
    this.emit('unsubscribe', channel);
  }

  /**
   * 发送心跳
   */
  ping() {
    this.emit('ping');
  }

  /**
   * 检查是否已连接
   * @returns {boolean}
   */
  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }
}

// 创建默认实例
let defaultClient = null;

/**
 * 获取默认WebSocket客户端实例
 * @returns {WebSocketClient}
 */
export function getWebSocketClient() {
  if (!defaultClient) {
    defaultClient = new WebSocketClient();
  }
  return defaultClient;
}

/**
 * 初始化WebSocket连接
 * @param {string} token - JWT token
 * @returns {Promise<WebSocketClient>}
 */
export async function initWebSocket(token = null) {
  const client = getWebSocketClient();
  if (!client.isConnected()) {
    await client.connect(token);
  }
  return client;
}

/**
 * 断开WebSocket连接
 */
export function disconnectWebSocket() {
  if (defaultClient) {
    defaultClient.disconnect();
    defaultClient = null;
  }
}

export default WebSocketClient;

