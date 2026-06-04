import React, { useEffect, useRef } from 'react';
import type { Message } from '../api/chat';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  historyLoading: boolean;
  onSuggestionClick: (text: string) => void;
  activeSuggestions: string[];
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
  activeSuggestions,
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

  const lastMessage = messages[messages.length - 1];
  const isStreamingActive = !!(lastMessage && lastMessage.sender === 'ai' && lastMessage.text && !lastMessage.isError);
  const showTyping = loading && !isStreamingActive;

  const visibleMessages = messages.filter(
    (msg) => !(msg.sender === 'ai' && !msg.text && !msg.isError)
  );

  return (
    <div className="message-list" ref={listRef}>
      {visibleMessages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {showTyping && <TypingIndicator />}

      {!loading && activeSuggestions && activeSuggestions.length > 0 && (
        <div className="empty-suggestions" style={{ marginTop: '8px', alignSelf: 'flex-start', maxWidth: '80%' }}>
          {activeSuggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-chip"
              onClick={() => onSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
