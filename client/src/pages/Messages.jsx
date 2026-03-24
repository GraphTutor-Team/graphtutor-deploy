/**
 * GraphTutor V3.0 - 消息列表页面
 * 
 * 作用：显示用户的消息会话列表和聊天界面
 * 关联页面：
 *   - api/v3/messages.js (消息API)
 *   - api/v3/friends.js (好友API)
 *   - utils/websocket.js (WebSocket客户端)
 * 技术栈：
 *   - React Hooks (useState, useEffect, useRef)
 *   - React Router (useNavigate)
 *   - WebSocket (实时消息)
 *   - Tailwind CSS
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getConversations,
  getConversation,
  sendMessage as sendMessageAPI,
  markMessagesAsRead,
  searchMessages as searchMessagesAPI,
  recallMessage as recallMessageAPI,
  deleteMessage as deleteMessageAPI,
} from '../api/v3/messages';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import Icon from '../components/common/Icon';
import { getWebSocketClient, initWebSocket } from '../utils/websocket';
import ConversationList from '../components/messages/ConversationList';
import MessageList from '../components/messages/MessageList';
import MessageInput from '../components/messages/MessageInput';
import MessageContextMenu from '../components/messages/MessageContextMenu';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadConversations();
      initializeWebSocket();
    }

    return () => {
      // 清理WebSocket监听
      const ws = getWebSocketClient();
      if (ws) {
        ws.off('message:new');
        ws.off('message:read');
      }
    };
  }, [user]);

  const initializeWebSocket = async () => {
    try {
      const ws = await initWebSocket();
      setupWebSocketListeners(ws);
    } catch (err) {
      console.error('WebSocket初始化失败:', err);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
      markAsRead(selectedUserId);
    }
  }, [selectedUserId]);

  const setupWebSocketListeners = (ws) => {
    if (!ws) return;

    ws.on('message:new', (data) => {
      const newMessage = data.message;
      
      if (selectedUserId && (
        newMessage.senderId === selectedUserId || 
        newMessage.receiverId === selectedUserId
      )) {
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
        if (newMessage.receiverId === user.id) {
          markAsRead(newMessage.senderId);
        }
      } else if (newMessage.receiverId === user.id) {
        showNotification(newMessage);
      }

      loadConversations();
    });

    ws.on('message:read', (data) => {
      if (data.receiverId === user.id && selectedUserId === data.receiverId) {
        setMessages(prev =>
          prev.map(msg =>
            msg.senderId === user.id && !msg.isRead
              ? { ...msg, isRead: true, readAt: new Date() }
              : msg
          )
        );
      }
    });

    ws.on('message:recalled', (data) => {
      if (selectedUserId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === data.messageId
              ? { ...msg, isRecalled: true, content: '[消息已撤回]' }
              : msg
          )
        );
      }
      loadConversations();
    });
  };

  const showNotification = (message) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const conversation = conversations.find(c => c.userId === message.senderId);
      new Notification(`${conversation?.name || '好友'}`, {
        body: message.content,
        icon: conversation?.avatarUrl || '/logo.png',
        tag: `message-${message.senderId}`,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showNotification(message);
        }
      });
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error('加载会话列表失败:', err);
      toast.error(err.response?.data?.message || '加载会话列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId, before = null) => {
    try {
      if (before) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setHasMore(true);
      }
      
      const data = await getConversation(userId, { limit: 50, before });
      
      if (before) {
        setMessages(prev => [...data.reverse(), ...prev]);
        setHasMore(data.length === 50);
      } else {
        setMessages(data.reverse());
        setHasMore(data.length === 50);
        scrollToBottom();
      }
    } catch (err) {
      console.error('加载消息失败:', err);
      toast.error(err.response?.data?.message || '加载消息失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || !selectedUserId || loadingMore || !hasMore) return;

    if (container.scrollTop === 0) {
      const oldestMessage = messages[0];
      if (oldestMessage) {
        loadMessages(selectedUserId, oldestMessage.createdAt);
      }
    }
  };

  const markAsRead = async (userId) => {
    try {
      await markMessagesAsRead(userId);
      setConversations(prev =>
        prev.map(conv =>
          conv.userId === userId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedUserId || sending) return;

    try {
      setSending(true);
      const newMessage = await sendMessageAPI({
        receiverId: selectedUserId,
        content: messageInput.trim(),
      });

      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');
      scrollToBottom();
      await loadConversations();
    } catch (err) {
      console.error('发送消息失败:', err);
      toast.error(err.response?.data?.message || '发送消息失败');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }

    try {
      setLoading(true);
      const results = await searchMessagesAPI(searchKeyword.trim(), { limit: 50 });
      setSearchResults(results);
      setShowSearch(true);
    } catch (err) {
      console.error('搜索消息失败:', err);
      toast.error(err.response?.data?.message || '搜索消息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success('消息已复制');
      setContextMenu(null);
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  const handleForwardMessage = (message) => {
    setMessageInput(`转发：${message.content}`);
    setContextMenu(null);
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message: msg,
    });
  };

  const handleRecallMessage = async (message) => {
    if (window.confirm('确定要撤回这条消息吗？')) {
      try {
        await recallMessageAPI(message._id);
        setMessages(prev =>
          prev.map(m =>
            m._id === message._id
              ? { ...m, isRecalled: true, content: '[消息已撤回]' }
              : m
          )
        );
        toast.success('消息已撤回');
      } catch (err) {
        console.error('撤回消息失败:', err);
        toast.error(err.response?.data?.message || '撤回消息失败');
      }
    }
  };

  const handleDeleteMessage = async (message) => {
    if (window.confirm('确定要删除这条消息吗？')) {
      try {
        await deleteMessageAPI(message._id);
        setMessages(prev => prev.filter(m => m._id !== message._id));
        toast.success('消息已删除');
        setContextMenu(null);
        await loadConversations();
      } catch (err) {
        console.error('删除消息失败:', err);
        toast.error(err.response?.data?.message || '删除消息失败');
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [contextMenu]);

  if (!user) {
    return (
      <div className="p-6 text-center">
        <div className="text-slate-500">请先登录</div>
      </div>
    );
  }

  const selectedConversation = conversations.find(c => c.userId === selectedUserId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PageHeader
        title="消息"
        description="与好友聊天"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 overflow-hidden">
          <div className="flex h-[600px]">
            {/* 会话列表 */}
            <div className="w-1/3 border-r dark:border-slate-700 flex flex-col">
              <div className="p-4 border-b dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    会话列表
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    placeholder="搜索消息..."
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    onClick={handleSearch}
                    className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <Icon name="search" className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <ConversationList
                conversations={conversations}
                selectedUserId={selectedUserId}
                onSelectUser={(userId) => {
                  setSelectedUserId(userId);
                  setShowSearch(false);
                  setSearchKeyword('');
                  setSearchResults([]);
                }}
                loading={loading}
                searchResults={searchResults}
                showSearch={showSearch}
                user={user}
              />
            </div>

            {/* 聊天界面 */}
            <div className="flex-1 flex flex-col">
              {selectedUserId ? (
                <>
                  {/* 聊天头部 */}
                  <div className="p-4 border-b dark:border-slate-700">
                    <div className="flex items-center space-x-3">
                      {selectedConversation?.avatarUrl ? (
                        <img
                          src={selectedConversation.avatarUrl}
                          alt={selectedConversation.name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                          {selectedConversation?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                          {selectedConversation?.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">在线</p>
                      </div>
                    </div>
                  </div>

                  {/* 消息列表 */}
                  <MessageList
                    messages={messages}
                    user={user}
                    selectedConversation={selectedConversation}
                    loading={loading}
                    loadingMore={loadingMore}
                    onScroll={handleScroll}
                    onContextMenu={handleContextMenu}
                    onRecallMessage={handleRecallMessage}
                    messagesEndRef={messagesEndRef}
                    messagesContainerRef={messagesContainerRef}
                  />

                  {/* 右键菜单 */}
                  <MessageContextMenu
                    contextMenu={contextMenu}
                    user={user}
                    onCopy={handleCopyMessage}
                    onForward={handleForwardMessage}
                    onRecall={handleRecallMessage}
                    onDelete={handleDeleteMessage}
                    onClose={() => setContextMenu(null)}
                  />

                  {/* 消息输入 */}
                  <MessageInput
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    onSendMessage={handleSendMessage}
                    sending={sending}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Icon name="message-circle" className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">选择一个会话开始聊天</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
