import React, { useState, useRef, useEffect } from 'react';

interface InputBarProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({ onSend, disabled }) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setInputText('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 2000) {
      setInputText(val);
    }
  };

  const charCount = inputText.length;
  const isWarning = charCount >= 1800;

  return (
    <div className="input-bar">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="input-field"
          placeholder="Type a message..."
          value={inputText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        {charCount > 0 && (
          <div className={`char-counter ${isWarning ? 'warning' : ''}`}>
            {charCount}/2000
          </div>
        )}
      </div>
      <button
        type="button"
        className="send-button"
        onClick={handleSend}
        disabled={disabled || !inputText.trim()}
        aria-label="Send message"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
};
