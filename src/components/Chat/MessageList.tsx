import React from 'react';
import { Message as MessageType } from '../../types/chat';
import Message from './Message';
import styles from './ChatRoom.module.css';

interface MessageListProps {
  messages: MessageType[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className={styles.messagesArea}>
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      
      {/* Loading Skeleton (placeholder for future loading states) */}
      {false && (
        <div className={styles.message}>
          <div className={styles.skeleton} />
        </div>
      )}
    </div>
  );
};

export default MessageList;
