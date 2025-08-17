import React from 'react';
import { ChatHeaderProps } from '../../types/chat';
import styles from './ChatRoom.module.css';

const ChatHeader: React.FC<ChatHeaderProps> = ({ room, onBackClick }) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        {/* Back to Map Button */}
        <button 
          className={styles.backButton}
          onClick={onBackClick}
          aria-label="Back to map"
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
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>
        
        {/* Room Info */}
        <div className={styles.roomInfo}>
          <div className={styles.roomCode}>
            <span>{room.code}</span>
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
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <span className={styles.roomLocation}>~{room.location}</span>
        </div>
      </div>
      
      {/* Online Count & Status */}
      <div className={styles.headerRight}>
        <div className={styles.onlineCount}>
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="m22 21-3-3m0 0-3-3m3 3 3-3m-3 3-3 3" />
          </svg>
          <span className={`${styles.userCountNumber} ${styles.counterUpdate}`}>
            {room.userCount}
          </span>
          <span>online</span>
        </div>
        <div className={`${styles.statusDot} ${styles.statusOnline} ${styles.pulseGlow}`} />
      </div>
    </header>
  );
};

export default ChatHeader;
