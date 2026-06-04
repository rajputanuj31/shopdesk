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

  // Custom regex-based parser to format bold (**bold**), bullet points (- point), and links
  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Matches list items starting with - or * followed by a space
      const bulletRegex = /^\s*[-*•]\s+(.+)$/;
      const bulletMatch = line.match(bulletRegex);

      let content: React.ReactNode = line;
      let isBullet = false;

      if (bulletMatch) {
        content = bulletMatch[1];
        isBullet = true;
      }

      const formattedContent = parseInlineStyles(String(content));

      if (isBullet) {
        return (
          <li key={index} style={{ marginLeft: '16px', marginBottom: '4px', listStyleType: 'disc' }}>
            {formattedContent}
          </li>
        );
      }

      return (
        <div key={index} style={{ minHeight: line.trim() === '' ? '12px' : 'auto' }}>
          {formattedContent}
        </div>
      );
    });
  };

  const parseInlineStyles = (text: string): React.ReactNode[] => {
    // Splits text by bold markers (**bold**) or HTTP/HTTPS URLs
    const regex = /(\*\*.*?\*\*|https?:\/\/[^\s]+)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('http://') || part.startsWith('https://')) {
        // Clean trailing punctuation
        let cleanUrl = part;
        let trailingPunctuation = '';
        const match = part.match(/([.,!?;)]+)$/);
        if (match) {
          trailingPunctuation = match[1];
          cleanUrl = part.slice(0, -trailingPunctuation.length);
        }
        return (
          <React.Fragment key={index}>
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 500 }}
            >
              {cleanUrl}
            </a>
            {trailingPunctuation}
          </React.Fragment>
        );
      }
      return part;
    });
  };

  return (
    <div className={`message-row ${message.sender}`}>
      <div className={`bubble ${message.sender} ${message.isError ? 'error' : ''}`}>
        {renderMessageText(message.text)}
      </div>
      {formattedTime && <div className="message-time">{formattedTime}</div>}
    </div>
  );
};
