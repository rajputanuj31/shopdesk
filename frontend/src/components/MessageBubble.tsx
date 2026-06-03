import React from 'react';
import type { Message } from '../api/chat';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      let parsableStr = timeStr;
      if (!parsableStr.includes('T') && !parsableStr.includes('Z')) {
        // SQLite datetime('now') returns YYYY-MM-DD HH:MM:SS
        // Convert to ISO-like YYYY-MM-DDTHH:MM:SSZ (UTC)
        parsableStr = parsableStr.replace(' ', 'T') + 'Z';
      }
      const date = new Date(parsableStr);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formattedTime = formatTime(message.timestamp);

  return (
    <div className={`message-row ${message.sender}`}>
      <div className={`bubble ${message.sender} ${message.isError ? 'error' : ''}`}>
        {message.text}
      </div>
      {formattedTime && <div className="message-time">{formattedTime}</div>}
    </div>
  );
};
