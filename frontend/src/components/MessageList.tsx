import React, { useEffect, useRef } from 'react';
import type { Message } from '../api/chat';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  historyLoading: boolean;
  onSuggestionClick: (text: string) => void;
}

const SUGGESTIONS = [
  "What is your shipping policy?",
  "What is your return policy?",
  "What are your support hours?",
  "Do you ship to Canada?"
];

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  historyLoading,
  onSuggestionClick,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of the list on new messages or loading status changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, historyLoading]);

  if (historyLoading) {
    return (
      <div className="message-list">
        <div className="skeleton-row ai">
          <div className="skeleton-bubble" />
        </div>
        <div className="skeleton-row user">
          <div className="skeleton-bubble" />
        </div>
        <div className="skeleton-row ai">
          <div className="skeleton-bubble" />
        </div>
        <div className="skeleton-row user">
          <div className="skeleton-bubble" />
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="message-list">
        <div className="empty-state">
          <div className="empty-state-icon">🤖</div>
          <h2>Shopdesk Support</h2>
          <p>Hello! Ask me any questions about shipping, returns, support hours, or payment methods.</p>
          <div className="empty-suggestions">
            {SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-chip"
                onClick={() => onSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="message-list" ref={listRef}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {loading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
};
