/**
 * GraphTutor V3.0 - 消息输入组件
 * 
 * 作用：消息输入和发送
 */

import Icon from '../common/Icon';

export default function MessageInput({ 
  messageInput, 
  setMessageInput, 
  onSendMessage, 
  sending 
}) {
  return (
    <div className="p-4 border-t dark:border-slate-700">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          placeholder="输入消息..."
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={sending}
        />
        <button
          onClick={onSendMessage}
          disabled={!messageInput.trim() || sending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <Icon name="send" className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

