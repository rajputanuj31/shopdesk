import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="typing-row">
      <div className="typing-bubble">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
    </div>
  );
};
