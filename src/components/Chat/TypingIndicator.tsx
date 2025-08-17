import React from 'react';
import { User } from '../../types/chat';
import styles from './ChatRoom.module.css';

interface TypingIndicatorProps {
  users: User[];
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const typingUser = users[0]; // For simplicity, show only one typing user

  return (
    <div className={styles.typingIndicator}>
      <span style={{ fontSize: '1.125rem' }}>💭</span>
      <span>@{typingUser.username} is typing</span>
      <div className={styles.typingDots}>
        <div className={styles.typingDot} />
        <div className={styles.typingDot} />
        <div className={styles.typingDot} />
      </div>
    </div>
  );
};

export default TypingIndicator;
