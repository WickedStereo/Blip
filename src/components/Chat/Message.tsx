import React from 'react';
import { Message as MessageType } from '../../types/chat';
import styles from './ChatRoom.module.css';

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const { text, type, username, timestamp, timeProgress, isDisappearing } = message;

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getMessageClasses = () => {
    const baseClasses = [styles.message];
    
    if (type === 'user') {
      baseClasses.push(styles.messageUser);
    } else if (type === 'system') {
      baseClasses.push(styles.messageSystem);
    }
    
    // Add animation classes
    baseClasses.push(styles.messageEnter);
    if (type === 'user') {
      baseClasses.push(styles.messageUserEnter);
    } else if (type === 'other') {
      baseClasses.push(styles.messageOtherEnter);
    }
    
    if (isDisappearing) {
      baseClasses.push(styles.messageDisappear);
    }
    
    return baseClasses.join(' ');
  };

  const getBubbleClasses = () => {
    const baseClasses = [styles.messageBubble];
    
    if (type === 'user') {
      baseClasses.push(styles.messageBubbleUser);
    } else if (type === 'system') {
      baseClasses.push(styles.messageBubbleSystem);
    } else {
      baseClasses.push(styles.messageBubbleOther);
    }
    
    if (isDisappearing) {
      baseClasses.push(styles.messageDisappearing);
    }
    
    return baseClasses.join(' ');
  };

  const getTimeProgressColor = () => {
    if (timeProgress >= 95) return 'var(--time-old)';
    if (timeProgress >= 75) return 'var(--time-medium)';
    return 'var(--time-fresh)';
  };

  if (type === 'system') {
    return (
      <div className={getMessageClasses()}>
        <div className={getBubbleClasses()}>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, textAlign: 'center' }}>
            <span>{text}</span>
            <span> • </span>
            <span>{formatTimeAgo(timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  const timeAgo = formatTimeAgo(timestamp);
  const displayUsername = type === 'user' ? 'You' : `@${username}`;

  return (
    <div className={getMessageClasses()}>
      <div className={getBubbleClasses()}>
        <p className={styles.messageText}>{text}</p>
        <div className={styles.messageFooter}>
          {type === 'user' ? (
            <>
              <div className={styles.messageTime}>
                <div 
                  className={styles.timeProgress}
                  style={{ 
                    width: `${timeProgress}%`,
                    backgroundColor: getTimeProgressColor()
                  }}
                />
                <span>{timeAgo}</span>
              </div>
              <span className={styles.messageUsername}>{displayUsername}</span>
            </>
          ) : (
            <>
              <span 
                className={`${styles.messageUsername} ${isDisappearing ? styles.messageDisappearing : ''}`}
              >
                {displayUsername}
              </span>
              <div className={styles.messageTime}>
                <span>{isDisappearing ? '5m left' : timeAgo}</span>
                <div 
                  className={styles.timeProgress}
                  style={{ 
                    width: `${timeProgress}%`,
                    backgroundColor: getTimeProgressColor()
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
