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
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { getFriends, checkFriendship } from '../api/v3/friends';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import Icon from '../components/common/Icon';
import LoginPrompt from '../components/common/LoginPrompt';
import { getWebSocketClient, initWebSocket } from '../utils/websocket';
import ConversationList from '../components/messages/ConversationList';
import MessageList from '../components/messages/MessageList';
import MessageInput from '../components/messages/MessageInput';
import MessageContextMenu from '../components/messages/MessageContextMenu';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const selectedUserIdRef = useRef(null);
  const typingTimerRef = useRef(null);
  const peerTypingClearRef = useRef(null);
  const wsHandlersRef = useRef({});

  selectedUserIdRef.current = selectedUserId;

  useEffect(() => {
    if (user) {
      loadConversations().then(() => {
        const peerId = searchParams.get('userId');
        if (peerId) {
          openConversationWith(peerId);
        }
      });
      initializeWebSocket();
    }

    return () => {
      const ws = getWebSocketClient();
      const h = wsHandlersRef.current;
      if (ws && h) {
        if (h.onNew) ws.off('message:new', h.onNew);
        if (h.onRead) ws.off('message:read', h.onRead);
        if (h.onRecalled) ws.off('message:recalled', h.onRecalled);
        if (h.onPresence) ws.off('presence:update', h.onPresence);
        if (h.onTyping) ws.off('typing:update', h.onTyping);
      }
    };
  }, [user]);

  useEffect(() => {
    const peerId = searchParams.get('userId');
    if (user && peerId && peerId !== selectedUserId) {
      openConversationWith(peerId);
    }
  }, [searchParams]);

  const initializeWebSocket = async () => {
    try {
      const ws = await initWebSocket();
      setupWebSocketListeners(ws);
    } catch (err) {
      console.error('WebSocket初始化失败:', err);
    }
  };

  /** 从好友页深链打开会话（即使尚无历史消息） */
  const openConversationWith = async (peerId) => {
    if (!peerId) return;

    try {
      const isFriend = await checkFriendship(peerId);
      if (!isFriend) {
        toast.error('只能与好友私信，请先添加好友');
        navigate(`/users/${peerId}`, { replace: true });
        setSearchParams({}, { replace: true });
        return;
      }
    } catch (err) {
      console.warn('检查好友关系失败:', err);
    }

    setSelectedUserId(peerId);
    setConversations((prev) => {
      if (prev.some((c) => String(c.userId) === String(peerId))) return prev;
      return [
        {
          userId: peerId,
          name: '好友',
          avatarUrl: null,
          unreadCount: 0,
          lastMessage: null,
        },
        ...prev,
      ];
    });
    try {
      const data = await getFriends({ page: 1, limit: 100 });
      const friend = (data.items || []).find(
        (f) => String(f._id) === String(peerId)
      );
      if (friend) {
        setConversations((prev) =>
          prev.map((c) =>
            String(c.userId) === String(peerId)
              ? {
                  ...c,
                  name: friend.name || friend.email || '好友',
                  avatarUrl: friend.avatarUrl || null,
                }
              : c
          )
        );
      }
    } catch (err) {
      console.warn('加载好友信息失败:', err);
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

    const onNew = (data) => {
      const newMessage = data.message;
      const currentPeer = selectedUserIdRef.current;
      
      if (currentPeer && (
        String(newMessage.senderId) === String(currentPeer) || 
        String(newMessage.receiverId) === String(currentPeer)
      )) {
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
        if (String(newMessage.receiverId) === String(user.id)) {
          markAsRead(newMessage.senderId);
        }
      } else if (String(newMessage.receiverId) === String(user.id)) {
        showNotification(newMessage);
      }

      loadConversations();
    };

    const onRead = (data) => {
      if (String(data.receiverId) === String(user.id) && String(selectedUserIdRef.current) === String(data.receiverId)) {
        setMessages(prev =>
          prev.map(msg =>
            msg.senderId === user.id && !msg.isRead
              ? { ...msg, isRead: true, readAt: new Date() }
              : msg
          )
        );
      }
    };

    const onRecalled = (data) => {
      if (selectedUserIdRef.current) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === data.messageId
              ? { ...msg, isRecalled: true, content: '[消息已撤回]' }
              : msg
          )
        );
      }
      loadConversations();
    };

    const onPresence = (data) => {
      if (String(data.userId) === String(selectedUserIdRef.current)) {
        setPeerOnline(!!data.online);
      }
      setConversations((prev) =>
        prev.map((c) =>
          String(c.userId) === String(data.userId)
            ? { ...c, isOnline: !!data.online }
            : c
        )
      );
    };

    const onTyping = (data) => {
      if (String(data.fromUserId) !== String(selectedUserIdRef.current)) return;
      setPeerTyping(!!data.isTyping);
      if (peerTypingClearRef.current) clearTimeout(peerTypingClearRef.current);
      if (data.isTyping) {
        peerTypingClearRef.current = setTimeout(() => setPeerTyping(false), 3000);
      }
    };

    wsHandlersRef.current = { onNew, onRead, onRecalled, onPresence, onTyping };
    ws.on('message:new', onNew);
    ws.on('message:read', onRead);
    ws.on('message:recalled', onRecalled);
    ws.on('presence:update', onPresence);
    ws.on('typing:update', onTyping);
  };

  useEffect(() => {
    setPeerTyping(false);
    setPeerOnline(false);
    const ws = getWebSocketClient();
    if (ws?.isConnected?.() && selectedUserId) {
      ws.emit('presence:query', { userId: selectedUserId });
    }
  }, [selectedUserId]);

  const emitTyping = (isTyping) => {
    const ws = getWebSocketClient();
    if (!ws?.isConnected?.() || !selectedUserId) return;
    ws.emit('typing', { toUserId: selectedUserId, isTyping });
  };

  const handleMessageInputChange = (value) => {
    setMessageInput(value);
    emitTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emitTyping(false), 1200);
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
      setConversations(Array.isArray(data) ? data : []);
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
      emitTyping(false);
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
      <LoginPrompt
        title="登录后查看消息"
        description="登录后可与好友聊天。还不熟流程？先看教程，或直接去练习。"
      />
    );
  }

  const selectedConversation = conversations.find(c => c.userId === selectedUserId);

  return (
    <div className="page-shell">
      <PageHeader
        title="消息"
        description="与好友聊天"
      />

      <div className="surface !p-0 overflow-hidden">
          <div className="flex h-[min(70vh,640px)] min-h-[380px] sm:min-h-[420px]">
            {/* 会话列表 */}
            <div className="w-1/3 border-r border-slate-200/80 dark:border-slate-700 flex flex-col">
              <div className="p-4 border-b border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    会话列表
                  </h2>
                </div>
                <div className="flex items-center gap-2">
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
                    className="input flex-1 !py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
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
                          {selectedConversation?.name || '好友'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {peerTyping
                            ? '正在输入...'
                            : peerOnline || selectedConversation?.isOnline
                              ? '在线'
                              : '离线'}
                        </p>
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
                    setMessageInput={handleMessageInputChange}
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
  );
}
