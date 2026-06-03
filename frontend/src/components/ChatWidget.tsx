import React, { useState, useEffect } from 'react';
import { sendMessage, getHistory } from '../api/chat';
import type { Message } from '../api/chat';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';

export const ChatWidget: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SESSION_KEY = 'shopdesk_chat_session_id';

  // Load session and history on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem(SESSION_KEY);
    if (savedSessionId) {
      setSessionId(savedSessionId);
      setHistoryLoading(true);
      getHistory(savedSessionId)
        .then((res) => {
          setMessages(res.messages);
        })
        .catch((err) => {
          console.error('Failed to load chat history:', err);
          // If conversation doesn't exist anymore on backend, clear it
          if (err.message.includes('not found') || err.message.includes('404')) {
            localStorage.removeItem(SESSION_KEY);
            setSessionId(null);
          } else {
            setError('Could not load chat history.');
          }
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    }
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // 1. Create and append the user message locally
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: sessionId || '',
      sender: 'user',
      text: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setLoading(true);
    setError(null);

    try {
      // 2. Call backend
      const response = await sendMessage(text, sessionId || undefined);

      // 3. If new session, persist it
      if (!sessionId && response.sessionId) {
        setSessionId(response.sessionId);
        localStorage.setItem(SESSION_KEY, response.sessionId);
      }

      // 4. Create and append AI reply
      const aiReplyMessage: Message = {
        id: `ai-${Date.now()}`,
        conversation_id: response.sessionId,
        sender: 'ai',
        text: response.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiReplyMessage]);
    } catch (err: any) {
      console.error('Failed to send message:', err);

      // 5. Append error message to list
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        conversation_id: sessionId || '',
        sender: 'ai',
        text: err.message || 'An unexpected error occurred. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setMessages([]);
    setError(null);
  };

  return (
    <div className="chat-widget">
      <header className="chat-header">
        <div className="chat-header-avatar">🛍️</div>
        <div className="chat-header-info">
          <h1>Shopdesk Support</h1>
          <p>Online E-commerce Assistant</p>
        </div>
        <div className="chat-header-status" style={{ gap: '12px' }}>
          <button
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              padding: '5px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
            title="Start a new conversation"
          >
            New Chat
          </button>
          <div className="chat-header-status">
            <span className="status-dot" />
            <span>Active</span>
          </div>
        </div>
      </header>

      {error && (
        <div
          style={{
            background: 'var(--bg-error-bubble)',
            color: 'var(--text-error)',
            borderBottom: '1px solid var(--border-error)',
            padding: '8px 16px',
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      <MessageList
        messages={messages}
        loading={loading}
        historyLoading={historyLoading}
        onSuggestionClick={handleSend}
      />

      <InputBar onSend={handleSend} disabled={loading || historyLoading} />
    </div>
  );
};
