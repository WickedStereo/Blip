import React, { useEffect, useRef } from 'react';
import { EmojiPickerProps } from '../../types/chat';
import styles from './ChatRoom.module.css';

const EmojiPicker: React.FC<EmojiPickerProps> = ({ isOpen, onClose, onEmojiSelect }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Emoji set - common emojis for chat
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
    '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
    '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
    '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
    '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
    '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
    '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑',
    '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
    '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸',
    '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '❤️',
    '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
    '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
    '💝', '💟', '👍', '👎', '👌', '✌️', '🤞', '🤟',
    '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
    '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲',
    '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶'
  ];

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current === event.target) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleEmojiClick = (emoji: string, event: React.MouseEvent<HTMLButtonElement>) => {
    onEmojiSelect(emoji);
    
    // Add reaction animation
    const button = event.currentTarget;
    button.classList.add(styles.emojiReact);
    setTimeout(() => {
      button.classList.remove(styles.emojiReact);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} className={styles.emojiPickerOverlay}>
      <div className={styles.emojiPickerContent}>
        <div className={styles.emojiPickerHeader}>
          <h3 className={styles.emojiPickerTitle}>Choose an emoji</h3>
          <button
            type="button"
            className={styles.emojiPickerClose}
            onClick={onClose}
            aria-label="Close emoji picker"
          >
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        
        <div className={styles.emojiGrid}>
          {emojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              type="button"
              className={styles.emojiGridButton}
              onClick={(event) => handleEmojiClick(emoji, event)}
              aria-label={`Insert ${emoji} emoji`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
