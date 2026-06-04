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
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);

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
          if (res.suggestions) {
            setActiveSuggestions(res.suggestions);
          }
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

    // Clear active suggestions immediately on send
    setActiveSuggestions([]);

    // 1. Create and append the user message locally
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: sessionId || '',
      sender: 'user',
      text: text,
      timestamp: new Date().toISOString(),
    };

    const aiReplyMessageId = `ai-${Date.now()}`;
    const tempAiMessage: Message = {
      id: aiReplyMessageId,
      conversation_id: sessionId || '',
      sender: 'ai',
      text: '', // start empty for streaming tokens
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage, tempAiMessage]);
    setLoading(true);
    setError(null);

    let accumulatedText = '';

    try {
      // 2. Call backend using streaming sendMessage wrapper
      await sendMessage(
        text,
        sessionId || undefined,
        // onChunk callback
        (chunk) => {
          accumulatedText += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiReplyMessageId ? { ...msg, text: accumulatedText } : msg
            )
          );
        },
        // onDone callback
        (data) => {
          if (!sessionId && data.sessionId) {
            setSessionId(data.sessionId);
            localStorage.setItem(SESSION_KEY, data.sessionId);
          }
          if (data.suggestions) {
            setActiveSuggestions(data.suggestions);
          } else {
            setActiveSuggestions([]);
          }
          setLoading(false);
        },
        // onError callback
        (err) => {
          console.error('Failed to stream message:', err);
          const errorMessage: Message = {
            id: `err-${Date.now()}`,
            conversation_id: sessionId || '',
            sender: 'ai',
            text: err.message || 'An unexpected error occurred. Please try again.',
            timestamp: new Date().toISOString(),
            isError: true,
          };
          // Remove the empty streaming bubble and append the error bubble
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== aiReplyMessageId).concat(errorMessage)
          );
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.error('Outer send message error:', err);
      setLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setMessages([]);
    setError(null);
    setActiveSuggestions([]);
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
        activeSuggestions={activeSuggestions}
      />

      <InputBar onSend={handleSend} disabled={loading || historyLoading} />
    </div>
  );
};
