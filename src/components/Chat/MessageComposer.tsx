import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageComposerProps } from '../../types/chat';
import EmojiPicker from './EmojiPicker';
import styles from './ChatRoom.module.css';

const MessageComposer: React.FC<MessageComposerProps> = ({ 
  onSendMessage, 
  disabled = false, 
  isConnected = true 
}) => {
  const [message, setMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [showError, setShowError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const maxChars = 300;
  const remainingChars = maxChars - message.length;

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Handle message send
  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && remainingChars >= 0 && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, remainingChars, disabled, onSendMessage]);

  // Handle key press
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.substring(0, start) + emoji + message.substring(end);
      
      setMessage(newMessage);
      
      // Restore cursor position after emoji
      setTimeout(() => {
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        textarea.focus();
      }, 0);
    }
    setIsEmojiPickerOpen(false);
  }, [message]);

  // Handle message change
  const handleMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  };

  // Show connection error simulation
  useEffect(() => {
    if (!isConnected) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  const canSend = message.trim().length > 0 && remainingChars >= 0 && !disabled;

  const getCharCounterClass = () => {
    if (remainingChars < 0) return styles.charCounterError;
    if (remainingChars < 50) return styles.charCounterWarning;
    return '';
  };

  return (
    <div className={styles.composer}>
      <div className={styles.composerContent}>
        {/* Emoji Button */}
        <button
          type="button"
          className={styles.emojiButton}
          onClick={() => setIsEmojiPickerOpen(true)}
          aria-label="Open emoji picker"
        >
          😊
        </button>

        {/* Message Input */}
        <div className={styles.inputContainer}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            className={styles.messageInput}
            placeholder="Type your message..."
            rows={1}
            maxLength={maxChars}
            disabled={disabled}
          />
          
          {/* Character Counter */}
          <div className={`${styles.charCounter} ${getCharCounterClass()}`}>
            {remainingChars}
          </div>
        </div>

        {/* Send Button */}
        <button
          type="button"
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>

      {/* Error Message */}
      {showError && (
        <div className={`${styles.errorMessage} ${styles.errorShake}`}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12a8 8 0 0 1 8-8V2.5" />
          </svg>
          <span>Connection lost. Trying to reconnect...</span>
        </div>
      )}

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        onEmojiSelect={handleEmojiSelect}
      />
    </div>
  );
};

export default MessageComposer;
